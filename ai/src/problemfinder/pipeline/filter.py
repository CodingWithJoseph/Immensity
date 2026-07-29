"""Two-call qualification gate for real, software-addressable problems."""

from __future__ import annotations

import os
import time
from collections import Counter
from typing import Any

from classifier.prefilter import FilterCall
from util.constants import CLASSIFIER_CONFIG
from util.prompts import (
    QWEN_FILTER_PROBLEM_PAIN_PROMPT,
    QWEN_FILTER_SOFTWARE_ADDRESSABLE_PROMPT,
)

MODEL_NAME = CLASSIFIER_CONFIG["qwen_model_id"]


class FilterParseFailure(RuntimeError):
    """A model response could not be parsed and must not pass silently."""

    error_state = "parse_failure"

    def __init__(self, call_name: str, result: dict[str, Any]):
        super().__init__(result.get("error_message") or f"{call_name} output could not be parsed")


def _require_parseable(call_name: str, result: dict[str, Any]) -> None:
    if result.get("error_state") == "parse_failure":
        raise FilterParseFailure(call_name, result)


class ProblemFilterRunner:
    """Require both a real problem and material software addressability."""

    def __init__(self, llm: Any, filter_call_factory=FilterCall):
        self.problem_call = filter_call_factory(
            llm,
            system_prompt=QWEN_FILTER_PROBLEM_PAIN_PROMPT,
            valid_results=("yes", "no"),
        )
        self.software_call = filter_call_factory(
            llm,
            system_prompt=QWEN_FILTER_SOFTWARE_ADDRESSABLE_PROMPT,
            valid_results=("yes", "no"),
        )

    def run(self, title: str, body: str) -> dict[str, Any]:
        problem = self.problem_call.run(title, body)
        _require_parseable("problem", problem)
        if problem["result"] != "yes":
            return self._result(
                "reject",
                "not_a_real_problem",
                problem,
                None,
            )

        software = self.software_call.run(title, body)
        _require_parseable("software", software)
        rejection_reason = (
            "not_software_addressable" if software["result"] != "yes" else None
        )
        decision = "reject" if rejection_reason else "pass"
        return self._result(
            decision,
            rejection_reason,
            problem,
            software,
        )

    @staticmethod
    def _result(
        decision: str,
        rejection_reason: str | None,
        problem: dict[str, Any],
        software: dict[str, Any] | None,
    ) -> dict[str, Any]:
        raw_result = {
            "problem": problem,
            "software": software,
            "rejection_reason": rejection_reason,
            "flagged": bool(problem.get("flagged") or (software or {}).get("flagged")),
        }
        return {
            "decision": decision,
            "rejection_reason": rejection_reason,
            "raw_result": raw_result,
        }


def runtime_availability() -> dict[str, Any]:
    try:
        import torch

        cuda_available = bool(torch.cuda.is_available())
    except Exception:
        cuda_available = False
    return {
        "model_name": MODEL_NAME,
        "cuda_available": cuda_available,
        "hf_token_present": bool(os.getenv("HF_TOKEN")),
    }


def preview_report(jobs: list[dict[str, Any]]) -> dict[str, Any]:
    eligible = [job.get("eligible_at") for job in jobs if job.get("eligible_at")]
    as_text = lambda value: value.isoformat() if hasattr(value, "isoformat") else str(value)  # noqa: E731
    return {
        "dry_run": True,
        "jobs_would_be_processed": len(jobs),
        "oldest_eligible_at": as_text(min(eligible)) if eligible else None,
        "newest_eligible_at": as_text(max(eligible)) if eligible else None,
        "sample_job_ids": [str(job["job_id"]) for job in jobs[:10]],
        "runtime": runtime_availability(),
        "model_calls_made": 0,
    }


def run_worker(
    repository: Any,
    *,
    limit: int,
    batch_size: int,
    max_minutes: int,
    dry_run: bool,
    model_loader=None,
    model_unloader=None,
    runner_factory=ProblemFilterRunner,
) -> dict[str, Any]:
    if dry_run:
        return preview_report(repository.preview(limit))

    if model_loader is None or model_unloader is None:
        from ..shared.qwen_runtime import load_qwen, unload_qwen

        model_loader = model_loader or load_qwen
        model_unloader = model_unloader or unload_qwen

    started = time.monotonic()
    totals = Counter(processed=0, passed=0, rejected=0, failed=0)
    llm = model_loader(MODEL_NAME)
    try:
        runner = runner_factory(llm)
        while totals["processed"] < limit and (time.monotonic() - started) < max_minutes * 60:
            jobs = repository.claim(min(batch_size, limit - totals["processed"]))
            if not jobs:
                break
            for job in jobs:
                try:
                    result = runner.run(job.get("title") or "", job.get("body") or "")
                    repository.persist_result(job, result)
                    totals["passed" if result["decision"] == "pass" else "rejected"] += 1
                except Exception as error:
                    repository.persist_failure(
                        job,
                        f"{type(error).__name__}: {error}",
                    )
                    totals["failed"] += 1
                totals["processed"] += 1
    finally:
        model_unloader(llm)
    totals["dry_run"] = False
    return dict(totals)

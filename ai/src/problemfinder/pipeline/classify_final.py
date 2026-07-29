"""Problem-statement extraction worker for software-qualified posts."""

from __future__ import annotations

import time
from collections import Counter
from typing import Any

from classifier.specialist.final_classifier import FinalClassifier
from .filter import FilterParseFailure, MODEL_NAME, runtime_availability


class ClassifyFinalRunner:
    """Run the structured final classifier for one post."""

    def __init__(self, llm: Any, classifier_factory=FinalClassifier):
        self.classifier = classifier_factory(llm)

    def run(self, title: str, body: str) -> dict[str, Any]:
        result = self.classifier.run(title, body)
        if result.get("error_state") == "parse_failure":
            raise FilterParseFailure("final", result)

        structured = result["structured"]
        decision = structured["decision"]
        return {
            "decision": decision,
            "problem_statement": structured.get("problem_statement"),
            "rejection_reason": structured.get("rejection_reason"),
            "structured": structured,
        }


def preview_report(jobs: list[dict[str, Any]]) -> dict[str, Any]:
    eligible = [
        job.get("eligible_for_classification_at")
        for job in jobs
        if job.get("eligible_for_classification_at")
    ]
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
    runner_factory=ClassifyFinalRunner,
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

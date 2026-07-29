"""Embeddings worker adapted to local PostgreSQL jobs.

Consumes complete ``embed_pending`` cards, writes their vectors, and advances
them to ``assign_pending``.

Architecture note — a classification pass means "problem statement extracted,"
not "ready for the frontend." The app is cluster-based, so the
autonomous publish path is:

    classified cards -> embeddings -> cluster assignment -> cluster enrichment
    -> Supabase

This worker never syncs to Supabase.

Unlike the filter/classify workers there is no pass/reject decision: a post is
either embedded (and moved to ``assign_pending``) or it fails. An
empty post (no usable text), a malformed model response, or a vector whose
dimension does not match the configured model are terminal — retrying cannot fix
them.
"""

from __future__ import annotations

import os
import time
from collections import Counter
from typing import Any

from util.constants import EMBEDDING_CONFIG


MODEL_NAME = EMBEDDING_CONFIG["model_id"]
EXPECTED_DIMENSIONS = int(EMBEDDING_CONFIG["dimensions"])

# Deterministic embedding text: title, normalized problem, then source body when
# present.
_EMBEDDING_TEXT_FIELDS = (
    ("Title", "title"),
    ("Problem", "problem_statement"),
    ("Body", "body"),
)


class EmbeddingInputError(RuntimeError):
    """Raised when a post has no usable text to embed (terminal, not retryable)."""

    error_state = "input_error"


class EmbeddingResponseError(RuntimeError):
    """Raised for a malformed/empty vector or a dimension mismatch (terminal)."""

    def __init__(self, message: str, error_state: str):
        super().__init__(message)
        self.error_state = error_state


def _text(value: Any) -> str:
    return value.strip() if isinstance(value, str) else ""


def build_embedding_text(row: dict[str, Any]) -> str:
    """Build the deterministic embedding input text for one qualified post."""
    parts: list[str] = []
    for label, field in _EMBEDDING_TEXT_FIELDS:
        value = _text(row.get(field))
        if value:
            parts.append(f"{label}: {value}")
    return "\n".join(parts)


class EmbeddingRunner:
    """Generate one embedding vector per qualified post using the client."""

    def __init__(self, client: Any, expected_dimensions: int | None = None):
        self.client = client
        self.expected_dimensions = expected_dimensions

    def run(self, row: dict[str, Any]) -> dict[str, Any]:
        text = build_embedding_text(row)
        if not text:
            raise EmbeddingInputError("post has no usable text to embed")
        vector = self.client.embed(text)
        if not vector or not isinstance(vector, (list, tuple)):
            raise EmbeddingResponseError("model returned an empty/invalid vector", "malformed_response")
        vector = list(vector)
        if self.expected_dimensions and len(vector) != self.expected_dimensions:
            raise EmbeddingResponseError(
                f"expected {self.expected_dimensions} dimensions, got {len(vector)}",
                "dimension_mismatch",
            )
        return {"embedding": vector}


def _build_default_runner(client: Any) -> EmbeddingRunner:
    return EmbeddingRunner(client, expected_dimensions=EXPECTED_DIMENSIONS)


def runtime_availability() -> dict[str, Any]:
    return {
        "model_name": MODEL_NAME,
        "openai_api_key_present": bool(os.getenv("OPENAI_API_KEY")),
    }


def preview_report(jobs: list[dict[str, Any]]) -> dict[str, Any]:
    eligible = [job.get("eligible_for_embedding_at") for job in jobs if job.get("eligible_for_embedding_at")]
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
    runner_factory=_build_default_runner,
) -> dict[str, Any]:
    if dry_run:
        return preview_report(repository.preview(limit))

    if model_loader is None or model_unloader is None:
        from ..shared.embedding_runtime import load_embedder, unload_embedder

        model_loader = model_loader or load_embedder
        model_unloader = model_unloader or unload_embedder

    started = time.monotonic()
    totals = Counter(processed=0, embedded=0, failed=0)
    client = model_loader(MODEL_NAME)
    try:
        runner = runner_factory(client)
        while totals["processed"] < limit and (time.monotonic() - started) < max_minutes * 60:
            jobs = repository.claim(min(batch_size, limit - totals["processed"]))
            if not jobs:
                break
            for job in jobs:
                try:
                    result = runner.run(job)
                    repository.persist_result(job, result)
                    totals["embedded"] += 1
                except Exception as error:
                    repository.persist_failure(job, f"{type(error).__name__}: {error}")
                    totals["failed"] += 1
                totals["processed"] += 1
    finally:
        model_unloader(client)
    totals["dry_run"] = False
    return dict(totals)

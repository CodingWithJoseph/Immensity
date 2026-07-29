"""Assign complete embedded cards to the nearest local cluster centroid.

Cards below the similarity threshold remain ``new_cluster_candidate`` so the
scheduled grouping stage can form new clusters from them.
"""

from __future__ import annotations

import time
from collections import Counter
from typing import Any

DEFAULT_THRESHOLD = 0.85
CANDIDATE_LIMIT = 1

ASSIGNED_EXISTING = "assigned_existing_cluster"
NEW_CANDIDATE = "new_cluster_candidate"


def classify_assignment(candidates: list[dict[str, Any]], threshold: float) -> dict[str, Any]:
    """Decide an assignment from the nearest-cluster candidates (pure function)."""
    if not candidates:
        return {
            "assignment_status": NEW_CANDIDATE,
            "assigned_cluster_id": None,
            "similarity": None,
        }
    best = candidates[0]
    if best["similarity"] >= threshold:
        return {
            "assignment_status": ASSIGNED_EXISTING,
            "assigned_cluster_id": best["cluster_id"],
            "similarity": best["similarity"],
        }
    return {
        "assignment_status": NEW_CANDIDATE,
        "assigned_cluster_id": None,
        "similarity": best["similarity"],
    }


def runtime_availability(repository: Any) -> dict[str, Any]:
    return {"clusters_with_centroid": repository.centroid_count()}


def preview_report(repository: Any, jobs: list[dict[str, Any]], threshold: float) -> dict[str, Any]:
    """Project assignments for the eligible rows WITHOUT mutating anything."""
    totals = Counter(assigned_existing_cluster=0, new_cluster_candidate=0)
    sample: list[dict[str, Any]] = []
    for job in jobs:
        decision = classify_assignment(
            repository.find_candidates(job["embedding_text"], CANDIDATE_LIMIT), threshold
        )
        totals[decision["assignment_status"]] += 1
        if len(sample) < 10:
            sample.append({
                "raw_post_id": str(job["raw_post_id"]),
                "assignment_status": decision["assignment_status"],
                "assigned_cluster_id": decision["assigned_cluster_id"],
                "similarity": decision["similarity"],
            })
    return {
        "dry_run": True,
        "threshold": threshold,
        "jobs_would_be_processed": len(jobs),
        "assigned_existing_cluster": totals["assigned_existing_cluster"],
        "new_cluster_candidate": totals["new_cluster_candidate"],
        "sample": sample,
        "runtime": runtime_availability(repository),
    }


def run_worker(
    repository: Any,
    *,
    limit: int,
    batch_size: int,
    max_minutes: int,
    threshold: float,
    dry_run: bool,
) -> dict[str, Any]:
    if dry_run:
        return preview_report(repository, repository.preview(limit), threshold)

    started = time.monotonic()
    totals = Counter(
        processed=0, assigned_existing_cluster=0, new_cluster_candidate=0,
        failed=0,
    )
    while totals["processed"] < limit and (time.monotonic() - started) < max_minutes * 60:
        jobs = repository.claim(min(batch_size, limit - totals["processed"]))
        if not jobs:
            break
        for job in jobs:
            try:
                candidates = repository.find_candidates(job["embedding_text"], CANDIDATE_LIMIT)
                result = classify_assignment(candidates, threshold)
                repository.persist_result(job, result)
                totals[result["assignment_status"]] += 1
            except Exception as error:  # noqa: BLE001
                repository.persist_failure(job, f"{type(error).__name__}: {error}")
                totals["failed"] += 1
            totals["processed"] += 1

    cluster_count = repository.assigned_cluster_count()
    totals["dry_run"] = False
    totals["threshold"] = threshold
    totals["clusters_with_items"] = cluster_count
    return dict(totals)

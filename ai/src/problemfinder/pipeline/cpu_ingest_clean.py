"""Shared source-post cleaner adapter for the local CPU clean worker."""

from __future__ import annotations

import json
import time
from collections import Counter
from typing import Any, Iterable

from classifier.prefilter import ReadabilityFilter

from .source_cleaning import SourcePostCleaner


class CpuStageError(RuntimeError):
    def __init__(self, stage: str, error: Exception):
        self.stage = stage
        self.error = error
        super().__init__(f"{type(error).__name__}: {error}")


def _payload(value: object) -> dict[str, Any]:
    if isinstance(value, dict):
        return value
    if isinstance(value, str):
        try:
            parsed = json.loads(value)
            return parsed if isinstance(parsed, dict) else {}
        except json.JSONDecodeError:
            return {}
    return {}


def _boolean(value: object) -> bool:
    if isinstance(value, str):
        return value.strip().lower() in {"1", "true", "yes", "y", "on"}
    return bool(value)


def rows_to_records(rows: Iterable[dict[str, Any]]) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    for row in rows:
        payload = _payload(row.get("payload"))
        records.append(
            {
                "_raw_post_id": row["id"],
                "source": row.get("source"),
                "id": row["source_post_id"],
                "title": row.get("title") or "",
                "body": row.get("body") or "",
                "author": row.get("author"),
                "stickied": _boolean(payload.get("stickied", False)),
                "over_18": _boolean(payload.get("over_18", False)),
            }
        )
    return records


def _ids(records: Iterable[dict[str, Any]]) -> set[Any]:
    return {record["_raw_post_id"] for record in records}


def _rejected(
    raw_post_id: Any,
    stage: str,
    reason: str,
) -> dict[str, Any]:
    return {
        "raw_post_id": raw_post_id,
        "stage": "rejected",
        "rejection_stage": stage,
        "rejection_reason": reason,
    }


def process_rows(
    rows: Iterable[dict[str, Any]],
    *,
    cleaner: SourcePostCleaner | None = None,
    readability: ReadabilityFilter | None = None,
) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    materialized = list(rows)
    cleaner = cleaner or SourcePostCleaner()
    readability = readability or ReadabilityFilter()
    outcomes: list[dict[str, Any]] = []
    reasons: Counter[str] = Counter()
    records = rows_to_records(materialized)
    initial_ids = _ids(records)

    try:
        basic = cleaner.clean_basic(records)
    except Exception as error:
        raise CpuStageError("basic_clean", error) from error
    basic_ids = _ids(basic)
    for raw_id in initial_ids - basic_ids:
        reason = "basic_clean_rejected"
        outcomes.append(_rejected(raw_id, "basic_clean", reason))
        reasons[reason] += 1

    try:
        expensive = cleaner.clean_expensive(basic)
    except Exception as error:
        raise CpuStageError("expensive_clean", error) from error
    expensive_ids = _ids(expensive)
    for raw_id in basic_ids - expensive_ids:
        reason = "expensive_clean_rejected"
        outcomes.append(
            _rejected(raw_id, "expensive_clean", reason)
        )
        reasons[reason] += 1

    readable_ids: set[Any] = set()
    for row in expensive:
        try:
            result = readability.check(row.get("title"), row.get("body"))
        except Exception as error:
            raise CpuStageError("deterministic_filter", error) from error
        raw_id = row["_raw_post_id"]
        if result["pass"]:
            readable_ids.add(raw_id)
            outcomes.append(
                {
                    "raw_post_id": raw_id,
                    "stage": "filter_pending",
                }
            )
        else:
            reason = result.get("reason") or "deterministic_filter_rejected"
            outcomes.append(
                _rejected(raw_id, "deterministic_filter", reason)
            )
            reasons[reason] += 1

    report = {
        "rows_claimed": len(materialized),
        "basic_pass": len(basic_ids),
        "basic_reject": len(initial_ids - basic_ids),
        "expensive_pass": len(expensive_ids),
        "expensive_reject": len(basic_ids - expensive_ids),
        "deterministic_pass": len(readable_ids),
        "deterministic_reject": len(expensive_ids - readable_ids),
        "filter_pending": len(readable_ids),
        "rejection_reasons": dict(sorted(reasons.items())),
    }
    return outcomes, report


def run_worker(
    repository: Any,
    *,
    limit: int,
    batch_size: int,
    max_minutes: int,
    dry_run: bool,
    worker_name: str = "cpu-ingest-clean",
    cleaner_factory=None,
    readability_factory=None,
) -> dict[str, Any]:
    cleaner_factory = cleaner_factory or SourcePostCleaner
    readability_factory = readability_factory or ReadabilityFilter
    started = time.monotonic()
    totals: Counter[str] = Counter(
        {
            "rows_claimed": 0,
            "basic_pass": 0,
            "basic_reject": 0,
            "expensive_pass": 0,
            "expensive_reject": 0,
            "deterministic_pass": 0,
            "deterministic_reject": 0,
            "filter_pending": 0,
        }
    )
    all_reasons: Counter[str] = Counter()
    processed = 0
    preview_rows = repository.preview(limit) if dry_run else None
    while processed < limit and (time.monotonic() - started) < max_minutes * 60:
        size = min(batch_size, limit - processed)
        rows = (
            preview_rows[processed : processed + size]
            if preview_rows is not None
            else repository.claim(worker_name, size)
        )
        if not rows:
            break
        raw_ids = [row["id"] for row in rows]
        try:
            outcomes, report = process_rows(
                rows,
                cleaner=cleaner_factory(),
                readability=readability_factory(),
            )
            if not dry_run:
                repository.persist(outcomes)
        except CpuStageError:
            if not dry_run:
                repository.persist_failure(raw_ids)
            raise
        except Exception:
            if not dry_run:
                repository.persist_failure(raw_ids)
            raise
        for key, value in report.items():
            if key == "rejection_reasons":
                all_reasons.update(value)
            else:
                totals[key] += value
        processed += len(rows)
    totals["rejection_reasons"] = dict(sorted(all_reasons.items()))
    totals["dry_run"] = dry_run
    if dry_run:
        totals["rows_would_be_claimed"] = totals["rows_claimed"]
    return dict(totals)

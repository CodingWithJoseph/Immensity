"""Local PostgreSQL repository for the CPU ingest/clean worker.

Claims freshly-ingested ``status='scraped'`` rows from ``cluster_items``, flips
them to ``'clean_running'``, and maps the worker's stage outcomes onto a single
status: a readable, cleaned post becomes ``'filter_pending'``; a post that did
not pass cleaning (a quality decision) becomes ``'clean_rejected'``. A true
error (worker exception, via ``persist_failure``) becomes ``'clean_failed'`` —
rejected means it did not qualify, failed means something broke. The worker's
multi-field outcome dict is consumed unchanged — only its ``stage`` field is
translated here.
"""

from __future__ import annotations

from typing import Any, Iterable

ELIGIBLE = "scraped"
RUNNING = "clean_running"
REJECTED_STATUS = "clean_rejected"
FAILED_STATUS = "clean_failed"

# Worker outcome["stage"] -> cluster_items.status. A non-advancing outcome is a
# quality rejection, not an error.
_STAGE_TO_STATUS = {
    "filter_pending": "filter_pending",
    "rejected": REJECTED_STATUS,
}

SELECT_COLUMNS = """
       id, platform AS source, source_item_id AS source_post_id,
       posted_at AS source_created_at, title, body, author,
       url, community AS source_community_id, score, num_comments, raw_json AS payload
"""

PREVIEW_SQL = f"""
SELECT {SELECT_COLUMNS}
FROM cluster_items
WHERE status = %s
ORDER BY updated_at ASC, id ASC
LIMIT %s
"""

CLAIM_SQL = """
UPDATE cluster_items ci
SET status = %s, updated_at = now()
WHERE ci.id IN (
  SELECT id FROM cluster_items
  WHERE status = %s
  ORDER BY updated_at ASC, id ASC
  FOR UPDATE SKIP LOCKED
  LIMIT %s
)
RETURNING ci.id, ci.platform AS source, ci.source_item_id AS source_post_id,
          ci.posted_at AS source_created_at, ci.title, ci.body,
          ci.author, ci.url, ci.community AS source_community_id, ci.score, ci.num_comments,
          ci.raw_json AS payload
"""


def _dict_rows(cursor: Any) -> list[dict[str, Any]]:
    columns = [column.name if hasattr(column, "name") else column[0] for column in cursor.description]
    return [dict(zip(columns, row)) for row in cursor.fetchall()]


class CpuCleanRepository:
    def __init__(self, connection: Any):
        self.connection = connection

    def preview(self, limit: int) -> list[dict[str, Any]]:
        with self.connection.cursor() as cursor:
            cursor.execute(PREVIEW_SQL, (ELIGIBLE, limit))
            return _dict_rows(cursor)

    def claim(self, worker_name: str, batch_size: int) -> list[dict[str, Any]]:
        with self.connection.cursor() as cursor:
            cursor.execute(CLAIM_SQL, (RUNNING, ELIGIBLE, batch_size))
            rows = _dict_rows(cursor)
        self.connection.commit()
        return rows

    def persist(self, outcomes: Iterable[dict[str, Any]]) -> None:
        with self.connection.cursor() as cursor:
            for outcome in outcomes:
                status = _STAGE_TO_STATUS.get(outcome["stage"], REJECTED_STATUS)
                cursor.execute(
                    "UPDATE cluster_items SET status = %s, rejection_reason = %s, "
                    "updated_at = now() WHERE id = %s",
                    (status, outcome.get("rejection_reason"), outcome["raw_post_id"]),
                )
        self.connection.commit()

    def persist_failure(self, raw_post_ids: Iterable[Any]) -> None:
        ids = list(raw_post_ids)
        if not ids:
            return
        with self.connection.cursor() as cursor:
            cursor.execute(
                "UPDATE cluster_items SET status = %s, updated_at = now() WHERE id = ANY(%s)",
                (FAILED_STATUS, ids),
            )
        self.connection.commit()

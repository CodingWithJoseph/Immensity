"""PostgreSQL conveyor repository for the software-problem filter."""

from __future__ import annotations

from typing import Any

from ._raw_json import RAW_JSON_MERGE, error_patch, result_patch

STEP = "filter"
PENDING = "filter_pending"
RUNNING = "filter_running"
PASS_STATUS = "classify_pending"
REJECT_STATUS = "filter_rejected"
FAILED_STATUS = "filter_failed"

PREVIEW_SQL = """
SELECT id AS job_id, id AS raw_post_id, updated_at AS eligible_at, title, body
FROM cluster_items
WHERE status = %s
ORDER BY updated_at, id
LIMIT %s
"""

CLAIM_SQL = """
UPDATE cluster_items ci
SET status = %s, updated_at = now()
WHERE ci.id IN (
  SELECT id
  FROM cluster_items
  WHERE status = %s
  ORDER BY updated_at, id
  FOR UPDATE SKIP LOCKED
  LIMIT %s
)
RETURNING ci.id AS job_id, ci.id AS raw_post_id,
          ci.updated_at AS eligible_at, ci.title, ci.body
"""


def _dict_rows(cursor: Any) -> list[dict[str, Any]]:
    columns = [column.name if hasattr(column, "name") else column[0] for column in cursor.description]
    return [dict(zip(columns, row)) for row in cursor.fetchall()]


class FilterRepository:
    def __init__(self, connection: Any):
        self.connection = connection

    def preview(self, limit: int) -> list[dict[str, Any]]:
        with self.connection.cursor() as cursor:
            cursor.execute(PREVIEW_SQL, (PENDING, limit))
            return _dict_rows(cursor)

    def claim(self, batch_size: int) -> list[dict[str, Any]]:
        with self.connection.cursor() as cursor:
            cursor.execute(CLAIM_SQL, (RUNNING, PENDING, batch_size))
            rows = _dict_rows(cursor)
        self.connection.commit()
        return rows

    def persist_result(self, job: dict[str, Any], result: dict[str, Any]) -> None:
        status = PASS_STATUS if result["decision"] == "pass" else REJECT_STATUS
        patch = result_patch(STEP, result["decision"])
        with self.connection.cursor() as cursor:
            cursor.execute(
                f"UPDATE cluster_items SET status = %s, rejection_reason = %s, {RAW_JSON_MERGE}, "
                "updated_at = now() WHERE id = %s",
                (status, result.get("rejection_reason"), patch, job["raw_post_id"]),
            )
        self.connection.commit()

    def persist_failure(
        self,
        job: dict[str, Any],
        message: str,
    ) -> None:
        self.connection.rollback()
        patch = error_patch(STEP, message)
        with self.connection.cursor() as cursor:
            cursor.execute(
                f"UPDATE cluster_items SET status = %s, {RAW_JSON_MERGE}, "
                "updated_at = now() WHERE id = %s",
                (FAILED_STATUS, patch, job["raw_post_id"]),
            )
        self.connection.commit()

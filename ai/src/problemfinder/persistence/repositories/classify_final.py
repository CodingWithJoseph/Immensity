"""PostgreSQL conveyor repository for final classification.

A pass stores the normalized problem statement before advancing to
``embed_pending``. A quality rejection ends at ``classify_rejected`` and an
execution error at ``classify_failed``.
"""

from __future__ import annotations

from typing import Any

from ._raw_json import RAW_JSON_MERGE, error_patch, result_patch

STEP = "classify"
PENDING = "classify_pending"
RUNNING = "classify_running"
PASS_STATUS = "embed_pending"
# A reject did not qualify (quality decision); a failure is a true error
# (worker/model exception). They are distinct terminal states.
REJECT_STATUS = "classify_rejected"
FAILED_STATUS = "classify_failed"

PREVIEW_SQL = """
SELECT id AS job_id, id AS raw_post_id,
       updated_at AS eligible_for_classification_at, posted_at AS source_created_at,
       title, body
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
RETURNING ci.id AS job_id, ci.id AS raw_post_id,
          ci.updated_at AS eligible_for_classification_at, ci.posted_at AS source_created_at,
          ci.title, ci.body
"""


def _dict_rows(cursor: Any) -> list[dict[str, Any]]:
    columns = [column.name if hasattr(column, "name") else column[0] for column in cursor.description]
    return [dict(zip(columns, row)) for row in cursor.fetchall()]


class ClassifyFinalRepository:
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
        patch = result_patch(STEP, result.get("decision"))
        with self.connection.cursor() as cursor:
            if result["decision"] == "pass":
                problem_statement = result["problem_statement"]
                cursor.execute(
                    f"""
                    UPDATE cluster_items
                    SET problem_statement = %s,
                        rejection_reason = NULL,
                        embedding = NULL,
                        cluster_id = NULL,
                        similarity_score = NULL,
                        {RAW_JSON_MERGE},
                        status = %s,
                        updated_at = now()
                    WHERE id = %s
                    """,
                    (
                        problem_statement,
                        patch,
                        PASS_STATUS,
                        job["raw_post_id"],
                    ),
                )
            else:
                cursor.execute(
                    f"""
                    UPDATE cluster_items
                    SET problem_statement = NULL,
                        rejection_reason = %s,
                        embedding = NULL,
                        cluster_id = NULL,
                        similarity_score = NULL,
                        status = %s,
                        {RAW_JSON_MERGE},
                        updated_at = now()
                    WHERE id = %s
                    """,
                    (
                        result.get("rejection_reason"),
                        REJECT_STATUS,
                        patch,
                        job["raw_post_id"],
                    ),
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

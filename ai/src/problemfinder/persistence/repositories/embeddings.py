"""PostgreSQL conveyor repository for title/problem/body embeddings."""

from __future__ import annotations

import json
from typing import Any

from ._raw_json import RAW_JSON_MERGE, error_patch, result_patch

STEP = "embed"
PENDING = "embed_pending"
RUNNING = "embed_running"
DONE_STATUS = "assign_pending"
FAILED_STATUS = "embed_failed"

PREVIEW_SQL = """
SELECT id AS job_id, id AS raw_post_id,
       updated_at AS eligible_for_embedding_at, posted_at AS source_created_at,
       title, body, content_hash, problem_statement
FROM cluster_items
WHERE status = %s AND embedding IS NULL
ORDER BY updated_at ASC, id ASC
LIMIT %s
"""

CLAIM_SQL = """
UPDATE cluster_items ci
SET status = %s, updated_at = now()
WHERE ci.id IN (
  SELECT id FROM cluster_items
  WHERE status = %s AND embedding IS NULL
  ORDER BY updated_at ASC, id ASC
  FOR UPDATE SKIP LOCKED
  LIMIT %s
)
RETURNING ci.id AS job_id, ci.id AS raw_post_id,
          ci.updated_at AS eligible_for_embedding_at, ci.posted_at AS source_created_at,
          ci.title, ci.body, ci.content_hash, ci.problem_statement
"""


def _dict_rows(cursor: Any) -> list[dict[str, Any]]:
    columns = [column.name if hasattr(column, "name") else column[0] for column in cursor.description]
    return [dict(zip(columns, row)) for row in cursor.fetchall()]


class EmbeddingRepository:
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
        embedding = json.dumps(result["embedding"])
        patch = result_patch(STEP, "pass")
        with self.connection.cursor() as cursor:
            cursor.execute(
                f"""
                UPDATE cluster_items
                SET embedding = %s::vector,
                    {RAW_JSON_MERGE},
                    status = %s,
                    updated_at = now()
                WHERE id = %s
                """,
                (embedding, patch, DONE_STATUS, job["raw_post_id"]),
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

"""PostgreSQL repository for nearest-centroid cluster assignment.

An assigned row stores only ``cluster_id`` and ``similarity_score``. A row that
does not meet the threshold becomes ``new_cluster_candidate``.
"""

from __future__ import annotations

from typing import Any

from ._raw_json import RAW_JSON_MERGE, error_patch, result_patch

STEP = "assign"
PENDING = "assign_pending"
RUNNING = "assign_running"
ASSIGNED_STATUS = "assigned"
NEW_CANDIDATE_STATUS = "new_cluster_candidate"
FAILED_STATUS = "assign_failed"

PREVIEW_SQL = """
SELECT id AS job_id, id AS raw_post_id,
       updated_at AS eligible_for_clustering_at, posted_at AS source_created_at,
       embedding::text AS embedding_text
FROM cluster_items
WHERE status = %s AND embedding IS NOT NULL
ORDER BY updated_at ASC, id ASC
LIMIT %s
"""

CLAIM_SQL = """
UPDATE cluster_items ci
SET status = %s, updated_at = now()
WHERE ci.id IN (
  SELECT id FROM cluster_items
  WHERE status = %s AND embedding IS NOT NULL
  ORDER BY updated_at ASC, id ASC
  FOR UPDATE SKIP LOCKED
  LIMIT %s
)
RETURNING ci.id AS job_id, ci.id AS raw_post_id,
          ci.updated_at AS eligible_for_clustering_at, ci.posted_at AS source_created_at,
          ci.embedding::text AS embedding_text
"""

# Nearest canonical clusters by pgvector cosine distance. similarity = 1 - distance.
CANDIDATES_SQL = """
SELECT id AS cluster_id,
       (centroid <=> %(embedding)s::vector) AS distance
FROM clusters
WHERE centroid IS NOT NULL
ORDER BY centroid <=> %(embedding)s::vector
LIMIT %(limit)s
"""


def _dict_rows(cursor: Any) -> list[dict[str, Any]]:
    columns = [column.name if hasattr(column, "name") else column[0] for column in cursor.description]
    return [dict(zip(columns, row)) for row in cursor.fetchall()]


class ClusterAssignmentRepository:
    def __init__(self, connection: Any):
        self.connection = connection

    def preview(self, limit: int) -> list[dict[str, Any]]:
        with self.connection.cursor() as cursor:
            cursor.execute(PREVIEW_SQL, (PENDING, limit))
            return _dict_rows(cursor)

    def centroid_count(self) -> int:
        with self.connection.cursor() as cursor:
            cursor.execute("SELECT count(*) FROM clusters WHERE centroid IS NOT NULL")
            return int(cursor.fetchone()[0])

    def claim(self, batch_size: int) -> list[dict[str, Any]]:
        with self.connection.cursor() as cursor:
            cursor.execute(CLAIM_SQL, (RUNNING, PENDING, batch_size))
            rows = _dict_rows(cursor)
        self.connection.commit()
        return rows

    def find_candidates(self, embedding_text: str, limit: int) -> list[dict[str, Any]]:
        """Top-`limit` nearest canonical clusters with similarity = 1 - distance."""
        with self.connection.cursor() as cursor:
            cursor.execute(CANDIDATES_SQL, {"embedding": embedding_text, "limit": limit})
            rows = _dict_rows(cursor)
        return [
            {
                "cluster_id": row["cluster_id"],
                "similarity": round(1.0 - float(row["distance"]), 6),
            }
            for row in rows
        ]

    def persist_result(self, job: dict[str, Any], result: dict[str, Any]) -> None:
        assigned = result["assignment_status"] == "assigned_existing_cluster"
        status = ASSIGNED_STATUS if assigned else NEW_CANDIDATE_STATUS
        patch = result_patch(STEP, result["assignment_status"])
        with self.connection.cursor() as cursor:
            cursor.execute(
                f"""
                UPDATE cluster_items
                SET cluster_id = %s,
                    similarity_score = %s,
                    {RAW_JSON_MERGE},
                    status = %s,
                    updated_at = now()
                WHERE id = %s
                """,
                (
                    result["assigned_cluster_id"],  # NULL for new_cluster_candidate
                    result["similarity"],
                    patch,
                    status,
                    job["raw_post_id"],
                ),
            )
        self.connection.commit()

    def assigned_cluster_count(self) -> int:
        """Distinct clusters that currently hold at least one item."""
        with self.connection.cursor() as cursor:
            cursor.execute(
                "SELECT count(DISTINCT cluster_id) FROM cluster_items WHERE cluster_id IS NOT NULL"
            )
            return int(cursor.fetchone()[0])

    def persist_failure(self, job: dict[str, Any], message: str) -> None:
        self.connection.rollback()
        patch = error_patch(STEP, message)
        with self.connection.cursor() as cursor:
            cursor.execute(
                f"UPDATE cluster_items SET status = %s, {RAW_JSON_MERGE}, "
                "updated_at = now() WHERE id = %s",
                (FAILED_STATUS, patch, job["raw_post_id"]),
            )
        self.connection.commit()

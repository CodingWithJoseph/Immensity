"""Database access for cluster title and summary generation."""

from __future__ import annotations

from typing import Any

SELECT_CONTEXTS_SQL = """
SELECT id AS cluster_id
FROM clusters
WHERE name IS NULL OR summary IS NULL OR status = 'proposed'
ORDER BY id
LIMIT %(limit)s
"""

SELECT_EVIDENCE_SQL = """
SELECT cluster_id, id AS post_id, problem_statement,
       title, score, num_comments, posted_at
FROM cluster_items
WHERE cluster_id = ANY(%(cluster_ids)s)
  AND NULLIF(trim(problem_statement), '') IS NOT NULL
ORDER BY cluster_id, score DESC NULLS LAST, num_comments DESC NULLS LAST, id
"""

UPDATE_CLUSTER_SQL = """
UPDATE clusters
SET name = %(problem_name)s,
    summary = %(problem_summary)s,
    status = 'named'
WHERE id = %(cluster_id)s
"""


def _dict_rows(cursor: Any) -> list[dict[str, Any]]:
    columns = [column.name if hasattr(column, "name") else column[0] for column in cursor.description]
    return [dict(zip(columns, row)) for row in cursor.fetchall()]


class ClusterNamingSummaryRepository:
    def __init__(self, connection: Any):
        self.connection = connection

    def fetch_cluster_contexts(self, limit: int) -> list[dict[str, Any]]:
        with self.connection.cursor() as cursor:
            cursor.execute(SELECT_CONTEXTS_SQL, {"limit": limit})
            return _dict_rows(cursor)

    def fetch_evidence_rows(self, cluster_ids: list[Any]) -> list[dict[str, Any]]:
        if not cluster_ids:
            return []
        with self.connection.cursor() as cursor:
            cursor.execute(SELECT_EVIDENCE_SQL, {"cluster_ids": cluster_ids})
            return _dict_rows(cursor)

    def update_clusters(self, rows: list[dict[str, Any]]) -> int:
        if not rows:
            return 0
        with self.connection.cursor() as cursor:
            cursor.executemany(UPDATE_CLUSTER_SQL, rows)
        self.connection.commit()
        return len(rows)

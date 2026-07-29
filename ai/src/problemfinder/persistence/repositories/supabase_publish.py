"""Read complete named problem clusters from PostgreSQL for publication."""

from __future__ import annotations

from typing import Any

MIN_READY_ITEMS = 3

SELECT_CLUSTER_ITEMS_SQL = """
SELECT id::text AS id, cluster_id, platform, community, source_item_id, title,
       body, url, author, score, num_comments, posted_at,
       raw_json, problem_statement, embedding::text AS embedding,
       similarity_score
FROM cluster_items
WHERE cluster_id IS NOT NULL
  AND embedding IS NOT NULL
  AND NULLIF(trim(platform), '') IS NOT NULL
  AND NULLIF(trim(source_item_id), '') IS NOT NULL
  AND NULLIF(trim(title), '') IS NOT NULL
  AND NULLIF(trim(problem_statement), '') IS NOT NULL
ORDER BY cluster_id, id
{limit_clause}
"""

SELECT_CLUSTERS_SQL = """
SELECT id AS cluster_id, name, summary
FROM clusters
WHERE NULLIF(trim(name), '') IS NOT NULL
  AND NULLIF(trim(summary), '') IS NOT NULL
ORDER BY id
{limit_clause}
"""

PUBLISHABLE_CLUSTER_IDS_SQL = """
SELECT c.id
FROM clusters c
WHERE NULLIF(trim(c.name), '') IS NOT NULL
  AND NULLIF(trim(c.summary), '') IS NOT NULL
  AND (
      SELECT count(*)
      FROM cluster_items ci
      WHERE ci.cluster_id = c.id
        AND ci.embedding IS NOT NULL
        AND NULLIF(trim(ci.platform), '') IS NOT NULL
        AND NULLIF(trim(ci.source_item_id), '') IS NOT NULL
        AND NULLIF(trim(ci.title), '') IS NOT NULL
        AND NULLIF(trim(ci.problem_statement), '') IS NOT NULL
  ) >= %(min_items)s
"""

SELECT_UNPUBLISHABLE_ITEM_IDS_SQL = """
SELECT id::text
FROM cluster_items
WHERE embedding IS NULL
   OR NULLIF(trim(platform), '') IS NULL
   OR NULLIF(trim(source_item_id), '') IS NULL
   OR NULLIF(trim(title), '') IS NULL
   OR NULLIF(trim(problem_statement), '') IS NULL
   OR cluster_id IS NULL
"""


def _dict_rows(cursor: Any) -> list[dict[str, Any]]:
    columns = [column.name if hasattr(column, "name") else column[0] for column in cursor.description]
    return [dict(zip(columns, row)) for row in cursor.fetchall()]


def _limit_clause(limit: int | None, params: dict[str, Any]) -> str:
    if limit is None:
        return ""
    params["limit"] = limit
    return "LIMIT %(limit)s"


class SupabasePublishRepository:
    def __init__(self, connection: Any):
        self.connection = connection

    def publishable_cluster_ids(self) -> set[int]:
        with self.connection.cursor() as cursor:
            cursor.execute(PUBLISHABLE_CLUSTER_IDS_SQL, {"min_items": MIN_READY_ITEMS})
            return {row[0] for row in cursor.fetchall()}

    def mark_published(self, cluster_ids: list[int], status: str) -> int:
        if not cluster_ids:
            return 0
        with self.connection.cursor() as cursor:
            cursor.execute(
                "UPDATE clusters SET status = %s WHERE id = ANY(%s)",
                (status, cluster_ids),
            )
        self.connection.commit()
        return len(cluster_ids)

    def _select(self, template: str, limit: int | None) -> list[dict[str, Any]]:
        params: dict[str, Any] = {}
        sql = template.format(limit_clause=_limit_clause(limit, params))
        with self.connection.cursor() as cursor:
            cursor.execute(sql, params)
            return _dict_rows(cursor)

    def select_cluster_items(self, *, limit: int | None = None) -> list[dict[str, Any]]:
        return self._select(SELECT_CLUSTER_ITEMS_SQL, limit)

    def select_clusters(self, *, limit: int | None = None) -> list[dict[str, Any]]:
        return self._select(SELECT_CLUSTERS_SQL, limit)

    def select_unpublishable_item_ids(self) -> list[str]:
        with self.connection.cursor() as cursor:
            cursor.execute(SELECT_UNPUBLISHABLE_ITEM_IDS_SQL)
            return [str(row[0]) for row in cursor.fetchall()]

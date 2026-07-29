"""Local PostgreSQL repository for new_cluster_candidate grouping.

Reads ungrouped ``status='new_cluster_candidate'`` rows from ``cluster_items``
and their embeddings, groups them by pgvector cosine distance, and promotes each
group to a real ``clusters`` row. Members are attached to the new cluster by
setting ``cluster_items.cluster_id`` and advancing them to ``status='grouped'``.

``clusters.id`` has no sequence in the local base schema, so a new id is derived
as ``max(id)+1`` inside the transaction. This worker is not run concurrently
(no FIFO/worker-id), so the derivation is safe.
"""

from __future__ import annotations

from typing import Any


# Eligible candidates: new_cluster_candidate rows that still have an embedding and
# have not yet been attached to a cluster.
_CANDIDATE_CTE = """
  WITH candidates AS (
    SELECT id AS post_id,
           embedding::text AS embedding_text
    FROM cluster_items
    WHERE status = 'new_cluster_candidate'
      AND embedding IS NOT NULL
      AND cluster_id IS NULL
    ORDER BY id ASC
    LIMIT %(limit)s
  )
"""

SELECT_CANDIDATES_SQL = _CANDIDATE_CTE + """
SELECT post_id, embedding_text FROM candidates
"""

# Pairwise edges (a < b avoids duplicates/self-pairs). similarity >= threshold
# <=> distance <= 1 - threshold.
PAIRWISE_EDGES_SQL = _CANDIDATE_CTE + """,
  vectors AS (
    SELECT post_id, (embedding_text)::vector AS vec FROM candidates
  )
SELECT a.post_id AS a_id, b.post_id AS b_id
FROM vectors a
JOIN vectors b ON a.post_id < b.post_id
WHERE (a.vec <=> b.vec) <= %(max_distance)s
"""


def _dict_rows(cursor: Any) -> list[dict[str, Any]]:
    columns = [column.name if hasattr(column, "name") else column[0] for column in cursor.description]
    return [dict(zip(columns, row)) for row in cursor.fetchall()]


class NewClusterGroupingRepository:
    def __init__(self, connection: Any):
        self.connection = connection

    def fetch_graph(self, limit: int, threshold: float) -> tuple[list[dict[str, Any]], list[tuple[Any, Any]]]:
        """Return (candidates, edges) for grouping — read-only, no mutation."""
        max_distance = 1.0 - threshold
        with self.connection.cursor() as cursor:
            cursor.execute(SELECT_CANDIDATES_SQL, {"limit": limit})
            rows = _dict_rows(cursor)
            cursor.execute(PAIRWISE_EDGES_SQL, {"limit": limit, "max_distance": max_distance})
            edge_rows = _dict_rows(cursor)
        candidates = [
            {
                "post_id": row["post_id"],
                "embedding_text": row["embedding_text"],
            }
            for row in rows
        ]
        edges = [(row["a_id"], row["b_id"]) for row in edge_rows]
        return candidates, edges

    def create_proposed_cluster(self, payload: dict[str, Any]) -> int:
        """Promote one grouped component to a clusters row; attach its members.

        Returns the number of members attached. Idempotent per member: a member
        already attached to a cluster (cluster_id set) is skipped.
        """
        members = payload["members"]
        with self.connection.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO clusters (id, centroid, status)
                VALUES (
                    (SELECT COALESCE(max(id), 0) + 1 FROM clusters),
                    %(centroid)s::vector, 'proposed'
                )
                RETURNING id
                """,
                payload,
            )
            cluster_id = cursor.fetchone()[0]
            inserted = 0
            for member in members:
                cursor.execute(
                    """
                    UPDATE cluster_items
                    SET cluster_id = %(cluster_id)s,
                        similarity_score = %(similarity_to_centroid)s,
                        status = 'grouped',
                        updated_at = now()
                    WHERE id = %(post_id)s AND cluster_id IS NULL
                    """,
                    {**member, "cluster_id": cluster_id},
                )
                inserted += cursor.rowcount if cursor.rowcount and cursor.rowcount > 0 else 0
        self.connection.commit()
        return inserted

"""Local PostgreSQL raw-post ingestion repository.

Ingest writes scraped posts directly into ``cluster_items`` (the conveyor). A
fresh row starts at ``status='scraped'`` and advances through the pipeline via
its single ``status`` column. ``cluster_id`` stays NULL until assignment.
"""

from __future__ import annotations

import json
from typing import Any, Iterable


# One conveyor row per external post. Identity is (platform, source_item_id);
# Re-ingest keeps an unchanged row in place. If source content changed, every
# derived field is cleared and the row returns to ``scraped``.
UPSERT_CLUSTER_ITEM = """
INSERT INTO cluster_items (
  platform, source_type, source_group, community, source_item_id, title, body,
  author, url, score, num_comments, posted_at, raw_json, content_hash
) VALUES (
  %(platform)s, %(source_type)s, %(source_group)s, %(community)s,
  %(source_item_id)s, %(title)s, %(body)s, %(author)s, %(url)s, %(score)s,
  %(num_comments)s, %(posted_at)s, %(raw_json)s::jsonb, %(content_hash)s
)
ON CONFLICT (platform, source_item_id) DO UPDATE SET
  source_type = EXCLUDED.source_type,
  source_group = EXCLUDED.source_group,
  community = EXCLUDED.community,
  title = EXCLUDED.title,
  body = EXCLUDED.body,
  author = EXCLUDED.author,
  url = EXCLUDED.url,
  score = EXCLUDED.score,
  num_comments = EXCLUDED.num_comments,
  posted_at = EXCLUDED.posted_at,
  raw_json = EXCLUDED.raw_json,
  content_hash = EXCLUDED.content_hash,
  status = CASE
      WHEN cluster_items.content_hash IS DISTINCT FROM EXCLUDED.content_hash THEN 'scraped'
      ELSE cluster_items.status
  END,
  problem_statement = CASE
      WHEN cluster_items.content_hash IS DISTINCT FROM EXCLUDED.content_hash THEN NULL
      ELSE cluster_items.problem_statement
  END,
  rejection_reason = CASE
      WHEN cluster_items.content_hash IS DISTINCT FROM EXCLUDED.content_hash THEN NULL
      ELSE cluster_items.rejection_reason
  END,
  embedding = CASE
      WHEN cluster_items.content_hash IS DISTINCT FROM EXCLUDED.content_hash THEN NULL
      ELSE cluster_items.embedding
  END,
  cluster_id = CASE
      WHEN cluster_items.content_hash IS DISTINCT FROM EXCLUDED.content_hash THEN NULL
      ELSE cluster_items.cluster_id
  END,
  similarity_score = CASE
      WHEN cluster_items.content_hash IS DISTINCT FROM EXCLUDED.content_hash THEN NULL
      ELSE cluster_items.similarity_score
  END,
  updated_at = now()
RETURNING id
"""


def _to_cluster_item(row: dict[str, Any]) -> dict[str, Any]:
    """Map a raw scrape row onto cluster_items ingest columns."""
    return {
        "platform": row.get("source"),
        "source_type": row.get("source_type"),
        "source_group": row.get("source_group"),
        "community": row.get("source_community_id") or row.get("subreddit"),
        "source_item_id": row.get("source_post_id"),
        "title": row.get("title"),
        "body": row.get("body"),
        "author": row.get("author"),
        "url": row.get("url"),
        "score": row.get("score"),
        "num_comments": row.get("num_comments"),
        "posted_at": row.get("source_created_at"),
        "raw_json": json.dumps(row.get("payload")),
        "content_hash": row.get("content_hash"),
    }


class RawPostRepository:
    def __init__(self, connection: Any):
        self.connection = connection

    def ingest(self, rows: Iterable[dict[str, Any]]) -> dict[str, Any]:
        materialized = list(rows)
        try:
            with self.connection.cursor() as cursor:
                for row in materialized:
                    cursor.execute(UPSERT_CLUSTER_ITEM, _to_cluster_item(row))
            self.connection.commit()
        except Exception:
            self.connection.rollback()
            raise
        return {"rows": len(materialized)}

"""Normalize a Reddit API post into the database ingest contract."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from .hashing import content_hash


def _integer(value: object) -> int | None:
    if value in (None, ""):
        return None
    try:
        return int(float(str(value)))
    except (TypeError, ValueError):
        return None


def _timestamp(value: object) -> str | None:
    if value in (None, ""):
        return None
    text = str(value).strip()
    try:
        return datetime.fromtimestamp(float(text), tz=timezone.utc).isoformat()
    except (ValueError, TypeError, OverflowError):
        return text


def normalize_reddit_row(row: dict[str, Any]) -> dict[str, Any]:
    source_post_id = str(row.get("source_post_id") or row.get("id") or "").strip()
    if not source_post_id:
        raise ValueError("Reddit post is missing id/source_post_id")
    title = str(row.get("title") or "")
    body = str(row.get("body") or row.get("selftext") or "")
    return {
        "source": "reddit",
        "source_post_id": source_post_id,
        "source_created_at": _timestamp(row.get("source_created_at") or row.get("created_utc")),
        "title": title,
        "body": body,
        "author": row.get("author") or None,
        "url": row.get("url") or row.get("permalink") or None,
        "source_community_id": row.get("subreddit")
        or row.get("source_community_id")
        or None,
        "score": _integer(row.get("score")),
        "num_comments": _integer(row.get("num_comments")),
        "payload": dict(row),
        "content_hash": content_hash("reddit", source_post_id, title, body),
    }

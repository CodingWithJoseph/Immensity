"""Normalizers for Stack Exchange and Hacker News source records."""

from __future__ import annotations

import html
import re
from datetime import datetime, timezone
from typing import Any

from problemfinder.sources import infer_source_group, source_group_for

from .hashing import content_hash

_TAG_RE = re.compile(r"<[^>]+>")


def _integer(value: object) -> int | None:
    if value in (None, ""):
        return None
    try:
        return int(float(str(value)))
    except (TypeError, ValueError):
        return None


def _unix_timestamp(value: object) -> str | None:
    number = _integer(value)
    if number is None:
        return None
    return datetime.fromtimestamp(number, tz=timezone.utc).isoformat()


def _plain_text(value: object) -> str:
    text = str(value or "")
    return html.unescape(_TAG_RE.sub(" ", text)).strip()


def normalize_stackexchange_question(question: dict[str, Any], site: str) -> dict[str, Any]:
    question_id = str(question.get("question_id") or "").strip()
    if not question_id:
        raise ValueError("Stack Exchange question is missing question_id")
    title = html.unescape(str(question.get("title") or ""))
    body = _plain_text(question.get("body"))
    group = source_group_for("stackexchange", site) or "developer_tools"
    owner = question.get("owner") if isinstance(question.get("owner"), dict) else {}
    source_post_id = f"{site}:{question_id}"
    payload = {
        "source_type": "question",
        "source_group": group,
        "site": site,
        "tags": list(question.get("tags") or []),
        "is_answered": bool(question.get("is_answered", False)),
        "answer_count": _integer(question.get("answer_count")),
        "view_count": _integer(question.get("view_count")),
        "last_activity_date": question.get("last_activity_date"),
    }
    return {
        "source": "stackexchange",
        "source_type": "question",
        "source_group": group,
        "source_post_id": source_post_id,
        "source_created_at": _unix_timestamp(question.get("creation_date")),
        "title": title,
        "body": body,
        "author": owner.get("display_name") or None,
        "url": question.get("link") or None,
        "source_community_id": site,
        "score": _integer(question.get("score")),
        "num_comments": _integer(question.get("answer_count")),
        "payload": payload,
        "content_hash": content_hash("stackexchange", source_post_id, title, body),
    }


def hackernews_source_type(title: str) -> str:
    lowered = title.casefold().strip()
    if lowered.startswith("ask hn:"):
        return "ask_hn"
    if lowered.startswith("show hn:"):
        return "show_hn"
    return "story"


def normalize_hackernews_story(item: dict[str, Any]) -> dict[str, Any]:
    item_id = str(item.get("id") or "").strip()
    if not item_id:
        raise ValueError("Hacker News item is missing id")
    title = str(item.get("title") or "")
    body = _plain_text(item.get("text"))
    source_type = hackernews_source_type(title)
    group = infer_source_group(f"{title}\n{body}")
    payload = {
        "source_type": source_type,
        "source_group": group,
        "hn_type": item.get("type"),
        "descendants": _integer(item.get("descendants")),
        "kids": list(item.get("kids") or []),
    }
    return {
        "source": "hackernews",
        "source_type": source_type,
        "source_group": group,
        "source_post_id": item_id,
        "source_created_at": _unix_timestamp(item.get("time")),
        "title": title,
        "body": body,
        "author": item.get("by") or None,
        "url": item.get("url") or f"https://news.ycombinator.com/item?id={item_id}",
        "source_community_id": source_type,
        "score": _integer(item.get("score")),
        "num_comments": _integer(item.get("descendants")),
        "payload": payload,
        "content_hash": content_hash("hackernews", item_id, title, body),
    }

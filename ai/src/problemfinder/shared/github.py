"""Normalize GitHub issues and discussions into the database ingest contract."""

from __future__ import annotations

from typing import Any

from problemfinder.sources import source_group_for

from .hashing import content_hash


def _integer(value: object) -> int | None:
    if value in (None, ""):
        return None
    try:
        return int(float(str(value)))
    except (TypeError, ValueError):
        return None


def _login(record: dict[str, Any]) -> str | None:
    user = record.get("user") or record.get("author")
    if not isinstance(user, dict):
        return None
    login = str(user.get("login") or "").strip()
    return login or None


def _labels(issue: dict[str, Any]) -> list[str]:
    labels: list[str] = []
    for label in issue.get("labels") or []:
        if isinstance(label, dict):
            name = str(label.get("name") or "").strip()
        else:
            name = str(label or "").strip()
        if name:
            labels.append(name)
    return labels


def _reactions(issue: dict[str, Any]) -> dict[str, int]:
    raw = issue.get("reactions")
    if not isinstance(raw, dict):
        return {}
    reactions: dict[str, int] = {}
    for key, value in raw.items():
        if key == "url":
            continue
        count = _integer(value)
        if count is not None:
            reactions[key] = count
    return reactions


def normalize_github_issue(issue: dict[str, Any], repository: str) -> dict[str, Any]:
    source_post_id = str(issue.get("node_id") or issue.get("id") or "").strip()
    if not source_post_id:
        raise ValueError("GitHub issue is missing node_id/id")
    title = str(issue.get("title") or "")
    body = str(issue.get("body") or "")
    reactions = _reactions(issue)
    user = issue.get("user") if isinstance(issue.get("user"), dict) else {}
    source_group = source_group_for("github", repository) or "github_unclassified"
    payload = {
        "source_type": "issue",
        "source_group": source_group,
        "repository": repository,
        "number": _integer(issue.get("number")),
        "state": issue.get("state"),
        "state_reason": issue.get("state_reason"),
        "labels": _labels(issue),
        "locked": bool(issue.get("locked", False)),
        "reactions": reactions,
        "created_at": issue.get("created_at"),
        "updated_at": issue.get("updated_at"),
        "closed_at": issue.get("closed_at"),
        "user_type": user.get("type"),
    }
    return {
        "source": "github",
        "source_type": "issue",
        "source_group": source_group,
        "source_post_id": f"issue:{source_post_id}",
        "source_created_at": issue.get("created_at"),
        "title": title,
        "body": body,
        "author": _login(issue),
        "url": issue.get("html_url") or None,
        "source_community_id": repository,
        "score": reactions.get("total_count"),
        "num_comments": _integer(issue.get("comments")),
        "payload": payload,
        "content_hash": content_hash("github", f"issue:{source_post_id}", title, body),
    }


def normalize_github_discussion(discussion: dict[str, Any], repository: str) -> dict[str, Any]:
    source_post_id = str(discussion.get("id") or discussion.get("number") or "").strip()
    if not source_post_id:
        raise ValueError("GitHub discussion is missing id/number")
    title = str(discussion.get("title") or "")
    body = str(discussion.get("body") or "")
    source_group = source_group_for("github", repository) or "github_unclassified"
    category = discussion.get("category") if isinstance(discussion.get("category"), dict) else {}
    comments = discussion.get("comments") if isinstance(discussion.get("comments"), dict) else {}
    upvote_count = _integer(discussion.get("upvoteCount"))
    payload = {
        "source_type": "discussion",
        "source_group": source_group,
        "repository": repository,
        "number": _integer(discussion.get("number")),
        "category": category.get("name"),
        "answered": discussion.get("answerChosenAt") is not None,
        "created_at": discussion.get("createdAt"),
        "updated_at": discussion.get("updatedAt"),
    }
    return {
        "source": "github",
        "source_type": "discussion",
        "source_group": source_group,
        "source_post_id": f"discussion:{source_post_id}",
        "source_created_at": discussion.get("createdAt"),
        "title": title,
        "body": body,
        "author": _login(discussion),
        "url": discussion.get("url") or None,
        "source_community_id": repository,
        "score": upvote_count,
        "num_comments": _integer(comments.get("totalCount")),
        "payload": payload,
        "content_hash": content_hash("github", f"discussion:{source_post_id}", title, body),
    }

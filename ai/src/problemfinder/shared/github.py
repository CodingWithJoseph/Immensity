"""Normalize a GitHub issue into the database ingest contract."""

from __future__ import annotations

from typing import Any

from .hashing import content_hash


def _integer(value: object) -> int | None:
    if value in (None, ""):
        return None
    try:
        return int(float(str(value)))
    except (TypeError, ValueError):
        return None


def _login(issue: dict[str, Any]) -> str | None:
    user = issue.get("user")
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


def normalize_github_issue(
    issue: dict[str, Any],
    repository: str,
) -> dict[str, Any]:
    """Map a GitHub REST issue response onto the shared source-row contract."""

    source_post_id = str(issue.get("node_id") or issue.get("id") or "").strip()
    if not source_post_id:
        raise ValueError("GitHub issue is missing node_id/id")

    title = str(issue.get("title") or "")
    body = str(issue.get("body") or "")
    reactions = _reactions(issue)
    user = issue.get("user") if isinstance(issue.get("user"), dict) else {}
    payload = {
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
        "source_post_id": source_post_id,
        "source_created_at": issue.get("created_at"),
        "title": title,
        "body": body,
        "author": _login(issue),
        "url": issue.get("html_url") or None,
        "source_community_id": repository,
        "score": reactions.get("total_count"),
        "num_comments": _integer(issue.get("comments")),
        "payload": payload,
        "content_hash": content_hash("github", source_post_id, title, body),
    }

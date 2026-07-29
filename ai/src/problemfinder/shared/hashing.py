"""Stable identifiers used by local pipeline ingestion."""

from hashlib import sha256


def _normalize(value: object) -> str:
    return str(value or "").replace("\r\n", "\n").replace("\r", "\n").strip()


def content_hash(source: object, source_post_id: object, title: object, body: object) -> str:
    """Return a deterministic hash for one version of a source post."""
    parts = (_normalize(source), _normalize(source_post_id), _normalize(title), _normalize(body))
    return sha256("\x1f".join(parts).encode("utf-8")).hexdigest()

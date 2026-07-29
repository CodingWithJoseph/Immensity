"""Deterministic completeness rules for extracted problem statements."""

from __future__ import annotations

from typing import Any

MISSING_TEXT_VALUES = frozenset(
    {
        "",
        "n/a",
        "na",
        "none",
        "not applicable",
        "not available",
        "null",
        "unknown",
        "unclear",
    }
)

def normalize_optional_text(value: Any) -> str | None:
    """Return clean text, using real ``None`` for every missing-value variant."""
    if value is None:
        return None
    text = " ".join(str(value).split()).strip()
    return None if text.lower().rstrip(".") in MISSING_TEXT_VALUES else text


def missing_problem_reason(problem_statement: Any) -> str | None:
    """Return the stable rejection code when no problem can be extracted."""
    return (
        "missing_problem_statement"
        if normalize_optional_text(problem_statement) is None
        else None
    )

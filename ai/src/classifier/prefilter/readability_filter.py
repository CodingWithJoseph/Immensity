"""Stage 1 of the pre-filter: rule-based readability gate (no LLM).

Runs first, at zero model cost, to reject posts that are structurally unusable
before any Qwen call is spent on them. Every rejection carries a specific reason
so discards can be audited rather than silently dropped (the core failing of the
old binary noise filter).

Output schema (single post):
    {"pass": bool, "reason": str | None}

``reason`` is set only when ``pass`` is False, and is one of:
    "too_short", "deleted", "emoji_only", "link_only", "no_body".
"""
from __future__ import annotations

import re

# Reject thresholds.
MIN_COMBINED_CHARS = 30     # title + body shorter than this -> too_short
EMOJI_RATIO_LIMIT = 0.80    # more than 80% emoji characters -> emoji_only
LINK_RATIO_LIMIT = 0.90     # more than 90% of the body is links -> link_only

_DELETED_MARKERS = {"[deleted]", "[removed]"}

_URL_RE = re.compile(r"https?://\S+|www\.\S+", re.IGNORECASE)

# Approximate emoji / pictograph code-point ranges. We only need a ratio, so a
# broad-but-inexact class is fine and avoids a third-party ``emoji`` dependency.
_EMOJI_RE = re.compile(
    "["
    "\U0001F300-\U0001FAFF"   # symbols, pictographs, emoji, supplemental
    "\U00002600-\U000027BF"   # misc symbols + dingbats
    "\U0001F000-\U0001F0FF"   # mahjong / dominoes / playing cards
    "\U0001F1E6-\U0001F1FF"   # regional indicators (flags)
    "\U00002B00-\U00002BFF"   # misc symbols and arrows
    "\U0000FE00-\U0000FE0F"   # variation selectors
    "\U0000200D"              # zero-width joiner (emoji sequences)
    "\U00002190-\U000021FF"   # arrows
    "]"
)


def _norm(value) -> str:
    """Coerce to a stripped string; None / NaN / non-str -> ''."""
    if not isinstance(value, str):
        return ""
    return value.strip()


def _emoji_ratio(text: str) -> float:
    chars = [c for c in text if not c.isspace()]
    if not chars:
        return 0.0
    emoji = sum(1 for c in chars if _EMOJI_RE.match(c))
    return emoji / len(chars)


def _link_ratio(text: str) -> float:
    no_space = re.sub(r"\s+", "", text)
    if not no_space:
        return 0.0
    url_chars = sum(len(re.sub(r"\s+", "", m.group(0))) for m in _URL_RE.finditer(text))
    return min(1.0, url_chars / len(no_space))


class ReadabilityFilter:
    """Cheap structural gate. ``check`` is pure and does not raise on normal input.

    Precedence (first match wins) is deliberate so every reason stays reachable:
    a missing body with a one-word title is ``no_body``; a missing body with a
    real title is ``deleted``; only then do the length / emoji / link checks run
    (which require a present body).
    """

    @staticmethod
    def _fail(reason: str) -> dict:
        return {"pass": False, "reason": reason}

    def check(self, title, body) -> dict:
        norm_title = _norm(title)
        norm_body = _norm(body)

        body_empty = norm_body == ""
        body_is_marker = norm_body.lower() in _DELETED_MARKERS
        body_missing = body_empty or body_is_marker
        title_words = norm_title.split()

        # 1. Truly empty body behind a single-word (or empty) title.
        if body_empty and len(title_words) <= 1:
            return self._fail("no_body")

        # 2. Any other missing body: an empty body with a real title, or an
        #    explicit [deleted] / [removed] marker.
        if body_missing:
            return self._fail("deleted")

        combined = f"{norm_title} {norm_body}".strip()

        # 3. Title + body too short to carry a signal.
        if len(combined) < MIN_COMBINED_CHARS:
            return self._fail("too_short")

        # 4. Overwhelmingly emoji.
        if _emoji_ratio(combined) > EMOJI_RATIO_LIMIT:
            return self._fail("emoji_only")

        # 5. Body is almost entirely links.
        if _link_ratio(norm_body) > LINK_RATIO_LIMIT:
            return self._fail("link_only")

        return {"pass": True, "reason": None}

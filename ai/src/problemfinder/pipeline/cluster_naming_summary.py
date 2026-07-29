"""Generate one deterministic title and summary per problem cluster."""

from __future__ import annotations

import re
import time
from collections import Counter
from typing import Any

_STOPWORDS = {
    "about", "after", "again", "because", "being", "could", "from", "have",
    "into", "just", "need", "needs", "problem", "that", "their", "there",
    "these", "they", "this", "through", "users", "when", "where", "with",
    "without", "work", "working",
}


def clean_text(value: Any) -> str | None:
    text = re.sub(r"\s+", " ", str(value or "")).strip()
    return text or None


def _truncate(text: str, words: int, chars: int) -> str:
    text = clean_text(text) or ""
    parts = text.split()
    if len(parts) > words:
        text = " ".join(parts[:words]).rstrip(".,;:") + "…"
    if len(text) > chars:
        text = text[:chars].rsplit(" ", 1)[0].rstrip(".,;:") + "…"
    return text


def _phrases(texts: list[str]) -> Counter[str]:
    counts: Counter[str] = Counter()
    for text in texts:
        words = [
            word.lower()
            for word in re.findall(r"[A-Za-z][A-Za-z0-9'-]+", text)
            if len(word) > 2 and word.lower() not in _STOPWORDS
        ]
        for size in (3, 2):
            for index in range(len(words) - size + 1):
                counts[" ".join(words[index : index + size])] += 1
    return counts


def derive_title(evidence: list[dict[str, Any]]) -> str | None:
    statements = [
        text for row in evidence if (text := clean_text(row.get("problem_statement")))
    ]
    repeated = [(phrase, count) for phrase, count in _phrases(statements).items() if count > 1]
    if repeated:
        phrase = sorted(repeated, key=lambda value: (-value[1], -len(value[0]), value[0]))[0][0]
        return phrase.title()
    if statements:
        return _truncate(re.split(r"[.!?;]", statements[0], maxsplit=1)[0], 9, 90)
    return None


def derive_summary(evidence: list[dict[str, Any]]) -> str | None:
    statements: list[str] = []
    for row in evidence:
        statement = clean_text(row.get("problem_statement"))
        if statement and statement not in statements:
            statements.append(_truncate(statement, 20, 180))
        if len(statements) == 3:
            break
    if not statements:
        return None
    return "Related posts report " + "; ".join(statements) + "."


def build_summary_row(
    context: dict[str, Any],
    evidence: list[dict[str, Any]],
) -> dict[str, Any]:
    title = derive_title(evidence)
    summary = derive_summary(evidence)
    return {
        "cluster_id": context["cluster_id"],
        "problem_name": title,
        "problem_summary": summary,
        "summary_status": "ready" if title and summary else "insufficient_evidence",
    }


def run_worker(
    repository: Any,
    *,
    limit: int,
    batch_size: int,
    max_minutes: int,
    dry_run: bool,
) -> dict[str, Any]:
    started = time.monotonic()
    contexts = repository.fetch_cluster_contexts(limit)
    if not contexts:
        return {
            "dry_run": dry_run,
            "clusters_considered": 0,
            "clusters_named": 0,
            "insufficient_evidence": 0,
        }

    rows: list[dict[str, Any]] = []
    for start in range(0, len(contexts), batch_size):
        if time.monotonic() - started >= max_minutes * 60:
            break
        batch = contexts[start : start + batch_size]
        ids = [row["cluster_id"] for row in batch]
        grouped: dict[Any, list[dict[str, Any]]] = {cluster_id: [] for cluster_id in ids}
        for evidence in repository.fetch_evidence_rows(ids):
            grouped.setdefault(evidence["cluster_id"], []).append(evidence)
        rows.extend(build_summary_row(context, grouped[context["cluster_id"]]) for context in batch)

    ready = [row for row in rows if row["summary_status"] == "ready"]
    if not dry_run:
        repository.update_clusters(ready)
    return {
        "dry_run": dry_run,
        "clusters_considered": len(rows),
        "clusters_named": len(ready),
        "insufficient_evidence": len(rows) - len(ready),
        "clusters_deferred": len(contexts) - len(rows),
    }

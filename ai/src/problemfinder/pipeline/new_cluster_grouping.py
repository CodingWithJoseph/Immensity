"""Local new_cluster_candidate grouping.

After cluster_assignment, posts that matched no existing canonical cluster are
marked ``new_cluster_candidate``. This stage groups those candidates against each
other (pgvector cosine distance, a separate threshold from existing-cluster
assignment) to discover whether they form one or more NEW local problem spaces.

First version (simple and reliable):
  * pairwise compare new candidates (similarity = 1 - cosine distance),
  * build connected components where similarity >= threshold,
  * create a local proposed cluster for each component with >= ``min_members``,
  * leave singleton candidates ungrouped.

Local-only: reads candidate rows and embeddings through the repository, creates
local clusters, and attaches grouped rows. It never writes to Supabase.
"""

from __future__ import annotations

import json
import math
import time
from typing import Any


DEFAULT_THRESHOLD = 0.82  # separate from the existing-cluster assignment threshold
DEFAULT_MIN_MEMBERS = 3


def build_components(post_ids: list[Any], edges: list[tuple[Any, Any]]) -> list[list[Any]]:
    """Connected components over the candidate graph (union-find). Deterministic:
    components and their members preserve the input ``post_ids`` order."""
    parent = {pid: pid for pid in post_ids}

    def find(node):
        while parent[node] != node:
            parent[node] = parent[parent[node]]
            node = parent[node]
        return node

    def union(a, b):
        ra, rb = find(a), find(b)
        if ra != rb:
            parent[ra] = rb

    known = set(post_ids)
    for a, b in edges:
        if a in known and b in known:
            union(a, b)

    groups: dict[Any, list[Any]] = {}
    for pid in post_ids:  # input order preserved
        groups.setdefault(find(pid), []).append(pid)
    return list(groups.values())


def _vector(text: str) -> list[float]:
    return [float(x) for x in json.loads(text)]


def _mean(vectors: list[list[float]]) -> list[float]:
    count = len(vectors)
    dim = len(vectors[0])
    return [sum(v[i] for v in vectors) / count for i in range(dim)]


def _normalize(vector: list[float]) -> list[float]:
    norm = math.sqrt(sum(x * x for x in vector))
    return [x / norm for x in vector] if norm else vector


def _cosine(a: list[float], b: list[float]) -> float:
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(y * y for y in b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return sum(x * y for x, y in zip(a, b)) / (norm_a * norm_b)


def build_proposed_cluster(members: list[dict[str, Any]]) -> dict[str, Any]:
    """Build the centroid and member similarities for one new cluster."""
    vectors = [_vector(member["embedding_text"]) for member in members]
    centroid = _normalize(_mean(vectors))
    enriched = []
    for index, member in enumerate(members):
        similarity = round(_cosine(vectors[index], centroid), 6)
        enriched.append({
            "post_id": member["post_id"],
            "similarity_to_centroid": similarity,
        })
    return {
        "centroid": "[" + ",".join(str(x) for x in centroid) + "]",
        "members": enriched,
    }


def run_worker(
    repository: Any,
    *,
    limit: int,
    threshold: float,
    min_members: int,
    max_minutes: int,
    dry_run: bool,
) -> dict[str, Any]:
    candidates, edges = repository.fetch_graph(limit, threshold)
    by_id = {candidate["post_id"]: candidate for candidate in candidates}
    components = build_components([c["post_id"] for c in candidates], edges)
    groups = [component for component in components if len(component) >= min_members]
    grouped_ids = {pid for component in groups for pid in component}
    ungrouped = len(candidates) - len(grouped_ids)

    if dry_run:
        return {
            "dry_run": True,
            "threshold": threshold,
            "min_members": min_members,
            "candidates": len(candidates),
            "proposed_clusters_would_create": len(groups),
            "grouped_candidates": len(grouped_ids),
            "ungrouped_candidates": ungrouped,
        }

    proposed_created = 0
    members_inserted = 0
    started = time.monotonic()
    for component in groups:
        if time.monotonic() - started >= max_minutes * 60:
            break
        members = [by_id[pid] for pid in component]
        payload = build_proposed_cluster(members)
        members_inserted += repository.create_proposed_cluster(payload)
        proposed_created += 1

    return {
        "dry_run": False,
        "threshold": threshold,
        "min_members": min_members,
        "candidates": len(candidates),
        "proposed_clusters_created": proposed_created,
        "members_inserted": members_inserted,
        "ungrouped_candidates": ungrouped,
        "groups_deferred": len(groups) - proposed_created,
    }

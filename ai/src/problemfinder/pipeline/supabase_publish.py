"""Publish named software-problem clusters and their source items."""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Any

from util.constants import PIPELINE_VERSION

REQUIRED_CLUSTER_ITEM_FIELDS = (
    "platform",
    "source_item_id",
    "title",
    "cluster_id",
    "problem_statement",
    "embedding",
)
CLUSTER_ITEMS_CONFLICT = "platform,source_item_id"
REMOVED_PUBLIC_ITEM_FIELDS = {
    "opportunity_type": None,
    "opportunity_domain": None,
    "solution_angle": None,
}


def _clean(value: Any) -> Any:
    if isinstance(value, str):
        value = value.strip()
        return value or None
    return value


def _serializable_value(value: Any) -> Any:
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, Decimal):
        return float(value)
    return value


def _serializable(record: dict[str, Any]) -> dict[str, Any]:
    return {key: _serializable_value(value) for key, value in record.items()}


PUBLIC_RAW_JSON_KEYS = ("upvote_ratio", "top_comments")


def _public_raw_json(value: Any) -> Any:
    if not isinstance(value, dict):
        return {}
    return {key: value[key] for key in PUBLIC_RAW_JSON_KEYS if value.get(key) is not None}


def cluster_item_missing_fields(row: dict[str, Any]) -> list[str]:
    missing = [
        field
        for field in REQUIRED_CLUSTER_ITEM_FIELDS
        if _clean(row.get(field)) is None
    ]
    return missing


def partition_publishable_cluster_items(
    rows: list[dict[str, Any]],
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    complete: list[dict[str, Any]] = []
    incomplete: list[dict[str, Any]] = []
    for row in rows:
        (incomplete if cluster_item_missing_fields(row) else complete).append(row)
    return complete, incomplete


def transform_cluster(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": row["cluster_id"],
        "name": _clean(row.get("name")),
        "summary": _clean(row.get("summary")),
        "pipeline_version": PIPELINE_VERSION,
    }


def transform_cluster_item(row: dict[str, Any]) -> dict[str, Any]:
    return _serializable(
        {
            "id": str(row["id"]),
            "cluster_id": row["cluster_id"],
            "platform": _clean(row.get("platform")),
            "community": _clean(row.get("community")),
            "source_item_id": str(row["source_item_id"]),
            "title": _clean(row.get("title")),
            "body": _clean(row.get("body")),
            "url": _clean(row.get("url")),
            "author": _clean(row.get("author")),
            "score": row.get("score"),
            "num_comments": row.get("num_comments"),
            "posted_at": row.get("posted_at"),
            "raw_json": _public_raw_json(row.get("raw_json")),
            "problem_statement": _clean(row.get("problem_statement")),
            "embedding": row.get("embedding"),
            "similarity_score": row.get("similarity_score"),
            "pipeline_version": PIPELINE_VERSION,
        }
    )


class SupabasePublishAdapter:
    def __init__(self, client: Any):
        self.client = client

    def _upsert(self, table: str, records: list[dict[str, Any]], conflict: str, batch_size: int = 100) -> int:
        written = 0
        for index in range(0, len(records), batch_size):
            batch = records[index : index + batch_size]
            self.client.table(table).upsert(batch, on_conflict=conflict).execute()
            written += len(batch)
        return written

    def upsert_clusters(self, records: list[dict[str, Any]]) -> int:
        return self._upsert("clusters", records, "id")

    def upsert_cluster_items(self, records: list[dict[str, Any]]) -> int:
        return self._upsert("cluster_items", records, CLUSTER_ITEMS_CONFLICT)

    def delete_cluster_items(self, item_ids: list[str], batch_size: int = 100) -> int:
        deleted = 0
        for index in range(0, len(item_ids), batch_size):
            batch = item_ids[index : index + batch_size]
            self.client.table("cluster_items").delete().in_("id", batch).execute()
            deleted += len(batch)
        return deleted

    def clear_removed_item_fields(self, item_ids: list[str], batch_size: int = 100) -> int:
        cleared = 0
        for index in range(0, len(item_ids), batch_size):
            batch = item_ids[index : index + batch_size]
            self.client.table("cluster_items").update(
                REMOVED_PUBLIC_ITEM_FIELDS
            ).in_("id", batch).execute()
            cleared += len(batch)
        return cleared

    def delete_all_cluster_signals(self, batch_size: int = 100) -> int:
        response = self.client.table("cluster_signals").select("cluster_id").execute()
        cluster_ids = [
            int(row["cluster_id"])
            for row in (getattr(response, "data", None) or [])
            if row.get("cluster_id") is not None
        ]
        deleted = 0
        for index in range(0, len(cluster_ids), batch_size):
            batch = cluster_ids[index : index + batch_size]
            self.client.table("cluster_signals").delete().in_("cluster_id", batch).execute()
            deleted += len(batch)
        return deleted

    def prune_clusters(self, keep_ids: set[int], batch_size: int = 100) -> int:
        response = (
            self.client.table("clusters")
            .select("id")
            .eq("pipeline_version", PIPELINE_VERSION)
            .execute()
        )
        existing = {
            int(row["id"])
            for row in (getattr(response, "data", None) or [])
            if row.get("id") is not None
        }
        stale = sorted(existing - keep_ids)
        for index in range(0, len(stale), batch_size):
            batch = stale[index : index + batch_size]
            self.client.table("cluster_items").delete().in_("cluster_id", batch).execute()
            self.client.table("clusters").delete().in_("id", batch).execute()
        return len(stale)


def run_publish(
    repository: Any,
    adapter: Any,
    *,
    limit: int | None = None,
    dry_run: bool = False,
) -> dict[str, Any]:
    ready = repository.publishable_cluster_ids()
    clusters = [row for row in repository.select_clusters(limit=None) if row["cluster_id"] in ready]
    if limit is not None:
        clusters = clusters[:limit]
    selected_cluster_ids = {row["cluster_id"] for row in clusters}
    item_rows = [
        row
        for row in repository.select_cluster_items(limit=None)
        if row["cluster_id"] in selected_cluster_ids
    ]
    items, incomplete = partition_publishable_cluster_items(item_rows)
    stale_item_ids = repository.select_unpublishable_item_ids()

    result = {
        "dry_run": dry_run,
        "clusters_ready": len(ready),
        "clusters_selected": len(clusters),
        "cluster_items_selected": len(items),
        "cluster_items_skipped_incomplete": len(incomplete),
        "cluster_signals_cleanup": "all",
        "stale_cluster_items_selected": len(stale_item_ids),
    }
    if dry_run:
        return result

    try:
        result["clusters_written"] = adapter.upsert_clusters(
            [transform_cluster(row) for row in clusters]
        )
        result["cluster_items_written"] = adapter.upsert_cluster_items(
            [transform_cluster_item(row) for row in items]
        )
        result["cluster_items_legacy_fields_cleared"] = adapter.clear_removed_item_fields(
            [str(row["id"]) for row in items]
        )
        result["cluster_signals_deleted"] = adapter.delete_all_cluster_signals()
        result["stale_cluster_items_deleted"] = adapter.delete_cluster_items(stale_item_ids)
        result["stale_clusters_deleted"] = adapter.prune_clusters(ready)
    except Exception:
        repository.mark_published(sorted(selected_cluster_ids), "sync_failed")
        raise
    repository.mark_published(sorted(selected_cluster_ids), "ready")
    return result


def build_supabase_adapter(client_factory=None) -> SupabasePublishAdapter:
    if client_factory is None:
        from util.supabase_client import get_client

        client = get_client(write_mode=True)
    else:
        client = client_factory()
    return SupabasePublishAdapter(client)

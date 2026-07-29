from problemfinder.pipeline.supabase_publish import (
    REMOVED_PUBLIC_ITEM_FIELDS,
    SupabasePublishAdapter,
    cluster_item_missing_fields,
    run_publish,
    transform_cluster,
    transform_cluster_item,
)


def _item(**overrides):
    row = {
        "id": "item-1",
        "cluster_id": 1,
        "platform": "reddit",
        "source_item_id": "post-1",
        "title": "Manual invoice entry",
        "problem_statement": "Invoices are entered by hand.",
        "embedding": "[0.1,0.2]",
    }
    row.update(overrides)
    return row


def test_publish_gate_requires_a_complete_problem_record():
    assert cluster_item_missing_fields(_item()) == []
    assert "problem_statement" in cluster_item_missing_fields(
        _item(problem_statement=None)
    )
    assert "embedding" in cluster_item_missing_fields(_item(embedding=None))


def test_public_contract_keeps_cluster_identity_and_each_posts_problem():
    cluster = transform_cluster(
        {
            "cluster_id": 1,
            "name": "Invoice reconciliation",
            "summary": "Finance teams repeatedly report manual reconciliation work.",
        }
    )
    item = transform_cluster_item(_item())

    assert cluster["name"] == "Invoice reconciliation"
    assert cluster["summary"] == (
        "Finance teams repeatedly report manual reconciliation work."
    )
    assert item["problem_statement"] == "Invoices are entered by hand."
    assert "solution_angle" not in item
    assert "opportunity_type" not in item


def test_cluster_item_publish_payload_contains_only_problem_evidence():
    item = transform_cluster_item(
        _item(
            raw_json={
                "upvote_ratio": 0.94,
                "top_comments": [{"body": "Same problem here"}],
                "selftext_html": "<p>duplicate body</p>",
                "filter_result": {"decision": "accept"},
            },
            content_hash="local-only",
            solution_angle="legacy",
            opportunity_type="Software",
            opportunity_domain="Finance",
        )
    )

    assert item["raw_json"] == {
        "upvote_ratio": 0.94,
        "top_comments": [{"body": "Same problem here"}],
    }
    assert set(item) == {
        "id",
        "cluster_id",
        "platform",
        "community",
        "source_item_id",
        "title",
        "body",
        "url",
        "author",
        "score",
        "num_comments",
        "posted_at",
        "raw_json",
        "problem_statement",
        "embedding",
        "similarity_score",
        "pipeline_version",
    }
    assert REMOVED_PUBLIC_ITEM_FIELDS == {
        "opportunity_type": None,
        "opportunity_domain": None,
        "solution_angle": None,
    }


def test_signal_cleanup_removes_every_remote_signal():
    deleted_batches = []

    class Query:
        def __init__(self, mode=None):
            self.mode = mode
            self.batch = None

        def select(self, _columns):
            self.mode = "select"
            return self

        def delete(self):
            self.mode = "delete"
            return self

        def in_(self, _column, batch):
            self.batch = batch
            return self

        def execute(self):
            if self.mode == "select":
                return type(
                    "Response",
                    (),
                    {"data": [{"cluster_id": 1}, {"cluster_id": 2}, {"cluster_id": 3}]},
                )()
            deleted_batches.append(self.batch)
            return type("Response", (), {"data": []})()

    class Client:
        @staticmethod
        def table(name):
            assert name == "cluster_signals"
            return Query()

    deleted = SupabasePublishAdapter(Client()).delete_all_cluster_signals(
        batch_size=2
    )

    assert deleted == 3
    assert deleted_batches == [[1, 2], [3]]


def test_publish_clears_deferred_analysis_and_all_signals_before_pruning():
    calls = []

    class Repository:
        def publishable_cluster_ids(self):
            return {1}

        def select_clusters(self, limit=None):
            return [{"cluster_id": 1, "name": "Invoices", "summary": "Manual work"}]

        def select_cluster_items(self, limit=None):
            return [_item()]

        def select_unpublishable_item_ids(self):
            return ["stale"]

        def mark_published(self, ids, status):
            calls.append(("mark", status))

    class Adapter:
        def upsert_clusters(self, records):
            calls.append("clusters")
            return len(records)

        def clear_removed_item_fields(self, ids):
            calls.append("clear-items")
            return len(ids)

        def upsert_cluster_items(self, records):
            calls.append("items")
            return len(records)

        def delete_all_cluster_signals(self):
            calls.append("delete-signals")
            return 4

        def delete_cluster_items(self, ids):
            calls.append("delete")
            return len(ids)

        def prune_clusters(self, keep_ids):
            calls.append("prune")
            return 2

    result = run_publish(Repository(), Adapter())
    assert calls[:6] == [
        "clusters",
        "items",
        "clear-items",
        "delete-signals",
        "delete",
        "prune",
    ]
    assert calls[-1] == ("mark", "ready")
    assert result["cluster_items_legacy_fields_cleared"] == 1
    assert result["cluster_signals_deleted"] == 4
    assert result["stale_cluster_items_deleted"] == 1
    assert result["stale_clusters_deleted"] == 2

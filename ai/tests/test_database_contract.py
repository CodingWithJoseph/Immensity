import json

from problemfinder.persistence.local import apply_migrations, migration_paths
from problemfinder.persistence.repositories import classify_final, cpu_clean, filter
from problemfinder.persistence.repositories._raw_json import error_patch, result_patch


def test_status_conveyor_is_the_simplified_flow():
    assert cpu_clean._STAGE_TO_STATUS["filter_pending"] == "filter_pending"
    assert filter.PENDING == "filter_pending"
    assert filter.PASS_STATUS == "classify_pending"
    assert classify_final.PASS_STATUS == "embed_pending"


def test_problem_only_migration_removes_deferred_analysis_values():
    path = next(
        path
        for path in migration_paths()
        if path.name == "09_problem_only_on_demand_analysis.sql"
    )
    sql = path.read_text(encoding="utf-8")
    assert path in migration_paths()
    assert "DROP COLUMN IF EXISTS opportunity_type" in sql
    assert "DROP COLUMN IF EXISTS opportunity_domain" in sql
    assert "DROP COLUMN IF EXISTS solution_angle" in sql
    assert "DROP TABLE IF EXISTS cluster_snapshots" in sql
    assert "DROP TABLE IF EXISTS cluster_signals" in sql
    assert "rejection_reason = 'not_software_addressable'" in sql
    assert "status = 'embed_pending'" in sql
    assert "NULLIF(trim(problem_statement), '') IS NOT NULL" in sql


def test_fresh_database_never_builds_retired_signal_state():
    names = {path.name for path in migration_paths()}
    assert "05_signal_score_components.sql" not in names
    assert "06_cluster_signals_payload.sql" not in names

    base = next(path for path in migration_paths() if path.name == "01_base_schema.sql")
    sql = base.read_text(encoding="utf-8")
    assert "CREATE TABLE IF NOT EXISTS cluster_signals" not in sql
    assert "CREATE TYPE cluster_signal_status" not in sql


def test_base_migration_adds_upgrade_columns_before_indexing_them():
    base = next(path for path in migration_paths() if path.name == "01_base_schema.sql")
    sql = base.read_text(encoding="utf-8")
    add_column = "ADD COLUMN IF NOT EXISTS rejection_reason text"
    create_index = "CREATE INDEX IF NOT EXISTS idx_cluster_items_rejection_reason"

    assert add_column in sql
    assert create_index in sql
    assert sql.index(add_column) < sql.index(create_index)


def test_software_reset_drops_old_signals_before_deleting_clusters():
    reset = next(
        path for path in migration_paths() if path.name == "07_software_only_pipeline.sql"
    )
    sql = reset.read_text(encoding="utf-8")
    drop_signals = "DROP TABLE IF EXISTS cluster_signals"
    delete_clusters = "DELETE FROM clusters"

    assert drop_signals in sql
    assert delete_clusters in sql
    assert sql.index(drop_signals) < sql.index(delete_clusters)


def test_internal_state_cleanup_migration_removes_only_redundant_values():
    path = next(path for path in migration_paths() if path.name == "08_trim_local_pipeline_state.sql")
    sql = path.read_text(encoding="utf-8")
    for column in (
        "permalink",
        "scraped_at",
        "distance_to_centroid",
        "membership_confidence",
        "assigned_by",
        "model_version",
        "first_seen",
    ):
        assert f"DROP COLUMN IF EXISTS {column}" in sql
    assert "DROP TABLE IF EXISTS pipeline_runs" in sql
    assert "DROP COLUMN IF EXISTS problem_statement" not in sql
    assert "DROP COLUMN IF EXISTS status" not in sql


def test_stage_audit_json_keeps_only_decision_or_error():
    assert json.loads(result_patch("filter", "pass")) == {
        "filter_result": {"decision": "pass"}
    }
    assert json.loads(error_patch("filter", "parse failure")) == {
        "filter_error": "parse failure"
    }


def test_migration_runner_applies_each_file_once():
    class Migration:
        name = "01_test.sql"

        @staticmethod
        def read_text(encoding):
            assert encoding == "utf-8"
            return "SELECT 1;"

    migration = Migration()

    class Cursor:
        def __init__(self, connection):
            self.connection = connection
            self.rows = []

        def __enter__(self):
            return self

        def __exit__(self, *args):
            return False

        def execute(self, sql, params=None):
            if sql.startswith("SELECT name"):
                self.rows = [(name,) for name in self.connection.applied]
            elif sql.startswith("INSERT INTO problemfinder_schema_migrations"):
                self.connection.applied.add(params[0])

        def fetchall(self):
            return self.rows

    class Connection:
        def __init__(self):
            self.applied = set()

        def cursor(self):
            return Cursor(self)

        def commit(self):
            pass

        def rollback(self):
            pass

    connection = Connection()
    assert apply_migrations(connection, [migration])["applied"] == ["01_test.sql"]
    assert apply_migrations(connection, [migration])["skipped"] == ["01_test.sql"]

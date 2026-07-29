from problemfinder.pipeline.cluster_naming_summary import build_summary_row
from problemfinder.pipeline.embeddings import build_embedding_text


def test_cluster_gets_title_and_summary_from_problem_statements():
    evidence = [
        {"problem_statement": "Teams manually reconcile invoices across disconnected systems."},
        {"problem_statement": "Finance teams reconcile invoices across multiple systems."},
        {"problem_statement": "Invoice reconciliation creates avoidable data-entry errors."},
    ]
    row = build_summary_row({"cluster_id": 7}, evidence)
    assert row["cluster_id"] == 7
    assert row["problem_name"]
    assert row["problem_summary"].startswith("Related posts report ")
    assert row["summary_status"] == "ready"


def test_embedding_uses_title_problem_and_body_when_present():
    result = build_embedding_text(
        {
            "title": "Invoice entry",
            "problem_statement": "Teams repeatedly re-key invoices.",
            "body": "Our finance team copies every field between systems.",
        }
    )
    assert result == (
        "Title: Invoice entry\n"
        "Problem: Teams repeatedly re-key invoices.\n"
        "Body: Our finance team copies every field between systems."
    )

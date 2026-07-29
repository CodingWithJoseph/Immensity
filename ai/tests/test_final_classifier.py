import json

from classifier.specialist.final_classifier import parse_final_classification


def _payload(**overrides):
    value = {
        "problem_statement": "Teams re-key invoices between disconnected systems.",
    }
    value.update(overrides)
    return json.dumps(value)


def test_classifier_returns_only_the_normalized_problem():
    structured = parse_final_classification(
        _payload(opportunity_type="Physical", solution_angle="Ignored")
    )["structured"]
    assert structured["decision"] == "pass"
    assert set(structured) == {
        "problem_statement",
        "decision",
        "rejection_reason",
    }
    assert structured["rejection_reason"] is None


def test_missing_generated_content_is_searchable_rejection():
    structured = parse_final_classification(_payload(problem_statement="none"))["structured"]
    assert structured["problem_statement"] is None
    assert structured["decision"] == "reject"
    assert structured["rejection_reason"] == "missing_problem_statement"

from problemfinder.pipeline.content_gate import (
    missing_problem_reason,
    normalize_optional_text,
)


def test_missing_values_normalize_to_real_none():
    for value in (None, "", " none ", "N/A", "unknown.", "not available"):
        assert normalize_optional_text(value) is None


def test_missing_problem_reason_is_stable():
    assert missing_problem_reason(None) == "missing_problem_statement"
    assert missing_problem_reason("A problem") is None

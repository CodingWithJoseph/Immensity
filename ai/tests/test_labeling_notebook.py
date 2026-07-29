import json
from pathlib import Path

import pytest


ROOT = Path(__file__).resolve().parents[1]
NOTEBOOK = ROOT / "notebook" / "problem_labeler.ipynb"


def _notebook():
    return json.loads(NOTEBOOK.read_text(encoding="utf-8"))


def test_only_current_problem_labeler_is_tracked():
    notebooks = sorted((ROOT / "notebook").glob("*.ipynb"))
    assert notebooks == [NOTEBOOK]

    source = "\n".join(
        "".join(cell.get("source", []))
        for cell in _notebook()["cells"]
    )
    for required in (
        "real_problem",
        "software_addressable",
        "problem_statement",
        "label_status",
        "cluster_items",
    ):
        assert required in source
    for retired in (
        "opportunity_type",
        "solution_angle",
        "filter1_problem_pain",
        "filter2_business_meets_trend",
        "cluster_signals",
    ):
        assert retired not in source


def test_labeler_code_cells_are_valid_python():
    notebook = _notebook()
    assert notebook["nbformat"] == 4
    for index, cell in enumerate(notebook["cells"]):
        if cell.get("cell_type") == "code":
            compile(
                "".join(cell.get("source", [])),
                f"{NOTEBOOK.name}:cell-{index}",
                "exec",
            )


def test_label_contract_requires_a_statement_only_for_qualified_problems():
    notebook = _notebook()
    contract_source = next(
        "".join(cell["source"])
        for cell in notebook["cells"]
        if "".join(cell.get("source", [])).startswith("# Label contract")
    )
    namespace = {}
    exec(contract_source, namespace)

    qualified = {
        "real_problem": "yes",
        "software_addressable": "yes",
        "problem_statement": "Teams repeatedly re-key invoice data.",
        "label_status": "labeled",
    }
    namespace["validate_label"](qualified)
    assert namespace["expected_outcome"](qualified) == ("pass", None)

    missing_statement = {**qualified, "problem_statement": ""}
    with pytest.raises(ValueError, match="requires a problem statement"):
        namespace["validate_label"](missing_statement)

    non_problem = {
        **qualified,
        "real_problem": "no",
        "software_addressable": "not_applicable",
        "problem_statement": "",
    }
    namespace["validate_label"](non_problem)
    assert namespace["expected_outcome"](non_problem) == (
        "reject",
        "not_a_real_problem",
    )

"""Extract one grounded problem statement from a qualified source post."""

from __future__ import annotations

import logging
from typing import Any

from classifier.qwen_json import QwenJsonCaller
from problemfinder.pipeline.content_gate import (
    missing_problem_reason,
    normalize_optional_text,
)
from util.prompts import QWEN_FINAL_CLASSIFICATION_PROMPT

logger = logging.getLogger(__name__)

_PARSE_FAILURE = "parse_failure"


def parse_final_classification(raw: str | None) -> dict[str, Any]:
    """Normalize model output and require one non-placeholder problem."""
    obj = QwenJsonCaller._extract_json(raw)
    if not isinstance(obj, dict):
        return {
            "error_state": _PARSE_FAILURE,
            "reason": _PARSE_FAILURE,
            "raw_output": raw,
        }

    problem_statement = normalize_optional_text(obj.get("problem_statement"))
    rejection_reason = missing_problem_reason(problem_statement)
    structured: dict[str, Any] = {
        "problem_statement": problem_statement,
        "decision": "reject" if rejection_reason else "pass",
    }
    structured["rejection_reason"] = rejection_reason
    return {"error_state": None, "raw_output": raw, "structured": structured}


class FinalClassifier(QwenJsonCaller):
    """One problem-extraction call followed by deterministic validation."""

    def __init__(self, model, tokenizer=None, max_new_tokens: int = 256):
        super().__init__(model, tokenizer, max_new_tokens=max_new_tokens)

    def run(self, title: str, body: str) -> dict[str, Any]:
        raw = None
        try:
            raw = self._generate(
                QWEN_FINAL_CLASSIFICATION_PROMPT,
                title if isinstance(title, str) else "",
                body if isinstance(body, str) else "",
            )
        except Exception:
            logger.exception("final classifier generation failed")
            return {
                "error_state": _PARSE_FAILURE,
                "reason": _PARSE_FAILURE,
                "raw_output": raw,
            }
        return parse_final_classification(raw)

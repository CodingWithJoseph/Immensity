"""A conservative JSON filter call used by the two qualification checks."""

from __future__ import annotations

import logging
import re

from classifier.qwen_json import QwenJsonCaller

logger = logging.getLogger(__name__)

_PARSE_FAILURE = "parse_failure"
_RESULT_RE = re.compile(r'["\']result["\']\s*:\s*["\'](?P<result>yes|no)["\']', re.IGNORECASE)


class FilterCall(QwenJsonCaller):
    """Binary filter call parametrized by its prompt."""

    def __init__(
        self,
        model,
        tokenizer=None,
        system_prompt: str = "",
        valid_results: tuple[str, ...] = ("yes", "no"),
        max_new_tokens: int = 128,
    ):
        super().__init__(model, tokenizer, max_new_tokens=max_new_tokens)
        self.system_prompt = system_prompt
        self.valid_results = tuple(valid_results)

    def _failure(self, raw_output: str | None = None, error_message: str | None = None) -> dict:
        return {
            "result": "no",
            "flagged": True,
            "parse_warning": False,
            "error_state": _PARSE_FAILURE,
            "error_message": error_message or "Filter output did not contain an extractable result.",
            "raw_output": raw_output,
        }

    def run(self, title: str, body: str) -> dict:
        """Return a conservative parsed result for one post; never raises."""
        title = title if isinstance(title, str) else ""
        body = body if isinstance(body, str) else ""
        try:
            raw = self._generate(self.system_prompt, title, body)
            obj = self._extract_json(raw)
        except Exception as error:  # noqa: BLE001 - return a structured failure
            logger.exception("filter call generation failed")
            return self._failure(error_message=f"{type(error).__name__}: {error}")

        if not isinstance(obj, dict) or "result" not in obj:
            recovered = self._recover_malformed(raw)
            if recovered is not None:
                logger.warning("filter call recovered explicit result from malformed output")
                return recovered
            logger.warning(
                "filter call parse failure; raw=%r; failing conservatively",
                raw[:300] if raw else None,
            )
            return self._failure(raw)

        result = str(obj.get("result", "")).strip().lower()
        if result not in self.valid_results:
            logger.warning(
                "filter call invalid result %r; raw=%r; failing conservatively",
                result,
                raw[:300] if raw else None,
            )
            return self._failure(raw, f"Invalid filter result: {result or '<empty>'}")

        return {
            "result": result,
            "flagged": False,
            "parse_warning": False,
            "error_state": None,
            "error_message": None,
            "raw_output": raw,
        }

    def _recover_malformed(self, raw: str) -> dict | None:
        result_match = _RESULT_RE.search(raw or "")
        if not result_match:
            return None
        result = result_match.group("result").lower()
        if result not in self.valid_results:
            return None
        return {
            "result": result,
            "flagged": True,
            "parse_warning": True,
            "error_state": None,
            "error_message": "Recovered explicit result from malformed filter output.",
            "raw_output": raw,
        }

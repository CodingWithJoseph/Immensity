"""Minimal local stage audit capture for conveyor rows."""

from __future__ import annotations

import json
from typing import Any

RAW_JSON_MERGE = "raw_json = COALESCE(raw_json, '{}'::jsonb) || %s::jsonb"


def result_patch(step: str, decision: Any) -> str:
    return json.dumps({f"{step}_result": {"decision": decision}}, default=str)


def error_patch(step: str, message: str) -> str:
    return json.dumps({f"{step}_error": message}, default=str)

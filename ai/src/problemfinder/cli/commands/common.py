"""Shared CLI behavior for intentionally unfinished commands."""

import sys


def unavailable(message: str) -> int:
    print(f"Not implemented: {message}", file=sys.stderr)
    return 2

"""Small text helpers used by model response parsing."""

import re


def strip_think(text: str) -> str:
    """Remove Qwen reasoning blocks from a response before JSON parsing."""
    text = re.sub(r"<think>.*?</think>", "", text or "", flags=re.DOTALL)
    if "</think>" in text:
        text = text.split("</think>")[-1]
    return text.strip()

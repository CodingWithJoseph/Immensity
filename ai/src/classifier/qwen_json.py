"""Shared Qwen JSON-call base for filtering and classification.

Every model call is a
single Qwen generation that must return one minified JSON object. This base owns
the one thing they all share — the generation parameters — so they can never
drift apart. These are the official Qwen3.5 non-thinking "general tasks"
sampling defaults (model card -> Best Practices):

    do_sample=True, temperature=0.7, top_p=0.8, top_k=20, min_p=0.0,
    repetition_penalty=1.0, max_new_tokens=512

The chat prompt is built WITHOUT chat_template_kwargs / enable_thinking (per the
confirmed-working config); any <think> block that leaks through is stripped
defensively before parsing.
"""
from __future__ import annotations

import json
import re

from util.helpers import strip_think

# Official Qwen3.5 non-thinking "general tasks" sampling params (model card ->
# Best Practices), shared by all calls. max_new_tokens is applied per call
# (see _generate) so it can be overridden without touching the sampling config.
#
# NOTE: the model card also lists presence_penalty=1.5, but that is a
# vLLM/OpenAI-API-only sampling parameter — it is NOT a valid argument to
# transformers' model.generate() (it would be silently ignored), so it is
# deliberately omitted here. It would only apply on a future vLLM serving path.
_GEN_KWARGS = dict(
    do_sample=True,
    temperature=0.7,
    top_p=0.8,
    top_k=20,
    min_p=0.0,
    repetition_penalty=1.0,
)

_JSON_RE = re.compile(r"\{.*}", re.DOTALL)


class QwenJsonCaller:
    """Base for a single Qwen call that returns one JSON object."""

    def __init__(self, model, tokenizer=None, max_new_tokens: int = 512):
        # ``model`` is either the shared (AutoModelForCausalLM, AutoTokenizer)
        # tuple built by shared.qwen_runtime, or the model with ``tokenizer``
        # passed separately. Either way no extra VRAM is allocated here.
        if tokenizer is None and isinstance(model, tuple):
            self.model, self.tokenizer = model
        else:
            self.model, self.tokenizer = model, tokenizer
        self.max_new_tokens = max_new_tokens

    # ------------------------------------------------------------------ #
    # generation
    # ------------------------------------------------------------------ #
    def _generate(self, system_prompt: str, title: str, body: str) -> str:
        """Sample the model's raw response text for one (system, post) pair."""
        import torch

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Title: {title}\nBody: {body}"},
        ]
        # No chat_template_kwargs / enable_thinking — confirmed-working config.
        prompt = self.tokenizer.apply_chat_template(
            messages, tokenize=False, add_generation_prompt=True, enable_thinking=False,
        )
        inputs = self.tokenizer(prompt, return_tensors="pt").to(self.model.device)
        with torch.no_grad():
            outputs = self.model.generate(
                **inputs, max_new_tokens=self.max_new_tokens, **_GEN_KWARGS,
            )
        generated = outputs[0, inputs["input_ids"].shape[1]:]
        text = self.tokenizer.decode(generated, skip_special_tokens=True).strip()
        return strip_think(text)

    # ------------------------------------------------------------------ #
    # parsing helpers
    # ------------------------------------------------------------------ #
    @staticmethod
    def _extract_json(text: str) -> dict | None:
        match = _JSON_RE.search(text or "")
        if not match:
            return None
        try:
            obj = json.loads(match.group(0))
        except (json.JSONDecodeError, TypeError):
            return None
        return obj if isinstance(obj, dict) else None

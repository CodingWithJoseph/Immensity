"""Qwen model lifecycle for standalone local workers."""

from __future__ import annotations

import gc
import os
from pathlib import Path


def load_qwen(model_id: str) -> tuple:
    """Load the configured Qwen classifier."""
    import torch
    from huggingface_hub import login
    from transformers import AutoModelForCausalLM, AutoTokenizer, logging as transformers_logging

    root = Path(__file__).resolve().parents[3]
    os.environ["HF_HOME"] = str(root / "models")
    if os.getenv("HF_TOKEN"):
        login(token=os.getenv("HF_TOKEN"))
    transformers_logging.set_verbosity_error()
    print(f"\nLoading Qwen via transformers: {model_id}")
    tokenizer = AutoTokenizer.from_pretrained(model_id)
    model = AutoModelForCausalLM.from_pretrained(
        model_id,
        torch_dtype=torch.bfloat16,
        device_map="cuda",
    )
    model.eval()
    print("Qwen loaded.\n")
    return model, tokenizer


def unload_qwen(llm) -> None:
    """Free Qwen from VRAM."""
    import torch

    model, tokenizer = llm  # noqa: F841
    del model, tokenizer, llm
    gc.collect()
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
    print("Qwen freed from VRAM.")

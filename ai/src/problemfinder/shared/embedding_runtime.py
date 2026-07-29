"""Synchronous OpenAI embedding client lifecycle."""

from __future__ import annotations

import os
from typing import Any


class OpenAIEmbeddingClient:
    """Synchronous single-text embedding via the OpenAI embeddings endpoint."""

    def __init__(self, client: Any, model_id: str):
        self.client = client
        self.model_id = model_id

    def embed(self, text: str) -> list[float]:
        response = self.client.embeddings.create(model=self.model_id, input=text)
        return list(response.data[0].embedding)


def load_embedder(model_id: str) -> OpenAIEmbeddingClient:
    """Build the synchronous OpenAI embedding client used by the worker."""
    from openai import OpenAI

    print(f"\nLoading embedder via OpenAI: {model_id}")
    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    print("Embedder loaded.\n")
    return OpenAIEmbeddingClient(client, model_id)


def unload_embedder(_client: Any) -> None:
    """No GPU/VRAM to free for the API client; kept for worker symmetry."""
    print("Embedder released.")

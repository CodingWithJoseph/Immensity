# ============================================================
# constants.py
# Pipeline model/version config plus compatibility exports.
# ============================================================

from problemfinder.sources import REDDIT_SOURCES, enabled_targets

# Backward-compatible export for older callers. The canonical source registry
# now lives in problemfinder.sources and intentionally contains only curated,
# high-signal Reddit communities.
SUBREDDITS = [target.community for target in enabled_targets(REDDIT_SOURCES)]

# ============================================================
# QWEN MODEL CONFIG
# ============================================================
CLASSIFIER_CONFIG = {
    "qwen_model_id": "Qwen/Qwen3.5-9B",
}

# The embedding worker uses the OpenAI embeddings endpoint synchronously.
EMBEDDING_CONFIG = {
    "model_id": "text-embedding-3-large",
    "dimensions": 3072,
}

# ============================================================
# PIPELINE VERSION
# ============================================================
PIPELINE_VERSION = "v2"

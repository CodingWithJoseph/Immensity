"""Curated high-signal source registry for Problem Finder ingestion.

Every static source belongs to a domain-oriented source group.  The groups are
shared across platforms so downstream analysis can compare recurring problems
inside related ecosystems instead of treating every community as unrelated.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable


@dataclass(frozen=True)
class SourceTarget:
    platform: str
    source_type: str
    community: str
    source_group: str
    priority: int = 1
    enabled: bool = True


# Curated Reddit communities are intentionally biased toward practitioner,
# operator, builder, and business communities with a higher expected rate of
# software-addressable problems. Broad entertainment/gaming/rant communities
# are deliberately excluded from this static set.
REDDIT_SOURCES: tuple[SourceTarget, ...] = (
    # SaaS / business operators
    SourceTarget("reddit", "subreddit", "SaaS", "saas_business", 3),
    SourceTarget("reddit", "subreddit", "startups", "saas_business", 3),
    SourceTarget("reddit", "subreddit", "Entrepreneur", "saas_business", 3),
    SourceTarget("reddit", "subreddit", "smallbusiness", "saas_business", 3),
    SourceTarget("reddit", "subreddit", "SideProject", "saas_business", 2),
    SourceTarget("reddit", "subreddit", "freelance", "saas_business", 2),
    # Developer tools / infrastructure
    SourceTarget("reddit", "subreddit", "webdev", "developer_tools", 3),
    SourceTarget("reddit", "subreddit", "devops", "developer_tools", 3),
    SourceTarget("reddit", "subreddit", "ExperiencedDevs", "developer_tools", 3),
    SourceTarget("reddit", "subreddit", "sysadmin", "developer_tools", 3),
    SourceTarget("reddit", "subreddit", "selfhosted", "self_hosted", 3),
    SourceTarget("reddit", "subreddit", "homelab", "self_hosted", 2),
    # Database / backend
    SourceTarget("reddit", "subreddit", "PostgreSQL", "database_backend", 3),
    SourceTarget("reddit", "subreddit", "Supabase", "database_backend", 3),
    # AI / ML builders
    SourceTarget("reddit", "subreddit", "LocalLLaMA", "ai_ml", 3),
    SourceTarget("reddit", "subreddit", "MachineLearning", "ai_ml", 2),
    # Automation / productivity systems
    SourceTarget("reddit", "subreddit", "n8n", "automation", 3),
    SourceTarget("reddit", "subreddit", "Notion", "automation", 2),
    # Commerce / growth
    SourceTarget("reddit", "subreddit", "ecommerce", "ecommerce", 3),
    SourceTarget("reddit", "subreddit", "shopify", "ecommerce", 3),
    SourceTarget("reddit", "subreddit", "amazonseller", "ecommerce", 2),
    SourceTarget("reddit", "subreddit", "marketing", "marketing_sales", 2),
    SourceTarget("reddit", "subreddit", "SEO", "marketing_sales", 2),
    SourceTarget("reddit", "subreddit", "PPC", "marketing_sales", 2),
    SourceTarget("reddit", "subreddit", "sales", "marketing_sales", 2),
    # Workforce / recruiting operations
    SourceTarget("reddit", "subreddit", "humanresources", "recruiting_hr", 3),
    SourceTarget("reddit", "subreddit", "recruiting", "recruiting_hr", 2),
    # Finance / operations
    SourceTarget("reddit", "subreddit", "Accounting", "finance_ops", 3),
    SourceTarget("reddit", "subreddit", "Bookkeeping", "finance_ops", 3),
    # Industry operators
    SourceTarget("reddit", "subreddit", "restaurantowners", "hospitality_ops", 3),
    SourceTarget("reddit", "subreddit", "propertymanagement", "real_estate_ops", 3),
)


GITHUB_SOURCES: tuple[SourceTarget, ...] = (
    # Database / backend platforms
    SourceTarget("github", "repository", "supabase/supabase", "database_backend", 3),
    SourceTarget("github", "repository", "neondatabase/neon", "database_backend", 3),
    SourceTarget("github", "repository", "appwrite/appwrite", "database_backend", 3),
    SourceTarget("github", "repository", "pocketbase/pocketbase", "database_backend", 3),
    SourceTarget("github", "repository", "postgres/postgres", "database_backend", 2),
    SourceTarget("github", "repository", "nocodb/nocodb", "database_backend", 2),
    SourceTarget("github", "repository", "directus/directus", "database_backend", 2),
    SourceTarget("github", "repository", "strapi/strapi", "database_backend", 2),
    # AI / LLM tooling
    SourceTarget("github", "repository", "langchain-ai/langchain", "ai_ml", 3),
    SourceTarget("github", "repository", "run-llama/llama_index", "ai_ml", 3),
    SourceTarget("github", "repository", "ollama/ollama", "ai_ml", 3),
    SourceTarget("github", "repository", "vllm-project/vllm", "ai_ml", 3),
    SourceTarget("github", "repository", "open-webui/open-webui", "ai_ml", 3),
    SourceTarget("github", "repository", "BerriAI/litellm", "ai_ml", 3),
    SourceTarget("github", "repository", "huggingface/transformers", "ai_ml", 2),
    # Automation / workflow
    SourceTarget("github", "repository", "n8n-io/n8n", "automation", 3),
    SourceTarget("github", "repository", "activepieces/activepieces", "automation", 3),
    SourceTarget("github", "repository", "node-red/node-red", "automation", 2),
    SourceTarget("github", "repository", "huginn/huginn", "automation", 2),
    SourceTarget("github", "repository", "apache/airflow", "automation", 2),
    SourceTarget("github", "repository", "PrefectHQ/prefect", "automation", 2),
    # Low-code / internal tools
    SourceTarget("github", "repository", "appsmithorg/appsmith", "low_code", 3),
    SourceTarget("github", "repository", "ToolJet/ToolJet", "low_code", 3),
    SourceTarget("github", "repository", "Budibase/budibase", "low_code", 3),
    SourceTarget("github", "repository", "hoppscotch/hoppscotch", "developer_tools", 2),
    # Web / developer tooling
    SourceTarget("github", "repository", "vercel/next.js", "developer_tools", 3),
    SourceTarget("github", "repository", "vitejs/vite", "developer_tools", 3),
    SourceTarget("github", "repository", "microsoft/vscode", "developer_tools", 3),
    SourceTarget("github", "repository", "pnpm/pnpm", "developer_tools", 2),
    SourceTarget("github", "repository", "npm/cli", "developer_tools", 2),
    SourceTarget("github", "repository", "denoland/deno", "developer_tools", 2),
    SourceTarget("github", "repository", "oven-sh/bun", "developer_tools", 2),
    # Data / analytics
    SourceTarget("github", "repository", "dbt-labs/dbt-core", "data_analytics", 3),
    SourceTarget("github", "repository", "dagster-io/dagster", "data_analytics", 3),
    SourceTarget("github", "repository", "grafana/grafana", "data_analytics", 3),
    SourceTarget("github", "repository", "apache/superset", "data_analytics", 2),
    # Infrastructure / self-hosting
    SourceTarget("github", "repository", "docker/compose", "self_hosted", 3),
    SourceTarget("github", "repository", "traefik/traefik", "self_hosted", 2),
    SourceTarget("github", "repository", "portainer/portainer", "self_hosted", 2),
    SourceTarget("github", "repository", "coollabsio/coolify", "self_hosted", 3),
    SourceTarget("github", "repository", "home-assistant/core", "self_hosted", 2),
    # SaaS / collaboration products
    SourceTarget("github", "repository", "mattermost/mattermost", "saas_business", 2),
    SourceTarget("github", "repository", "calcom/cal.com", "saas_business", 3),
    SourceTarget("github", "repository", "makeplane/plane", "saas_business", 3),
    SourceTarget("github", "repository", "twentyhq/twenty", "saas_business", 3),
    SourceTarget("github", "repository", "formbricks/formbricks", "saas_business", 3),
)


STACKEXCHANGE_SOURCES: tuple[SourceTarget, ...] = (
    SourceTarget("stackexchange", "question", "stackoverflow", "developer_tools", 3),
    SourceTarget("stackexchange", "question", "dba", "database_backend", 3),
    SourceTarget("stackexchange", "question", "softwareengineering", "saas_business", 2),
    SourceTarget("stackexchange", "question", "devops", "developer_tools", 3),
    SourceTarget("stackexchange", "question", "datascience", "ai_ml", 2),
    SourceTarget("stackexchange", "question", "ai", "ai_ml", 2),
)


SOURCE_GROUP_KEYWORDS: dict[str, tuple[str, ...]] = {
    "database_backend": ("database", "postgres", "sql", "supabase", "mysql", "redis", "backend", "storage"),
    "ai_ml": (" ai ", "llm", "model", "embedding", "inference", "machine learning", "agent", "rag"),
    "automation": ("automation", "workflow", "n8n", "zapier", "scheduler", "pipeline"),
    "developer_tools": ("developer", "api", "sdk", "cli", "debug", "deploy", "build", "framework", "library"),
    "self_hosted": ("self-host", "self host", "docker", "container", "server", "homelab"),
    "ecommerce": ("ecommerce", "e-commerce", "shopify", "seller", "checkout", "storefront"),
    "marketing_sales": ("marketing", "sales", "seo", "advertising", "crm", "lead generation"),
    "recruiting_hr": ("recruit", "hiring", "candidate", "human resources", " hr "),
    "finance_ops": ("accounting", "bookkeeping", "invoice", "expense", "payroll", "tax"),
    "saas_business": ("saas", "startup", "founder", "customer", "subscription", "small business"),
}


def enabled_targets(targets: Iterable[SourceTarget]) -> list[SourceTarget]:
    return [target for target in targets if target.enabled]


def source_group_for(platform: str, community: str) -> str | None:
    """Return the configured group for a static community/repository."""
    platform_key = platform.casefold()
    community_key = community.casefold()
    for target in (*REDDIT_SOURCES, *GITHUB_SOURCES, *STACKEXCHANGE_SOURCES):
        if target.platform.casefold() == platform_key and target.community.casefold() == community_key:
            return target.source_group
    return None


def infer_source_group(text: str, default: str = "general_tech") -> str:
    """Best-effort group assignment for unstructured/discovered sources."""
    haystack = f" {text.casefold()} "
    best_group = default
    best_score = 0
    for group, keywords in SOURCE_GROUP_KEYWORDS.items():
        score = sum(1 for keyword in keywords if keyword in haystack)
        if score > best_score:
            best_group = group
            best_score = score
    return best_group

"""GitHub Discussions scraper using the GraphQL API."""

from __future__ import annotations

import json
import os
from typing import Any, Callable, Iterable
from urllib.error import HTTPError
from urllib.request import Request, urlopen

from dotenv import load_dotenv

from problemfinder.persistence.local import connect_local
from problemfinder.persistence.repositories.raw_posts import RawPostRepository
from problemfinder.shared.github import normalize_github_discussion
from scraper.github_issues_scraper import configured_repositories

load_dotenv()

GRAPHQL_URL = "https://api.github.com/graphql"
DISCUSSIONS_QUERY = """
query($owner: String!, $name: String!, $first: Int!) {
  repository(owner: $owner, name: $name) {
    discussions(first: $first, orderBy: {field: UPDATED_AT, direction: DESC}) {
      nodes {
        id
        number
        title
        body
        url
        createdAt
        updatedAt
        upvoteCount
        answerChosenAt
        author { login }
        category { name }
        comments { totalCount }
      }
    }
  }
}
"""


class GitHubDiscussionsError(RuntimeError):
    pass


class GitHubGraphQLClient:
    def __init__(self, *, token: str | None = None, endpoint: str = GRAPHQL_URL, timeout: int = 30, opener: Callable[..., Any] = urlopen):
        self.token = token or os.getenv("GITHUB_TOKEN") or None
        self.endpoint = endpoint
        self.timeout = timeout
        self.opener = opener

    def discussions(self, repository: str, *, max_results: int) -> list[dict[str, Any]]:
        if not self.token:
            raise GitHubDiscussionsError("GITHUB_TOKEN is required for GitHub Discussions GraphQL requests")
        owner, name = repository.split("/", 1)
        payload = json.dumps({"query": DISCUSSIONS_QUERY, "variables": {"owner": owner, "name": name, "first": min(100, max_results)}}).encode("utf-8")
        request = Request(
            self.endpoint,
            data=payload,
            method="POST",
            headers={
                "Authorization": f"Bearer {self.token}",
                "Content-Type": "application/json",
                "User-Agent": "ProblemFinderAI",
            },
        )
        try:
            with self.opener(request, timeout=self.timeout) as response:
                result = json.loads(response.read().decode("utf-8"))
        except HTTPError as error:
            raise GitHubDiscussionsError(f"GitHub GraphQL returned HTTP {error.code} for {repository}") from error
        except (OSError, UnicodeDecodeError, json.JSONDecodeError) as error:
            raise GitHubDiscussionsError(f"GitHub GraphQL request failed for {repository}: {error}") from error
        if result.get("errors"):
            messages = "; ".join(str(item.get("message")) for item in result["errors"] if isinstance(item, dict))
            raise GitHubDiscussionsError(messages or f"GitHub GraphQL returned errors for {repository}")
        repo = ((result.get("data") or {}).get("repository") or {})
        nodes = ((repo.get("discussions") or {}).get("nodes") or [])
        return [node for node in nodes if isinstance(node, dict)][:max_results]


class GitHubDiscussionsScraper:
    def __init__(self, *, client: GitHubGraphQLClient | None = None):
        self.client = client or GitHubGraphQLClient()

    @staticmethod
    def get_repositories(overrides: Iterable[str] | None = None) -> list[str]:
        return configured_repositories(overrides)

    def scrape(self, repositories: Iterable[str], *, limit_per_repository: int = 50, max_total: int | None = None) -> tuple[list[dict[str, Any]], dict[str, Any]]:
        rows: list[dict[str, Any]] = []
        failures: dict[str, str] = {}
        succeeded = 0
        targets = list(repositories)
        for repository in targets:
            if max_total is not None and len(rows) >= max_total:
                break
            remaining = limit_per_repository if max_total is None else min(limit_per_repository, max_total - len(rows))
            try:
                discussions = self.client.discussions(repository, max_results=remaining)
                rows.extend(normalize_github_discussion(item, repository) for item in discussions)
                succeeded += 1
            except Exception as error:
                failures[repository] = f"{type(error).__name__}: {error}"
        return rows, {
            "repositories_configured": len(targets),
            "repositories_succeeded": succeeded,
            "repositories_failed": len(failures),
            "discussions_scraped": len(rows),
            "authenticated": bool(self.client.token),
            "failures": failures,
        }

    @staticmethod
    def save_to_db(rows: list[dict[str, Any]], connect_fn=connect_local) -> dict[str, Any]:
        if not rows:
            return {"rows": 0}
        with connect_fn() as connection:
            return RawPostRepository(connection).ingest(rows)

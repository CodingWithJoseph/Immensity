"""GitHub Issues scraper for the shared local source-post pipeline."""

from __future__ import annotations

import json
import math
import os
import re
from datetime import datetime, timedelta, timezone
from typing import Any, Callable, Iterable
from urllib.error import HTTPError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from dotenv import load_dotenv

from problemfinder.persistence.local import connect_local
from problemfinder.persistence.repositories.raw_posts import RawPostRepository
from problemfinder.shared.github import normalize_github_issue
from problemfinder.sources import GITHUB_SOURCES, enabled_targets

load_dotenv()

DEFAULT_REPOSITORIES = tuple(target.community for target in enabled_targets(GITHUB_SOURCES))

_REPOSITORY_PATTERN = re.compile(r"^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$")
_API_VERSION = "2022-11-28"


def parse_repositories(value: str | Iterable[str] | None) -> list[str]:
    if value is None:
        candidates: list[str] = []
    elif isinstance(value, str):
        candidates = re.split(r"[\s,]+", value)
    else:
        candidates = []
        for item in value:
            candidates.extend(re.split(r"[\s,]+", str(item)))
    repositories: list[str] = []
    seen: set[str] = set()
    for raw in candidates:
        repository = raw.strip()
        if not repository:
            continue
        if not _REPOSITORY_PATTERN.fullmatch(repository):
            raise ValueError(f"Invalid GitHub repository {repository!r}; expected owner/repository")
        normalized = repository.casefold()
        if normalized not in seen:
            seen.add(normalized)
            repositories.append(repository)
    return repositories


def configured_repositories(overrides: Iterable[str] | None = None) -> list[str]:
    if overrides:
        return parse_repositories(overrides)
    configured = parse_repositories(os.getenv("GITHUB_REPOSITORIES"))
    return configured or list(DEFAULT_REPOSITORIES)


class GitHubApiError(RuntimeError):
    pass


class GitHubApiClient:
    def __init__(self, *, token: str | None = None, base_url: str = "https://api.github.com", timeout: int = 30, opener: Callable[..., Any] = urlopen):
        self.token = token
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.opener = opener

    def _get_json(self, path: str, parameters: dict[str, object]) -> Any:
        url = f"{self.base_url}{path}?{urlencode(parameters)}"
        headers = {"Accept": "application/vnd.github+json", "X-GitHub-Api-Version": _API_VERSION, "User-Agent": "ProblemFinderAI"}
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"
        request = Request(url, headers=headers)
        try:
            with self.opener(request, timeout=self.timeout) as response:
                return json.loads(response.read().decode("utf-8"))
        except HTTPError as error:
            remaining = error.headers.get("X-RateLimit-Remaining")
            reset = error.headers.get("X-RateLimit-Reset")
            suffix = f"; remaining={remaining}; reset={reset}" if remaining is not None or reset is not None else ""
            raise GitHubApiError(f"GitHub API returned HTTP {error.code} for {path}{suffix}") from error
        except (OSError, UnicodeDecodeError, json.JSONDecodeError) as error:
            raise GitHubApiError(f"GitHub API request failed for {path}: {error}") from error

    def list_issues(self, repository: str, *, since: datetime, max_results: int) -> list[dict[str, Any]]:
        if max_results <= 0:
            return []
        per_page = min(100, max_results)
        max_pages = math.ceil(max_results / per_page)
        issues: list[dict[str, Any]] = []
        for page in range(1, max_pages + 1):
            response = self._get_json(
                f"/repos/{repository}/issues",
                {"state": "all", "since": since.astimezone(timezone.utc).isoformat(), "sort": "updated", "direction": "desc", "per_page": per_page, "page": page},
            )
            if not isinstance(response, list):
                raise GitHubApiError(f"GitHub API returned an unexpected response for {repository}")
            for item in response:
                if isinstance(item, dict) and "pull_request" not in item:
                    issues.append(item)
                    if len(issues) >= max_results:
                        return issues
            if len(response) < per_page:
                break
        return issues


class GitHubIssuesScraper:
    def __init__(self, *, client: GitHubApiClient | None = None, now: Callable[[], datetime] | None = None):
        self.client = client or GitHubApiClient(token=os.getenv("GITHUB_TOKEN") or None, base_url=os.getenv("GITHUB_API_URL") or "https://api.github.com")
        self.now = now or (lambda: datetime.now(timezone.utc))

    @staticmethod
    def get_repositories(overrides: Iterable[str] | None = None) -> list[str]:
        return configured_repositories(overrides)

    def scrape(self, repositories: Iterable[str], *, lookback_days: int = 90, limit_per_repository: int = 200, max_total: int | None = None) -> tuple[list[dict[str, Any]], dict[str, Any]]:
        since = self.now() - timedelta(days=lookback_days)
        rows: list[dict[str, Any]] = []
        failures: dict[str, str] = {}
        succeeded = 0
        targets = list(repositories)
        for repository in targets:
            try:
                remaining = limit_per_repository if max_total is None else max(0, min(limit_per_repository, max_total - len(rows)))
                if remaining == 0:
                    break
                issues = self.client.list_issues(repository, since=since, max_results=remaining)
                rows.extend(normalize_github_issue(issue, repository) for issue in issues)
                succeeded += 1
            except Exception as error:
                failures[repository] = f"{type(error).__name__}: {error}"
            if max_total is not None and len(rows) >= max_total:
                break
        report = {
            "repositories_configured": len(targets),
            "repositories_succeeded": succeeded,
            "repositories_failed": len(failures),
            "issues_scraped": len(rows),
            "authenticated": bool(self.client.token),
            "failures": failures,
        }
        return rows, report

    @staticmethod
    def save_to_db(rows: list[dict[str, Any]], connect_fn=connect_local) -> dict[str, Any]:
        if not rows:
            return {"rows": 0}
        with connect_fn() as connection:
            return RawPostRepository(connection).ingest(rows)

import json
from datetime import datetime, timezone
from urllib.parse import parse_qs, urlparse

import pytest

from problemfinder.persistence.repositories.raw_posts import _to_cluster_item
from problemfinder.shared.github import normalize_github_issue
from scraper.github_issues_scraper import (
    DEFAULT_REPOSITORIES,
    GitHubApiClient,
    GitHubApiError,
    GitHubIssuesScraper,
    configured_repositories,
    parse_repositories,
)


def _issue(identifier=1, **overrides):
    issue = {
        "id": identifier,
        "node_id": f"I_{identifier}",
        "number": identifier,
        "title": "Manual reconciliation is error-prone",
        "body": "Our team copies invoice data between tools every morning.",
        "html_url": f"https://github.com/example/project/issues/{identifier}",
        "created_at": "2026-06-01T12:00:00Z",
        "updated_at": "2026-06-02T12:00:00Z",
        "closed_at": None,
        "state": "open",
        "state_reason": None,
        "locked": False,
        "comments": 7,
        "labels": [{"name": "bug"}, {"name": "workflow"}],
        "user": {"login": "octocat", "type": "User"},
        "reactions": {"url": "ignored", "total_count": 5, "+1": 4},
        "large_unneeded_field": {"not": "stored"},
    }
    issue.update(overrides)
    return issue


def test_github_issue_normalizes_to_shared_ingest_contract():
    row = normalize_github_issue(_issue(), "example/project")

    assert row["source"] == "github"
    assert row["source_post_id"] == "I_1"
    assert row["source_community_id"] == "example/project"
    assert row["author"] == "octocat"
    assert row["score"] == 5
    assert row["num_comments"] == 7
    assert row["payload"]["labels"] == ["bug", "workflow"]
    assert "large_unneeded_field" not in row["payload"]
    assert row["content_hash"]
    assert _to_cluster_item(row)["community"] == "example/project"


def test_github_issue_requires_a_stable_source_id():
    with pytest.raises(ValueError, match="missing node_id/id"):
        normalize_github_issue(_issue(id=None, node_id=None), "example/project")


def test_repository_configuration_validates_and_deduplicates(monkeypatch):
    assert parse_repositories("Owner/Repo,owner/repo other/project") == [
        "Owner/Repo",
        "other/project",
    ]
    with pytest.raises(ValueError, match="owner/repository"):
        parse_repositories("missing-repository")

    monkeypatch.delenv("GITHUB_REPOSITORIES", raising=False)
    assert configured_repositories() == list(DEFAULT_REPOSITORIES)
    monkeypatch.setenv("GITHUB_REPOSITORIES", "one/repo,two/repo")
    assert configured_repositories() == ["one/repo", "two/repo"]
    assert configured_repositories(["override/repo"]) == ["override/repo"]


class FakeResponse:
    def __init__(self, payload):
        self.payload = payload

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return False

    def read(self):
        return json.dumps(self.payload).encode("utf-8")


def test_api_client_paginates_filters_pull_requests_and_sets_headers():
    calls = []
    first_page = [_issue(identifier) for identifier in range(1, 100)]
    first_page.append(_issue(100, pull_request={"url": "pr"}))
    second_page = [_issue(101)]
    pages = [first_page, second_page]

    def opener(request, timeout):
        calls.append((request, timeout))
        return FakeResponse(pages.pop(0))

    client = GitHubApiClient(token="secret", opener=opener)
    issues = client.list_issues(
        "example/project",
        since=datetime(2026, 5, 1, tzinfo=timezone.utc),
        max_results=150,
    )

    assert len(issues) == 100
    assert len(calls) == 2
    first_request, timeout = calls[0]
    query = parse_qs(urlparse(first_request.full_url).query)
    assert query["state"] == ["all"]
    assert query["sort"] == ["updated"]
    assert query["direction"] == ["desc"]
    assert query["per_page"] == ["100"]
    assert query["page"] == ["1"]
    assert query["since"] == ["2026-05-01T00:00:00+00:00"]
    assert first_request.get_header("Authorization") == "Bearer secret"
    assert first_request.get_header("X-github-api-version") == "2022-11-28"
    assert timeout == 30


def test_scraper_continues_when_one_repository_fails():
    class Client:
        def list_issues(self, repository, **_kwargs):
            if repository == "bad/repo":
                raise GitHubApiError("unavailable")
            return [_issue()]

    scraper = GitHubIssuesScraper(
        client=Client(),
        now=lambda: datetime(2026, 7, 1, tzinfo=timezone.utc),
    )
    rows, report = scraper.scrape(["good/repo", "bad/repo"])

    assert [row["source_community_id"] for row in rows] == ["good/repo"]
    assert report["repositories_targeted"] == 2
    assert report["repositories_succeeded"] == 1
    assert report["repositories_failed"] == 1
    assert "bad/repo" in report["failures"]

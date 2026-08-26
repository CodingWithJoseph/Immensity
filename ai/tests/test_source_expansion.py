from problemfinder.pipeline.cpu_ingest_clean import process_rows
from problemfinder.shared.github import normalize_github_discussion, normalize_github_issue
from problemfinder.shared.public_sources import (
    normalize_hackernews_story,
    normalize_stackexchange_question,
)
from problemfinder.sources import (
    GITHUB_SOURCES,
    REDDIT_SOURCES,
    STACKEXCHANGE_SOURCES,
    source_group_for,
)
from scraper.github_discussions_scraper import GitHubDiscussionsScraper, GitHubGraphQLClient


def test_reddit_registry_prefers_high_signal_communities():
    communities = {target.community.casefold() for target in REDDIT_SOURCES}
    assert "saas" in communities
    assert "minecraft" not in communities
    assert "gaming" not in communities
    assert "mildlyinfuriating" not in communities
    assert all(target.source_group for target in REDDIT_SOURCES)


def test_github_registry_has_breadth_and_groups():
    assert 40 <= len(GITHUB_SOURCES) <= 60
    assert all(target.source_group for target in GITHUB_SOURCES)
    assert source_group_for("github", "supabase/supabase") == "database_backend"
    assert source_group_for("github", "langchain-ai/langchain") == "ai_ml"
    assert source_group_for("github", "n8n-io/n8n") == "automation"


def test_stackexchange_registry_is_grouped():
    sites = {target.community for target in STACKEXCHANGE_SOURCES}
    assert {"stackoverflow", "dba", "softwareengineering", "devops"} <= sites
    assert source_group_for("stackexchange", "dba") == "database_backend"


def test_github_issue_identity_remains_backward_compatible():
    issue = {
        "node_id": "I_kwTEST",
        "title": "Database connection timeout",
        "body": "Connections repeatedly time out under a small burst of traffic.",
        "created_at": "2026-08-25T00:00:00Z",
        "user": {"login": "builder"},
        "reactions": {"total_count": 2},
        "comments": 3,
        "html_url": "https://github.com/supabase/supabase/issues/1",
    }
    row = normalize_github_issue(issue, "supabase/supabase")
    assert row["source_post_id"] == "I_kwTEST"
    assert row["source_type"] == "issue"
    assert row["source_group"] == "database_backend"


def test_github_discussion_has_distinct_identity_namespace():
    discussion = {
        "id": "D_kwTEST",
        "number": 7,
        "title": "How are people handling connection pooling?",
        "body": "We keep hitting connection limits and would like to compare approaches.",
        "createdAt": "2026-08-25T00:00:00Z",
        "author": {"login": "builder"},
        "comments": {"totalCount": 5},
        "upvoteCount": 4,
        "url": "https://github.com/supabase/supabase/discussions/7",
        "category": {"name": "Q&A"},
    }
    row = normalize_github_discussion(discussion, "supabase/supabase")
    assert row["source_post_id"] == "discussion:D_kwTEST"
    assert row["source_type"] == "discussion"
    assert row["source_group"] == "database_backend"


def test_stackexchange_normalization_preserves_site_group():
    question = {
        "question_id": 123,
        "title": "Postgres connections are exhausted",
        "body": "<p>Our service repeatedly exhausts its Postgres connection pool during normal traffic.</p>",
        "creation_date": 1787616000,
        "owner": {"display_name": "operator"},
        "link": "https://dba.stackexchange.com/questions/123/example",
        "score": 5,
        "answer_count": 2,
        "view_count": 100,
        "tags": ["postgresql"],
    }
    row = normalize_stackexchange_question(question, "dba")
    assert row["source"] == "stackexchange"
    assert row["source_type"] == "question"
    assert row["source_group"] == "database_backend"
    assert row["source_post_id"] == "dba:123"
    assert "<p>" not in row["body"]


def test_hackernews_normalization_identifies_ask_hn_and_group():
    item = {
        "id": 42,
        "type": "story",
        "title": "Ask HN: How do you handle SaaS customer support overload?",
        "text": "Our small business is losing hours every week triaging customer requests.",
        "time": 1787616000,
        "by": "founder",
        "score": 20,
        "descendants": 15,
    }
    row = normalize_hackernews_story(item)
    assert row["source_type"] == "ask_hn"
    assert row["source_group"] == "saas_business"


def test_missing_github_token_blocks_discussions_once():
    scraper = GitHubDiscussionsScraper(client=GitHubGraphQLClient(token=None))
    scraper.client.token = None
    rows, report = scraper.scrape(["supabase/supabase", "n8n-io/n8n"], max_total=10)
    assert rows == []
    assert report["blocked_reason"] == "missing_github_token"
    assert report["repositories_failed"] == 0


def test_new_source_rows_fit_existing_cleaning_contract():
    rows = [
        {
            "id": "row-1",
            "source": "stackexchange",
            "source_post_id": "dba:123",
            "title": "Postgres connections are exhausted",
            "body": "Our production application repeatedly exhausts the Postgres connection pool during ordinary traffic and forces requests to wait or fail.",
            "author": "operator",
            "payload": {},
        },
        {
            "id": "row-2",
            "source": "hackernews",
            "source_post_id": "42",
            "title": "Ask HN: Better way to triage customer requests?",
            "body": "Our team spends several hours each day manually sorting incoming customer requests, assigning owners, and checking whether anyone followed up.",
            "author": "founder",
            "payload": {},
        },
    ]

    class PassCleaner:
        def clean_basic(self, records):
            return records

        def clean_expensive(self, records):
            return records

    class PassReadability:
        @staticmethod
        def check(_title, _body):
            return {"pass": True, "reason": None}

    outcomes, report = process_rows(rows, cleaner=PassCleaner(), readability=PassReadability())
    assert report["filter_pending"] == 2
    assert {outcome["stage"] for outcome in outcomes} == {"filter_pending"}

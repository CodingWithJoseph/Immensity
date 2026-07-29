"""Scrape configured sources into the shared local pipeline."""

from __future__ import annotations

import argparse
import json

from ...persistence.local import connect_local


def _positive_int(value: str) -> int:
    parsed = int(value)
    if parsed <= 0:
        raise argparse.ArgumentTypeError("must be greater than zero")
    return parsed


def register(subparsers) -> None:
    parser = subparsers.add_parser(
        "scrape",
        help="Scrape GitHub Issues and Reddit into local cluster_items",
    )
    parser.add_argument(
        "--source",
        choices=("all", "github", "reddit"),
        default="all",
        help="Source to scrape (default: all)",
    )
    parser.add_argument("--limit-per-feed", type=_positive_int, default=100)
    parser.add_argument("--dynamic-limit", type=_positive_int, default=50)
    parser.add_argument(
        "--github-repository",
        action="append",
        help="GitHub owner/repository target; repeat to override configured defaults",
    )
    parser.add_argument("--github-lookback-days", type=_positive_int, default=90)
    parser.add_argument(
        "--github-limit-per-repository",
        type=_positive_int,
        default=200,
    )
    parser.set_defaults(handler=handle_scrape)


def handle_scrape(
    args,
    connect_fn=connect_local,
    github_scraper_factory=None,
    reddit_scraper_factory=None,
) -> int:
    results: dict[str, dict] = {}
    total_rows = 0

    if args.source in {"all", "github"}:
        if github_scraper_factory is None:
            from scraper.github_issues_scraper import GitHubIssuesScraper

            github_scraper_factory = GitHubIssuesScraper
        github = github_scraper_factory()
        repositories = github.get_repositories(args.github_repository)
        rows, report = github.scrape(
            repositories,
            lookback_days=args.github_lookback_days,
            limit_per_repository=args.github_limit_per_repository,
        )
        write_result = github.save_to_db(rows, connect_fn=connect_fn)
        rows_written = int(write_result.get("rows", 0))
        results["github"] = {**report, "rows_written": rows_written}
        total_rows += rows_written

    if args.source in {"all", "reddit"}:
        if reddit_scraper_factory is None:
            # Imported lazily so GitHub-only runs do not require PRAW setup.
            from scraper.reddit_scraper import RedditScraper

            reddit_scraper_factory = RedditScraper
        reddit = reddit_scraper_factory()
        subreddits = reddit.get_subreddits(dynamic_limit=args.dynamic_limit)
        posts = reddit.scrape(subreddits, limit_per_feed=args.limit_per_feed)
        write_result = reddit.save_to_db(posts, connect_fn=connect_fn)
        rows_written = int(write_result.get("rows", 0))
        results["reddit"] = {
            "subreddits_targeted": len(subreddits),
            "posts_scraped": len(posts),
            "rows_written": rows_written,
        }
        total_rows += rows_written

    print(json.dumps({"sources": results, "rows": total_rows}, indent=2))
    return 0

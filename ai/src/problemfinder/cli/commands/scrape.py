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


def _nonnegative_int(value: str) -> int:
    parsed = int(value)
    if parsed < 0:
        raise argparse.ArgumentTypeError("must be zero or greater")
    return parsed


def register(subparsers) -> None:
    parser = subparsers.add_parser(
        "scrape",
        help="Scrape Reddit, GitHub, Stack Exchange, and Hacker News into local cluster_items",
    )
    parser.add_argument(
        "--source",
        choices=("all", "github", "github-issues", "github-discussions", "reddit", "stackexchange", "hackernews"),
        default="all",
        help="Source to scrape (default: all)",
    )

    # Reddit
    parser.add_argument("--limit-per-feed", type=_positive_int, default=100)
    parser.add_argument("--dynamic-limit", type=_nonnegative_int, default=0)
    parser.add_argument("--reddit-subreddit", action="append", help="Target one subreddit; repeat to override curated defaults")
    parser.add_argument("--reddit-feed", action="append", choices=("hot", "new", "top", "rising", "controversial"), help="Target one Reddit feed; repeat as needed")
    parser.add_argument("--reddit-max-posts", type=_positive_int)

    # GitHub Issues + Discussions
    parser.add_argument("--github-repository", action="append", help="GitHub owner/repository target; repeat to override grouped defaults")
    parser.add_argument("--github-lookback-days", type=_positive_int, default=90)
    parser.add_argument("--github-limit-per-repository", type=_positive_int, default=200)
    parser.add_argument("--github-max-items", type=_positive_int)
    parser.add_argument("--github-discussion-limit-per-repository", type=_positive_int, default=50)
    parser.add_argument("--github-discussion-max-items", type=_positive_int)

    # Stack Exchange
    parser.add_argument("--stackexchange-site", action="append", help="Stack Exchange site slug; repeat to override grouped defaults")
    parser.add_argument("--stackexchange-lookback-days", type=_positive_int, default=30)
    parser.add_argument("--stackexchange-limit-per-site", type=_positive_int, default=100)
    parser.add_argument("--stackexchange-max-items", type=_positive_int)

    # Hacker News
    parser.add_argument("--hackernews-feed", action="append", choices=("askstories", "showstories", "newstories"), help="HN feed; repeat as needed")
    parser.add_argument("--hackernews-limit-per-feed", type=_positive_int, default=100)
    parser.add_argument("--hackernews-max-items", type=_positive_int)
    parser.add_argument("--hackernews-min-comments", type=_nonnegative_int, default=0)
    parser.set_defaults(handler=handle_scrape)


def handle_scrape(
    args,
    connect_fn=connect_local,
    github_scraper_factory=None,
    reddit_scraper_factory=None,
    github_discussions_scraper_factory=None,
    stackexchange_scraper_factory=None,
    hackernews_scraper_factory=None,
) -> int:
    results: dict[str, dict] = {}
    total_rows = 0

    if args.source in {"all", "github", "github-issues"}:
        if github_scraper_factory is None:
            from scraper.github_issues_scraper import GitHubIssuesScraper
            github_scraper_factory = GitHubIssuesScraper
        github = github_scraper_factory()
        repositories = github.get_repositories(args.github_repository)
        rows, report = github.scrape(
            repositories,
            lookback_days=args.github_lookback_days,
            limit_per_repository=args.github_limit_per_repository,
            max_total=args.github_max_items,
        )
        write_result = github.save_to_db(rows, connect_fn=connect_fn)
        rows_written = int(write_result.get("rows", 0))
        results["github_issues"] = {**report, "rows_written": rows_written}
        total_rows += rows_written

    if args.source in {"all", "github", "github-discussions"}:
        if github_discussions_scraper_factory is None:
            from scraper.github_discussions_scraper import GitHubDiscussionsScraper
            github_discussions_scraper_factory = GitHubDiscussionsScraper
        discussions = github_discussions_scraper_factory()
        repositories = discussions.get_repositories(args.github_repository)
        rows, report = discussions.scrape(
            repositories,
            limit_per_repository=args.github_discussion_limit_per_repository,
            max_total=args.github_discussion_max_items,
        )
        write_result = discussions.save_to_db(rows, connect_fn=connect_fn)
        rows_written = int(write_result.get("rows", 0))
        results["github_discussions"] = {**report, "rows_written": rows_written}
        total_rows += rows_written

    if args.source in {"all", "reddit"}:
        if reddit_scraper_factory is None:
            from scraper.reddit_scraper import RedditScraper
            reddit_scraper_factory = RedditScraper
        reddit = reddit_scraper_factory()
        subreddits = reddit.get_subreddits(dynamic_limit=args.dynamic_limit, overrides=args.reddit_subreddit)
        posts = reddit.scrape(
            subreddits,
            limit_per_feed=args.limit_per_feed,
            feeds=args.reddit_feed,
            max_posts=args.reddit_max_posts,
        )
        write_result = reddit.save_to_db(posts, connect_fn=connect_fn)
        rows_written = int(write_result.get("rows", 0))
        results["reddit"] = {
            "subreddits_targeted": len(subreddits),
            "posts_scraped": len(posts),
            "rows_written": rows_written,
        }
        total_rows += rows_written

    if args.source in {"all", "stackexchange"}:
        if stackexchange_scraper_factory is None:
            from scraper.stackexchange_scraper import StackExchangeScraper
            stackexchange_scraper_factory = StackExchangeScraper
        stackexchange = stackexchange_scraper_factory()
        sites = stackexchange.get_sites(args.stackexchange_site)
        rows, report = stackexchange.scrape(
            sites,
            lookback_days=args.stackexchange_lookback_days,
            limit_per_site=args.stackexchange_limit_per_site,
            max_total=args.stackexchange_max_items,
        )
        write_result = stackexchange.save_to_db(rows, connect_fn=connect_fn)
        rows_written = int(write_result.get("rows", 0))
        results["stackexchange"] = {**report, "rows_written": rows_written}
        total_rows += rows_written

    if args.source in {"all", "hackernews"}:
        if hackernews_scraper_factory is None:
            from scraper.hackernews_scraper import HackerNewsScraper
            hackernews_scraper_factory = HackerNewsScraper
        hackernews = hackernews_scraper_factory()
        rows, report = hackernews.scrape(
            feeds=args.hackernews_feed,
            limit_per_feed=args.hackernews_limit_per_feed,
            max_total=args.hackernews_max_items,
            min_comments=args.hackernews_min_comments,
        )
        write_result = hackernews.save_to_db(rows, connect_fn=connect_fn)
        rows_written = int(write_result.get("rows", 0))
        results["hackernews"] = {**report, "rows_written": rows_written}
        total_rows += rows_written

    print(json.dumps({"sources": results, "rows": total_rows}, indent=2))
    return 0

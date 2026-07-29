"""Reddit scraper that writes source posts directly to PostgreSQL."""

from __future__ import annotations

import os
from typing import Any

import praw
from dotenv import load_dotenv

from problemfinder.persistence.local import connect_local
from problemfinder.persistence.repositories.raw_posts import RawPostRepository
from problemfinder.shared.reddit import normalize_reddit_row
from util.constants import SUBREDDITS

load_dotenv()

FEEDS = ("hot", "new", "top", "rising", "controversial")


class RedditScraper:
    def __init__(self):
        self.reddit = praw.Reddit(
            client_id=os.getenv("REDDIT_CLIENT_ID"),
            client_secret=os.getenv("REDDIT_CLIENT_SECRET"),
            user_agent=os.getenv("REDDIT_USER_AGENT"),
        )

    def _get_dynamic_subreddits(self, limit: int = 50) -> list[str]:
        try:
            popular = [sub.display_name for sub in self.reddit.subreddits.popular(limit=limit)]
            defaults = [sub.display_name for sub in self.reddit.subreddits.default(limit=limit)]
            return sorted(set(popular + defaults))
        except Exception as error:
            print(f"Failed to fetch dynamic subreddits: {error}")
            return []

    def get_subreddits(self, dynamic_limit: int = 50) -> list[str]:
        return sorted(set(SUBREDDITS + self._get_dynamic_subreddits(dynamic_limit)))

    def _scrape_feed(
        self,
        subreddit: Any,
        feed: str,
        limit: int,
        seen: set[str],
    ) -> list[dict[str, Any]]:
        posts: list[dict[str, Any]] = []
        try:
            for post in getattr(subreddit, feed)(limit=limit):
                if post.id in seen:
                    continue
                seen.add(post.id)
                posts.append(
                    {
                        "id": post.id,
                        "title": post.title,
                        "body": post.selftext,
                        "subreddit": subreddit.display_name,
                        "author": str(post.author) if post.author else "[deleted]",
                        "score": post.score,
                        "upvote_ratio": post.upvote_ratio,
                        "url": post.url,
                        "num_comments": post.num_comments,
                        "created_utc": post.created_utc,
                        "stickied": post.stickied,
                        "over_18": post.over_18,
                        "feed": feed,
                    }
                )
        except Exception as error:
            print(f"Failed to scrape {feed} from r/{subreddit.display_name}: {error}")
        return posts

    def scrape(self, subreddits: list[str], limit_per_feed: int = 100) -> list[dict[str, Any]]:
        posts: list[dict[str, Any]] = []
        seen: set[str] = set()
        for handle in subreddits:
            try:
                subreddit = self.reddit.subreddit(handle)
                for feed in FEEDS:
                    posts.extend(self._scrape_feed(subreddit, feed, limit_per_feed, seen))
            except Exception as error:
                print(f"Failed to access r/{handle}: {error}")
        return posts

    def save_to_db(self, posts: list[dict[str, Any]], connect_fn=connect_local) -> dict[str, Any]:
        if not posts:
            return {"rows": 0}
        rows = [normalize_reddit_row(record) for record in posts]
        with connect_fn() as connection:
            return RawPostRepository(connection).ingest(rows)

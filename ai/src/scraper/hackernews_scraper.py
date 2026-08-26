"""Hacker News scraper using the official Firebase API."""

from __future__ import annotations

import json
from typing import Any, Callable, Iterable
from urllib.request import Request, urlopen

from problemfinder.persistence.local import connect_local
from problemfinder.persistence.repositories.raw_posts import RawPostRepository
from problemfinder.shared.public_sources import normalize_hackernews_story

API_ROOT = "https://hacker-news.firebaseio.com/v0"
DEFAULT_FEEDS = ("askstories", "showstories", "newstories")


class HackerNewsApiError(RuntimeError):
    pass


class HackerNewsClient:
    def __init__(self, *, api_root: str = API_ROOT, timeout: int = 30, opener: Callable[..., Any] = urlopen):
        self.api_root = api_root.rstrip("/")
        self.timeout = timeout
        self.opener = opener

    def _get_json(self, path: str) -> Any:
        request = Request(f"{self.api_root}/{path}.json", headers={"User-Agent": "ProblemFinderAI"})
        try:
            with self.opener(request, timeout=self.timeout) as response:
                return json.loads(response.read().decode("utf-8"))
        except Exception as error:
            raise HackerNewsApiError(f"Hacker News request failed for {path}: {error}") from error

    def feed_ids(self, feed: str) -> list[int]:
        payload = self._get_json(feed)
        if not isinstance(payload, list):
            raise HackerNewsApiError(f"Unexpected Hacker News feed response for {feed}")
        return [int(item_id) for item_id in payload]

    def item(self, item_id: int) -> dict[str, Any] | None:
        payload = self._get_json(f"item/{item_id}")
        return payload if isinstance(payload, dict) else None


class HackerNewsScraper:
    def __init__(self, *, client: HackerNewsClient | None = None):
        self.client = client or HackerNewsClient()

    def scrape(
        self,
        feeds: Iterable[str] | None = None,
        *,
        limit_per_feed: int = 100,
        max_total: int | None = None,
        min_comments: int = 0,
    ) -> tuple[list[dict[str, Any]], dict[str, Any]]:
        selected_feeds = tuple(feeds or DEFAULT_FEEDS)
        seen: set[int] = set()
        rows: list[dict[str, Any]] = []
        failures: dict[str, str] = {}
        feed_counts: dict[str, int] = {}
        for feed in selected_feeds:
            if max_total is not None and len(rows) >= max_total:
                break
            count_before = len(rows)
            try:
                ids = self.client.feed_ids(feed)[:limit_per_feed]
                for item_id in ids:
                    if item_id in seen:
                        continue
                    seen.add(item_id)
                    item = self.client.item(item_id)
                    if not item or item.get("type") != "story" or item.get("deleted") or item.get("dead"):
                        continue
                    descendants = int(item.get("descendants") or 0)
                    if descendants < min_comments:
                        continue
                    rows.append(normalize_hackernews_story(item))
                    if max_total is not None and len(rows) >= max_total:
                        break
                feed_counts[feed] = len(rows) - count_before
            except Exception as error:
                failures[feed] = f"{type(error).__name__}: {error}"
        return rows, {
            "feeds": list(selected_feeds),
            "feed_counts": feed_counts,
            "stories_scraped": len(rows),
            "feeds_failed": len(failures),
            "failures": failures,
        }

    @staticmethod
    def save_to_db(rows: list[dict[str, Any]], connect_fn=connect_local) -> dict[str, Any]:
        if not rows:
            return {"rows": 0}
        with connect_fn() as connection:
            return RawPostRepository(connection).ingest(rows)

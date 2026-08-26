"""Stack Exchange question scraper for high-signal technical communities."""

from __future__ import annotations

import json
import os
import time
from datetime import datetime, timedelta, timezone
from typing import Any, Callable, Iterable
from urllib.error import HTTPError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from dotenv import load_dotenv

from problemfinder.persistence.local import connect_local
from problemfinder.persistence.repositories.raw_posts import RawPostRepository
from problemfinder.shared.public_sources import normalize_stackexchange_question
from problemfinder.sources import STACKEXCHANGE_SOURCES, enabled_targets

load_dotenv()

API_ROOT = "https://api.stackexchange.com/2.3"
DEFAULT_SITES = tuple(target.community for target in enabled_targets(STACKEXCHANGE_SOURCES))


class StackExchangeApiError(RuntimeError):
    pass


class StackExchangeClient:
    def __init__(
        self,
        *,
        key: str | None = None,
        api_root: str = API_ROOT,
        timeout: int = 30,
        opener: Callable[..., Any] = urlopen,
        sleep_fn: Callable[[float], None] = time.sleep,
    ):
        self.key = key or os.getenv("STACKEXCHANGE_KEY") or None
        self.api_root = api_root.rstrip("/")
        self.timeout = timeout
        self.opener = opener
        self.sleep_fn = sleep_fn

    def list_questions(
        self,
        site: str,
        *,
        lookback_days: int = 30,
        max_results: int = 100,
    ) -> tuple[list[dict[str, Any]], dict[str, Any]]:
        if max_results <= 0:
            return [], {"quota_remaining": None}
        fromdate = int((datetime.now(timezone.utc) - timedelta(days=lookback_days)).timestamp())
        questions: list[dict[str, Any]] = []
        page = 1
        quota_remaining: int | None = None
        while len(questions) < max_results:
            params: dict[str, object] = {
                "site": site,
                "page": page,
                "pagesize": min(100, max_results - len(questions)),
                "order": "desc",
                "sort": "activity",
                "fromdate": fromdate,
                "filter": "withbody",
            }
            if self.key:
                params["key"] = self.key
            request = Request(
                f"{self.api_root}/questions?{urlencode(params)}",
                headers={"User-Agent": "ProblemFinderAI"},
            )
            try:
                with self.opener(request, timeout=self.timeout) as response:
                    payload = json.loads(response.read().decode("utf-8"))
            except HTTPError as error:
                raise StackExchangeApiError(f"Stack Exchange returned HTTP {error.code} for {site}") from error
            except (OSError, UnicodeDecodeError, json.JSONDecodeError) as error:
                raise StackExchangeApiError(f"Stack Exchange request failed for {site}: {error}") from error
            if payload.get("error_id"):
                raise StackExchangeApiError(str(payload.get("error_message") or payload.get("error_name") or payload["error_id"]))
            items = payload.get("items") or []
            if not isinstance(items, list):
                raise StackExchangeApiError(f"Unexpected Stack Exchange response for {site}")
            questions.extend(item for item in items if isinstance(item, dict))
            quota = payload.get("quota_remaining")
            quota_remaining = int(quota) if isinstance(quota, int) else quota_remaining
            backoff = payload.get("backoff")
            if isinstance(backoff, (int, float)) and backoff > 0:
                self.sleep_fn(float(backoff))
            if not payload.get("has_more") or not items:
                break
            page += 1
        return questions[:max_results], {"quota_remaining": quota_remaining}


class StackExchangeScraper:
    def __init__(self, *, client: StackExchangeClient | None = None):
        self.client = client or StackExchangeClient()

    @staticmethod
    def get_sites(overrides: Iterable[str] | None = None) -> list[str]:
        if overrides:
            return list(dict.fromkeys(str(site).strip() for site in overrides if str(site).strip()))
        return list(DEFAULT_SITES)

    def scrape(
        self,
        sites: Iterable[str],
        *,
        lookback_days: int = 30,
        limit_per_site: int = 100,
        max_total: int | None = None,
    ) -> tuple[list[dict[str, Any]], dict[str, Any]]:
        rows: list[dict[str, Any]] = []
        failures: dict[str, str] = {}
        quotas: dict[str, int | None] = {}
        succeeded = 0
        targets = list(sites)
        for site in targets:
            if max_total is not None and len(rows) >= max_total:
                break
            remaining = limit_per_site if max_total is None else min(limit_per_site, max_total - len(rows))
            try:
                questions, metadata = self.client.list_questions(site, lookback_days=lookback_days, max_results=remaining)
                rows.extend(normalize_stackexchange_question(question, site) for question in questions)
                quotas[site] = metadata.get("quota_remaining")
                succeeded += 1
            except Exception as error:
                failures[site] = f"{type(error).__name__}: {error}"
        return rows, {
            "sites_configured": len(targets),
            "sites_succeeded": succeeded,
            "sites_failed": len(failures),
            "questions_scraped": len(rows),
            "using_api_key": bool(self.client.key),
            "quota_remaining": quotas,
            "failures": failures,
        }

    @staticmethod
    def save_to_db(rows: list[dict[str, Any]], connect_fn=connect_local) -> dict[str, Any]:
        if not rows:
            return {"rows": 0}
        with connect_fn() as connection:
            return RawPostRepository(connection).ingest(rows)

"""Source-neutral row cleaning used by the scheduled clean stage."""

from __future__ import annotations

import re
from collections import defaultdict
from typing import Any

MIN_BODY_LENGTH = 50
MAX_BODY_LENGTH = 5000
SIMILARITY_THRESHOLD = 0.70

BOT_PATTERNS = (
    r"_bot$",
    r"bot_",
    r"^AutoModerator$",
    r"^[a-zA-Z]+Bot$",
    r"\[bot\]$",
)

DELETED_BODY_VALUES = {"[deleted]", "[removed]", ""}
DELETED_AUTHOR_VALUES = {"[deleted]", "None", ""}

Record = dict[str, Any]


class SourcePostCleaner:
    """Apply shared source-post cleaning without a DataFrame intermediary."""

    @staticmethod
    def _normalize(text: str) -> str:
        if not isinstance(text, str):
            return ""
        return re.sub(r"\s+", " ", text.lower()).strip()

    @staticmethod
    def _is_bot(author: str) -> bool:
        if not isinstance(author, str):
            return False
        return any(re.search(pattern, author, re.IGNORECASE) for pattern in BOT_PATTERNS)

    @staticmethod
    def _is_english(text: str) -> bool:
        try:
            from langdetect import LangDetectException, detect
        except ImportError:
            return True
        try:
            return detect(text) == "en"
        except LangDetectException:
            return False

    @staticmethod
    def remove_exact_duplicates(records: list[Record]) -> list[Record]:
        seen: set[Any] = set()
        unique: list[Record] = []
        for record in records:
            identity = (record.get("source"), record["id"])
            if identity in seen:
                continue
            seen.add(identity)
            unique.append(record)
        return unique

    @staticmethod
    def remove_deleted_posts(records: list[Record]) -> list[Record]:
        return [
            record
            for record in records
            if isinstance(record.get("body"), str)
            and record["body"].strip() not in DELETED_BODY_VALUES
        ]

    def remove_bots_and_deleted(self, records: list[Record]) -> list[Record]:
        return [
            record
            for record in records
            if record.get("author") is not None
            and str(record["author"]) not in DELETED_AUTHOR_VALUES
            and not self._is_bot(record["author"])
        ]

    @staticmethod
    def remove_stickied_and_nsfw(records: list[Record]) -> list[Record]:
        return [
            record
            for record in records
            if not record.get("stickied") and not record.get("over_18")
        ]

    def clean_basic(self, records: list[Record]) -> list[Record]:
        records = self.remove_exact_duplicates(records)
        records = self.remove_deleted_posts(records)
        records = self.remove_bots_and_deleted(records)
        return self.remove_stickied_and_nsfw(records)

    def remove_non_english(self, records: list[Record]) -> list[Record]:
        return [
            record
            for record in records
            if self._is_english(f"{record['title']} {record['body']}")
        ]

    def remove_same_author_near_duplicates(self, records: list[Record]) -> list[Record]:
        try:
            from sklearn.feature_extraction.text import TfidfVectorizer
            from sklearn.metrics.pairwise import cosine_similarity
        except ImportError:
            return records

        by_author: dict[Any, list[Record]] = defaultdict(list)
        for record in records:
            identity = (record.get("source"), record.get("author"))
            by_author[identity].append(record)

        drop_ids: set[Any] = set()
        for group in by_author.values():
            if len(group) < 2:
                continue
            contents = [
                self._normalize(f"{record['title']} {record['body']}")
                for record in group
            ]
            try:
                matrix = TfidfVectorizer(
                    analyzer="char_wb",
                    ngram_range=(3, 5),
                ).fit_transform(contents)
            except ValueError:
                continue
            similarity = cosine_similarity(matrix)
            for left in range(len(group)):
                for right in range(left + 1, len(group)):
                    if similarity[left, right] > SIMILARITY_THRESHOLD:
                        drop_ids.add(group[right]["_raw_post_id"])
        return [record for record in records if record["_raw_post_id"] not in drop_ids]

    @staticmethod
    def remove_by_length(records: list[Record]) -> list[Record]:
        return [
            record
            for record in records
            if MIN_BODY_LENGTH <= len(record["body"]) <= MAX_BODY_LENGTH
        ]

    def clean_expensive(self, records: list[Record]) -> list[Record]:
        records = self.remove_non_english(records)
        records = self.remove_same_author_near_duplicates(records)
        return self.remove_by_length(records)

from problemfinder.pipeline.cpu_ingest_clean import process_rows, rows_to_records
from problemfinder.pipeline.source_cleaning import SourcePostCleaner


def _row(identifier, body, *, author="person", source="reddit", **payload):
    return {
        "id": identifier,
        "source": source,
        "source_post_id": f"post-{identifier}",
        "title": "A recurring operational problem",
        "body": body,
        "author": author,
        "payload": payload,
    }


class EnglishCleaner(SourcePostCleaner):
    @staticmethod
    def _is_english(_text):
        return True


class PassingReadability:
    @staticmethod
    def check(_title, _body):
        return {"pass": True, "reason": None}


def test_row_native_cleaning_preserves_basic_and_expensive_stage_routing():
    long_body = "Teams manually copy the same information between systems every morning."
    rows = [
        _row("accepted", long_body),
        _row("bot", long_body, author="AutoModerator"),
        _row("short", "Too short"),
    ]

    outcomes, report = process_rows(
        rows,
        cleaner=EnglishCleaner(),
        readability=PassingReadability(),
    )

    by_id = {outcome["raw_post_id"]: outcome for outcome in outcomes}
    assert by_id["accepted"]["stage"] == "filter_pending"
    assert by_id["bot"]["rejection_reason"] == "basic_clean_rejected"
    assert by_id["short"]["rejection_reason"] == "expensive_clean_rejected"
    assert report["rows_claimed"] == 3
    assert report["filter_pending"] == 1


def test_same_author_near_duplicates_keep_the_first_record():
    body = "Teams manually reconcile invoices across disconnected systems every day."
    records = rows_to_records(
        [
            _row("first", body),
            _row("second", body),
        ]
    )

    cleaned = EnglishCleaner().clean_expensive(records)

    assert [record["_raw_post_id"] for record in cleaned] == ["first"]


def test_external_ids_and_authors_do_not_collide_across_sources():
    body = "Teams manually reconcile invoices across disconnected systems every day."
    records = rows_to_records(
        [
            _row("reddit", body, source="reddit"),
            _row("github", body, source="github"),
        ]
    )
    records[1]["id"] = records[0]["id"]

    cleaned = EnglishCleaner().clean_expensive(
        EnglishCleaner().clean_basic(records)
    )

    assert [record["_raw_post_id"] for record in cleaned] == ["reddit", "github"]


def test_github_bot_accounts_are_removed():
    body = "Teams manually reconcile invoices across disconnected systems every day."
    records = rows_to_records(
        [_row("bot", body, source="github", author="dependabot[bot]")]
    )

    assert EnglishCleaner().clean_basic(records) == []

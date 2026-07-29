from problemfinder.shared.reddit import normalize_reddit_row


def test_reddit_row_normalizes_for_direct_ingest():
    row = normalize_reddit_row(
        {
            "id": "abc",
            "title": "A problem",
            "body": "We copy data manually.",
            "created_utc": 0,
            "subreddit": "saas",
            "score": "4",
        }
    )
    assert row["source"] == "reddit"
    assert row["source_post_id"] == "abc"
    assert row["source_created_at"] == "1970-01-01T00:00:00+00:00"
    assert row["score"] == 4
    assert row["content_hash"]

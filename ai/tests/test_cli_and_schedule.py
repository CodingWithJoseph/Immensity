import pytest

from problemfinder.cli.commands.scrape import handle_scrape
from problemfinder.cli.parser import build_parser
from scripts import scheduler


EXPECTED_WEEKLY_SCHEDULE = {
    "Monday": [
        {"label": "scrape", "command": ["scrape"], "max_minutes": 60},
        {
            "label": "clean",
            "command": ["worker", "clean", "--batch-size", "500", "--limit", "50000"],
            "max_minutes": 240,
        },
        {
            "label": "filter",
            "command": ["worker", "filter", "--batch-size", "100", "--limit", "10000"],
            "max_minutes": 240,
        },
    ],
    "Tuesday": [
        {
            "label": "classify",
            "command": ["worker", "classify", "--batch-size", "100", "--limit", "5000"],
            "max_minutes": 480,
        }
    ],
    "Wednesday": [
        {
            "label": "embed",
            "command": ["worker", "embed", "--batch-size", "50", "--limit", "5000"],
            "max_minutes": 200,
        },
        {
            "label": "assign",
            "command": ["worker", "assign", "--batch-size", "100", "--limit", "5000"],
            "max_minutes": 200,
        },
        {"label": "group", "command": ["worker", "group"], "max_minutes": 80},
    ],
    "Thursday": [
        {
            "label": "name",
            "command": ["worker", "name", "--batch-size", "100", "--limit", "5000"],
            "max_minutes": 480,
        }
    ],
    "Friday": [
        {"label": "sync-publish", "command": ["sync", "publish"], "max_minutes": 480},
    ],
    "Saturday": [],
    "Sunday": [],
}


class RecordingLogger:
    def __init__(self):
        self.messages = []

    def log(self, message):
        self.messages.append(message)


def test_only_supported_worker_commands_are_registered():
    parser = build_parser()
    for name in ("clean", "filter", "classify", "embed", "assign", "group", "name"):
        args = parser.parse_args(["worker", name, "--dry-run"])
        assert args.worker_command == name
    with pytest.raises(SystemExit):
        parser.parse_args(["worker", "filter2-gpu"])
    with pytest.raises(SystemExit):
        parser.parse_args(["worker", "signals", "--dry-run"])


def test_scrape_supports_all_or_one_source():
    parser = build_parser()
    defaults = parser.parse_args(["scrape"])
    assert defaults.source == "all"
    assert defaults.github_lookback_days == 90
    assert defaults.github_limit_per_repository == 200
    assert parser.parse_args(["scrape", "--source", "github"]).source == "github"
    assert parser.parse_args(["scrape", "--source", "reddit"]).source == "reddit"
    with pytest.raises(SystemExit):
        parser.parse_args(["scrape", "--source", "other"])
    with pytest.raises(SystemExit):
        parser.parse_args(["scrape", "--github-lookback-days", "0"])


def test_default_scrape_runs_github_before_reddit(capsys):
    events = []

    class GitHubScraper:
        @staticmethod
        def get_repositories(_overrides):
            events.append("github_targets")
            return ["example/project"]

        @staticmethod
        def scrape(_repositories, **_kwargs):
            events.append("github_scrape")
            return [{"source": "github"}], {"issues_scraped": 1}

        @staticmethod
        def save_to_db(_rows, **_kwargs):
            events.append("github_save")
            return {"rows": 1}

    class RedditScraper:
        @staticmethod
        def get_subreddits(**_kwargs):
            events.append("reddit_targets")
            return ["saas"]

        @staticmethod
        def scrape(_subreddits, **_kwargs):
            events.append("reddit_scrape")
            return [{"source": "reddit"}]

        @staticmethod
        def save_to_db(_rows, **_kwargs):
            events.append("reddit_save")
            return {"rows": 1}

    args = build_parser().parse_args(["scrape"])
    result = handle_scrape(
        args,
        github_scraper_factory=GitHubScraper,
        reddit_scraper_factory=RedditScraper,
    )

    assert result == 0
    assert events == [
        "github_targets",
        "github_scrape",
        "github_save",
        "reddit_targets",
        "reddit_scrape",
        "reddit_save",
    ]
    assert '"rows": 2' in capsys.readouterr().out


def test_database_has_one_migration_command():
    parser = build_parser()
    assert parser.parse_args(["db", "migrate", "--yes"]).db_command == "migrate"
    with pytest.raises(SystemExit):
        parser.parse_args(["db", "apply-software-only", "--yes"])


def test_weekly_schedule_matches_the_single_pipeline():
    assert scheduler.SCHEDULE == EXPECTED_WEEKLY_SCHEDULE
    actual = {
        day: [step["label"] for step in scheduler.SCHEDULE[day]]
        for day in scheduler.WEEKDAYS
    }
    ordered = [label for day in scheduler.WEEKDAYS for label in actual[day]]
    assert ordered == [
        "scrape",
        "clean",
        "filter",
        "classify",
        "embed",
        "assign",
        "group",
        "name",
        "sync-publish",
    ]


def test_each_scheduled_day_has_one_shared_eight_hour_budget():
    assert scheduler.NIGHTLY_BUDGET_MINUTES == 8 * 60
    assert sum(step["max_minutes"] for step in scheduler.SCHEDULE["Monday"]) > 8 * 60
    assert sum(step["max_minutes"] for step in scheduler.SCHEDULE["Wednesday"]) == 8 * 60
    assert sum(step["max_minutes"] for step in scheduler.SCHEDULE["Friday"]) == 8 * 60


def test_monday_gives_the_filter_only_the_remaining_nightly_budget(monkeypatch):
    clock = {"seconds": 0}
    allotments = []

    def monotonic():
        return clock["seconds"]

    def run_step(step, allotted_minutes, _logger):
        allotments.append((step["label"], allotted_minutes))
        clock["seconds"] += allotted_minutes * 60
        return {
            "label": step["label"],
            "status": "ok",
            "returncode": 0,
            "elapsed_minutes": allotted_minutes,
        }

    monkeypatch.setattr(scheduler.time, "monotonic", monotonic)
    monkeypatch.setattr(scheduler, "ensure_postgres", lambda _logger: True)
    monkeypatch.setattr(scheduler, "run_step", run_step)

    result = scheduler.run_day("Monday", RecordingLogger(), dry_run=False)

    assert allotments == [("scrape", 60), ("clean", 240), ("filter", 180)]
    assert [step["status"] for step in result["steps"]] == ["ok", "ok", "ok"]


def test_remaining_steps_are_left_for_later_when_budget_is_exhausted(monkeypatch):
    clock = {"seconds": 0}

    def run_step(step, allotted_minutes, _logger):
        clock["seconds"] += allotted_minutes * 60
        return {
            "label": step["label"],
            "status": "ok",
            "returncode": 0,
            "elapsed_minutes": allotted_minutes,
        }

    monkeypatch.setattr(scheduler, "NIGHTLY_BUDGET_MINUTES", 300)
    monkeypatch.setattr(scheduler.time, "monotonic", lambda: clock["seconds"])
    monkeypatch.setattr(scheduler, "ensure_postgres", lambda _logger: True)
    monkeypatch.setattr(scheduler, "run_step", run_step)

    result = scheduler.run_day("Monday", RecordingLogger(), dry_run=False)

    assert [(step["label"], step["status"]) for step in result["steps"]] == [
        ("scrape", "ok"),
        ("clean", "ok"),
        ("filter", "skipped_budget"),
    ]


def test_worker_command_receives_the_remaining_time_but_upload_uses_timeout_only():
    filter_step = scheduler.SCHEDULE["Monday"][2]
    filter_command = scheduler.build_command(filter_step, 180)
    assert filter_command[-2:] == ["--max-minutes", "180"]

    upload_step = scheduler.SCHEDULE["Friday"][0]
    upload_command = scheduler.build_command(upload_step, 480)
    assert "--max-minutes" not in upload_command

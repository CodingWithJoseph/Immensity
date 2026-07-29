#!/usr/bin/env python
"""Nightly day-of-week pipeline scheduler.

Looks at today's weekday and runs the pipeline steps configured for that day by
shelling out to the existing CLI (``python -m problemfinder.cli ...``). Every
step runs as its own subprocess; start/end times and results are logged to
``logs/scheduler_YYYY-MM-DD.log`` (and echoed to the console).

----------------------------------------------------------------------------
Configuring the schedule
----------------------------------------------------------------------------
Edit ``SCHEDULE`` below — that is the single place to add, remove, or move
steps between days. Each weekday maps to an ordered list of steps, and each
step is a plain dict with three fields:

    label        short human name used in the logs
    command      CLI args passed after ``python -m problemfinder.cli``
                 (a list of strings, e.g. ["worker", "filter", ...])
    max_minutes  this step's own time cap, in minutes

All steps for a day share a single ``NIGHTLY_BUDGET_MINUTES`` budget (8h). Each
step is capped at ``min(step max_minutes, remaining budget)``; once the budget
for the night is spent, any remaining steps are skipped. Sunday is intentionally
empty (off).

``worker`` steps are self-limiting: the scheduler passes the computed cap to the
worker as ``--max-minutes`` so it exits cleanly. Non-worker steps (e.g.
``sync publish``) do not take ``--max-minutes``; for those the cap is enforced
only by the subprocess timeout backstop. Set ``"inject_max_minutes": False`` on
a step to override the default (which injects for ``worker`` commands).

----------------------------------------------------------------------------
Usage
----------------------------------------------------------------------------
    python scripts/scheduler.py                  # run today's steps
    python scripts/scheduler.py --day Monday     # force a specific weekday
    python scripts/scheduler.py --dry-run        # print the plan, run nothing
"""

from __future__ import annotations

import argparse
import os
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

# Total time budget for one night, shared across every step scheduled that day.
NIGHTLY_BUDGET_MINUTES = 8 * 60

# Grace period (seconds) added to a step's computed cap before the subprocess is
# hard-killed. Workers self-limit via --max-minutes and should exit well within
# the cap; this backstop only fires if a step ignores its own limit.
TIMEOUT_GRACE_SECONDS = 5 * 60

# --------------------------------------------------------------------------- #
# Docker preflight — every pipeline step talks to the local PostgreSQL that runs
# as the ``postgres`` service in docker-compose.yml. If that container is not up
# (e.g. after a host reboot) the first DB step fails with a connection timeout,
# so we bring it up and wait for it to accept connections before running steps.
# --------------------------------------------------------------------------- #
DOCKER_COMPOSE = ("docker", "compose")
POSTGRES_SERVICE = "postgres"
# Credentials match docker-compose.yml; pg_isready uses them to probe readiness.
POSTGRES_USER = "problemfinder"
POSTGRES_DB = "problemfinder_local"
# How long to wait for postgres to start accepting connections, and how often to
# poll while waiting.
POSTGRES_READY_TIMEOUT_SECONDS = 180
POSTGRES_READY_POLL_SECONDS = 3

# --------------------------------------------------------------------------- #
# THE SCHEDULE — edit here to add/remove/move steps between days.
# --------------------------------------------------------------------------- #
SCHEDULE: dict[str, list[dict]] = {
    "Monday": [
        {
            "label": "scrape",
            "command": ["scrape"],
            "max_minutes": 60,
        },
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
        },
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
        {
            "label": "group",
            "command": ["worker", "group"],
            "max_minutes": 80,
        },
    ],
    "Thursday": [
        {
            "label": "name",
            "command": ["worker", "name", "--batch-size", "100", "--limit", "5000"],
            "max_minutes": 480,
        },
    ],
    "Friday": [
        {
            "label": "sync-publish",
            "command": ["sync", "publish"],
            "max_minutes": 480,
        },
    ],
    "Saturday": [],
    "Sunday": [],
}

WEEKDAYS = ("Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday")


# --------------------------------------------------------------------------- #
# logging
# --------------------------------------------------------------------------- #
class Logger:
    """Tiny tee logger: timestamps each line to the day's log file and stdout."""

    def __init__(self, log_path: Path):
        self.log_path = log_path
        log_path.parent.mkdir(parents=True, exist_ok=True)
        self._handle = log_path.open("a", encoding="utf-8")

    def log(self, message: str) -> None:
        stamped = f"[{datetime.now().isoformat(timespec='seconds')}] {message}"
        print(stamped, flush=True)
        self._handle.write(stamped + "\n")
        self._handle.flush()

    def close(self) -> None:
        self._handle.close()


# --------------------------------------------------------------------------- #
# command building
# --------------------------------------------------------------------------- #
def _inject_max_minutes(step: dict) -> bool:
    """Whether to pass --max-minutes to this step (default: worker commands)."""
    return step.get("inject_max_minutes", step["command"][:1] == ["worker"])


def build_command(step: dict, allotted_minutes: int) -> list[str]:
    """Full subprocess argv for a step, capped to ``allotted_minutes``."""
    argv = [sys.executable, "-m", "problemfinder.cli", *step["command"]]
    if _inject_max_minutes(step) and "--max-minutes" not in step["command"]:
        argv += ["--max-minutes", str(allotted_minutes)]
    return argv


def subprocess_env() -> dict[str, str]:
    """Ensure ``problemfinder`` is importable by putting src/ on PYTHONPATH."""
    env = os.environ.copy()
    src = str(ROOT / "src")
    existing = env.get("PYTHONPATH")
    env["PYTHONPATH"] = f"{src}{os.pathsep}{existing}" if existing else src
    return env


# --------------------------------------------------------------------------- #
# Docker preflight
# --------------------------------------------------------------------------- #
def _run_compose(args: list[str]) -> subprocess.CompletedProcess:
    """Run a ``docker compose`` subcommand from the repo root."""
    return subprocess.run(
        [*DOCKER_COMPOSE, *args],
        cwd=str(ROOT),
        env=subprocess_env(),
        capture_output=True,
        text=True,
    )


def _postgres_ready(runner) -> bool:
    """True when the postgres container is up and accepting connections."""
    result = runner(["exec", "-T", POSTGRES_SERVICE,
                     "pg_isready", "-U", POSTGRES_USER, "-d", POSTGRES_DB])
    return result.returncode == 0


def ensure_postgres(
    logger: Logger,
    *,
    timeout_seconds: int = POSTGRES_READY_TIMEOUT_SECONDS,
    poll_seconds: int = POSTGRES_READY_POLL_SECONDS,
    runner=_run_compose,
    sleep=time.sleep,
) -> bool:
    """Start the postgres container and wait until it accepts connections.

    Returns True once postgres is ready. Returns False if docker is unavailable,
    the container fails to come up, or it is still not ready after
    ``timeout_seconds`` — in every case the day still proceeds, because each
    worker retries its own connection (see ``connect_local``) and records proper
    failures. The preflight just removes the common "container wasn't running"
    cause of a whole-step abort.
    """
    logger.log(f"PREFLIGHT bringing up '{POSTGRES_SERVICE}' container...")
    try:
        up = runner(["up", "-d", POSTGRES_SERVICE])
    except FileNotFoundError:
        logger.log("PREFLIGHT docker not found on PATH — skipping (assuming external postgres)")
        return False
    if up.returncode != 0:
        logger.log(
            f"PREFLIGHT 'docker compose up -d {POSTGRES_SERVICE}' failed "
            f"(rc={up.returncode}): {(up.stderr or '').strip()}"
        )
        return False

    deadline = time.monotonic() + timeout_seconds
    while True:
        if _postgres_ready(runner):
            logger.log(f"PREFLIGHT '{POSTGRES_SERVICE}' is accepting connections")
            return True
        if time.monotonic() >= deadline:
            logger.log(
                f"PREFLIGHT '{POSTGRES_SERVICE}' not ready after {timeout_seconds}s "
                "— continuing; workers will retry their own connections"
            )
            return False
        sleep(poll_seconds)


# --------------------------------------------------------------------------- #
# step execution
# --------------------------------------------------------------------------- #
def run_step(step: dict, allotted_minutes: int, logger: Logger) -> dict:
    """Run one step as a subprocess; return an outcome dict."""
    argv = build_command(step, allotted_minutes)
    timeout = allotted_minutes * 60 + TIMEOUT_GRACE_SECONDS
    logger.log(f"START step={step['label']!r} cap={allotted_minutes}m cmd={' '.join(argv)}")
    started = time.monotonic()
    try:
        completed = subprocess.run(
            argv,
            cwd=str(ROOT),
            env=subprocess_env(),
            capture_output=True,
            text=True,
            timeout=timeout,
        )
        elapsed = time.monotonic() - started
        output = (completed.stdout or "") + (completed.stderr or "")
        for line in output.splitlines():
            logger.log(f"  | {line}")
        status = "ok" if completed.returncode == 0 else "failed"
        logger.log(
            f"END   step={step['label']!r} status={status} "
            f"returncode={completed.returncode} elapsed={elapsed / 60:.1f}m"
        )
        return {"label": step["label"], "status": status, "returncode": completed.returncode,
                "elapsed_minutes": round(elapsed / 60, 2)}
    except subprocess.TimeoutExpired as exc:
        elapsed = time.monotonic() - started
        for line in (exc.output or "").splitlines() if isinstance(exc.output, str) else []:
            logger.log(f"  | {line}")
        logger.log(
            f"END   step={step['label']!r} status=timeout "
            f"elapsed={elapsed / 60:.1f}m (hard cap {timeout / 60:.1f}m hit)"
        )
        return {"label": step["label"], "status": "timeout", "returncode": None,
                "elapsed_minutes": round(elapsed / 60, 2)}


# --------------------------------------------------------------------------- #
# orchestration
# --------------------------------------------------------------------------- #
def resolve_day(requested: str | None) -> str:
    if requested is None:
        return datetime.now().strftime("%A")
    match = {day.lower(): day for day in WEEKDAYS}.get(requested.lower())
    if match is None:
        raise ValueError(f"unknown --day {requested!r}; expected one of {', '.join(WEEKDAYS)}")
    return match


def run_day(day: str, logger: Logger, *, dry_run: bool) -> dict:
    steps = SCHEDULE.get(day, [])
    logger.log(f"=== Scheduler start: {day} (budget {NIGHTLY_BUDGET_MINUTES}m, {len(steps)} step(s)) ===")
    if not steps:
        logger.log(f"No steps scheduled for {day} — nothing to do.")
        logger.log(f"=== Scheduler done: {day} ===")
        return {"day": day, "steps": []}

    if not dry_run:
        ensure_postgres(logger)

    outcomes: list[dict] = []
    started = time.monotonic()
    for step in steps:
        elapsed_min = (time.monotonic() - started) / 60
        remaining = NIGHTLY_BUDGET_MINUTES - elapsed_min
        allotted = int(min(step["max_minutes"], remaining))
        if allotted <= 0:
            logger.log(f"SKIP  step={step['label']!r} — nightly budget exhausted "
                       f"({elapsed_min:.1f}m of {NIGHTLY_BUDGET_MINUTES}m used)")
            outcomes.append({"label": step["label"], "status": "skipped_budget",
                             "returncode": None, "elapsed_minutes": 0})
            continue
        if dry_run:
            argv = build_command(step, allotted)
            logger.log(f"PLAN  step={step['label']!r} cap={allotted}m cmd={' '.join(argv)}")
            outcomes.append({"label": step["label"], "status": "planned",
                             "returncode": None, "elapsed_minutes": 0})
            continue
        outcomes.append(run_step(step, allotted, logger))

    total_min = (time.monotonic() - started) / 60
    summary = ", ".join(f"{o['label']}={o['status']}" for o in outcomes)
    logger.log(f"=== Scheduler done: {day} | total={total_min:.1f}m | {summary} ===")
    return {"day": day, "steps": outcomes}


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Run the pipeline steps scheduled for a given weekday.")
    parser.add_argument("--day", default=None, help="Force a weekday (default: today).")
    parser.add_argument("--dry-run", action="store_true", help="Print the plan without running anything.")
    args = parser.parse_args(argv)

    try:
        day = resolve_day(args.day)
    except ValueError as error:
        parser.error(str(error))

    log_path = ROOT / "logs" / f"scheduler_{datetime.now().strftime('%Y-%m-%d')}.log"
    logger = Logger(log_path)
    try:
        result = run_day(day, logger, dry_run=args.dry_run)
    finally:
        logger.close()

    # Non-zero exit if any step failed or timed out, so a cron/runner notices.
    failed = [s for s in result["steps"] if s["status"] in ("failed", "timeout")]
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())

"""Explicit local PostgreSQL connection and migration helpers."""

from __future__ import annotations

import os
import time
from pathlib import Path
from typing import Any, Iterable, Mapping
from urllib.parse import urlparse

# Per-attempt cap (seconds) so a stalled connect fails fast instead of hanging.
CONNECT_TIMEOUT_SECONDS = 15
# Number of connection attempts before giving up.
CONNECT_ATTEMPTS = 5
# Base delay (seconds) for exponential backoff between attempts: 2, 4, 8, 16.
CONNECT_BACKOFF_SECONDS = 2.0


def get_local_database_url(environ: Mapping[str, str] | None = None, required: bool = True) -> str | None:
    value = (os.environ if environ is None else environ).get("LOCAL_DATABASE_URL")
    if not value:
        if required:
            raise ValueError("LOCAL_DATABASE_URL is required")
        return None
    if urlparse(value).scheme not in {"postgres", "postgresql"}:
        raise ValueError("LOCAL_DATABASE_URL must be a PostgreSQL URL")
    return value


def connect_local(
    database_url: str | None = None,
    *,
    attempts: int = CONNECT_ATTEMPTS,
    backoff_seconds: float = CONNECT_BACKOFF_SECONDS,
    connect_timeout: int = CONNECT_TIMEOUT_SECONDS,
    sleep=time.sleep,
):
    """Connect only to the explicitly configured local PostgreSQL database.

    A single transient connection timeout (e.g. PostgreSQL not yet accepting
    connections when a nightly worker starts) should not abort an entire step,
    so transient ``OperationalError`` failures are retried with exponential
    backoff (2s, 4s, 8s, 16s). The last error is re-raised once attempts run out.
    """
    try:
        import psycopg
    except ImportError as exc:
        raise RuntimeError("Install psycopg[binary] to use local PostgreSQL commands") from exc

    url = database_url or get_local_database_url()
    last_error: Exception | None = None
    for attempt in range(1, attempts + 1):
        try:
            return psycopg.connect(url, connect_timeout=connect_timeout)
        except psycopg.OperationalError as error:
            last_error = error
            if attempt >= attempts:
                break
            sleep(backoff_seconds * (2 ** (attempt - 1)))
    assert last_error is not None  # only reached after a failed attempt
    raise last_error


def check_local_database(connect_fn=connect_local) -> dict[str, str]:
    with connect_fn() as connection:
        with connection.cursor() as cursor:
            cursor.execute("SELECT current_database(), current_user, version()")
            database, user, version = cursor.fetchone()
    return {"database": database, "user": user, "version": version}


def migration_path() -> Path:
    return Path(__file__).resolve().parents[3] / "migrations" / "local"


def migration_paths() -> list[Path]:
    return sorted(migration_path().glob("*.sql"))


def apply_migrations(
    connection: Any,
    paths: Iterable[Path] | None = None,
) -> dict[str, list[str]]:
    """Apply each pending SQL file once and record it transactionally."""
    selected = migration_paths() if paths is None else list(paths)
    with connection.cursor() as cursor:
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS problemfinder_schema_migrations (
                name text PRIMARY KEY,
                applied_at timestamptz NOT NULL DEFAULT now()
            )
            """
        )
    connection.commit()

    with connection.cursor() as cursor:
        cursor.execute("SELECT name FROM problemfinder_schema_migrations")
        applied = {row[0] for row in cursor.fetchall()}

    completed: list[str] = []
    skipped: list[str] = []
    for path in selected:
        if path.name in applied:
            skipped.append(path.name)
            continue
        try:
            with connection.cursor() as cursor:
                cursor.execute(path.read_text(encoding="utf-8"))
                cursor.execute(
                    "INSERT INTO problemfinder_schema_migrations (name) VALUES (%s)",
                    (path.name,),
                )
            connection.commit()
        except Exception:
            connection.rollback()
            raise
        completed.append(path.name)
    return {"applied": completed, "skipped": skipped}

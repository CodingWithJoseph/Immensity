"""Local database commands."""

from __future__ import annotations

import json

from ...persistence.local import (
    check_local_database,
    connect_local,
    apply_migrations,
    migration_paths,
)
from .common import unavailable


def register(subparsers) -> None:
    parser = subparsers.add_parser("db", help="Manage the explicit local PostgreSQL boundary")
    commands = parser.add_subparsers(dest="db_command", required=True)

    check = commands.add_parser("check-local", help="Check the configured local PostgreSQL connection")
    check.set_defaults(handler=handle_check_local)

    migrations = commands.add_parser("migrations", help="Print available migration SQL")
    migrations.set_defaults(handler=handle_migrations)

    migrate = commands.add_parser("migrate", help="Apply all pending local migrations")
    migrate.add_argument("--yes", action="store_true", help="Confirm database migrations")
    migrate.set_defaults(handler=handle_migrate)


def handle_check_local(_args, check_fn=check_local_database) -> int:
    print(json.dumps(check_fn(), indent=2))
    return 0


def handle_migrations(_args) -> int:
    for path in migration_paths():
        print(f"-- Migration: {path}")
        print(path.read_text(encoding="utf-8"))
    return 0


def handle_migrate(args, connect_fn=connect_local) -> int:
    if not args.yes:
        return unavailable("database migrations require --yes")
    with connect_fn() as connection:
        result = apply_migrations(connection)
    print(json.dumps(result, indent=2))
    return 0

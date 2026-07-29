"""Explicit final-destination Supabase operations."""

from __future__ import annotations

import json

from ...persistence.local import connect_local
from .common import unavailable


def register(subparsers) -> None:
    parser = subparsers.add_parser("sync", help="Explicit final-destination operations")
    commands = parser.add_subparsers(dest="sync_command", required=True)

    publish = commands.add_parser(
        "publish",
        help="Publish named problem clusters and their source items to Supabase",
    )
    publish.add_argument("--limit", type=int, default=None)
    publish.add_argument("--dry-run", action="store_true")
    publish.set_defaults(handler=handle_publish)


def handle_publish(args, connect_fn=connect_local, adapter_factory=None) -> int:
    if args.limit is not None and args.limit < 1:
        return unavailable("--limit must be at least 1")

    from ...pipeline.supabase_publish import build_supabase_adapter, run_publish
    from ...persistence.repositories.supabase_publish import SupabasePublishRepository

    adapter = None
    if not args.dry_run:
        try:
            adapter = (adapter_factory or build_supabase_adapter)()
        except EnvironmentError as error:
            return unavailable(str(error))

    with connect_fn() as connection:
        result = run_publish(
            SupabasePublishRepository(connection),
            adapter,
            limit=args.limit,
            dry_run=args.dry_run,
        )
    print(json.dumps(result, indent=2))
    return 0

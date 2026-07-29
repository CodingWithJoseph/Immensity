"""CLI entry points for the seven pipeline workers."""

from __future__ import annotations

import json

from ...persistence.local import connect_local
from .common import unavailable

WORKERS = {
    "clean": {"limit": 20000, "batch_size": 100, "max_minutes": 480},
    "filter": {"limit": 5000, "batch_size": 25, "max_minutes": 480},
    "classify": {"limit": 5000, "batch_size": 25, "max_minutes": 480},
    "embed": {"limit": 5000, "batch_size": 50, "max_minutes": 240},
    "assign": {"limit": 5000, "batch_size": 25, "max_minutes": 60},
    "group": {"limit": 5000, "max_minutes": 60},
    "name": {"limit": 5000, "batch_size": 100, "max_minutes": 60},
}


def register(subparsers) -> None:
    parser = subparsers.add_parser("worker", help="Run one local pipeline stage")
    commands = parser.add_subparsers(dest="worker_command", required=True)
    handlers = {
        "clean": handle_clean,
        "filter": handle_filter,
        "classify": handle_classify,
        "embed": handle_embed,
        "assign": handle_assign,
        "group": handle_group,
        "name": handle_name,
    }
    for name, defaults in WORKERS.items():
        command = commands.add_parser(name)
        command.add_argument("--limit", type=int, default=defaults["limit"])
        if "batch_size" in defaults:
            command.add_argument("--batch-size", type=int, default=defaults["batch_size"])
        command.add_argument("--max-minutes", type=int, default=defaults["max_minutes"])
        command.add_argument("--dry-run", action="store_true")
        if name in {"assign", "group"}:
            command.add_argument("--threshold", type=float, default=0.85 if name == "assign" else 0.82)
        if name == "group":
            command.add_argument("--min-members", type=int, default=3)
        command.set_defaults(handler=handlers[name])


def _validate(args) -> int | None:
    if args.limit < 1 or args.max_minutes < 1:
        return unavailable("--limit and --max-minutes must be at least 1")
    if hasattr(args, "batch_size") and args.batch_size < 1:
        return unavailable("--batch-size must be at least 1")
    if hasattr(args, "threshold") and not 0 <= args.threshold <= 1:
        return unavailable("--threshold must be between 0.0 and 1.0")
    if hasattr(args, "min_members") and args.min_members < 3:
        return unavailable("--min-members must be at least 3")
    return None


def _print(result: dict) -> int:
    print(json.dumps(result, indent=2, default=str))
    return 0


def handle_clean(args, connect_fn=connect_local) -> int:
    if error := _validate(args):
        return error
    from ...persistence.repositories.cpu_clean import CpuCleanRepository
    from ...pipeline.cpu_ingest_clean import run_worker

    with connect_fn() as connection:
        result = run_worker(
            CpuCleanRepository(connection),
            limit=args.limit,
            batch_size=args.batch_size,
            max_minutes=args.max_minutes,
            dry_run=args.dry_run,
        )
    return _print(result)


def handle_filter(args, connect_fn=connect_local) -> int:
    if error := _validate(args):
        return error
    from ...persistence.repositories.filter import FilterRepository
    from ...pipeline.filter import run_worker

    with connect_fn() as connection:
        result = run_worker(
            FilterRepository(connection),
            limit=args.limit,
            batch_size=args.batch_size,
            max_minutes=args.max_minutes,
            dry_run=args.dry_run,
        )
    return _print(result)


def handle_classify(args, connect_fn=connect_local) -> int:
    if error := _validate(args):
        return error
    from ...persistence.repositories.classify_final import ClassifyFinalRepository
    from ...pipeline.classify_final import run_worker

    with connect_fn() as connection:
        result = run_worker(
            ClassifyFinalRepository(connection),
            limit=args.limit,
            batch_size=args.batch_size,
            max_minutes=args.max_minutes,
            dry_run=args.dry_run,
        )
    return _print(result)


def handle_embed(args, connect_fn=connect_local) -> int:
    if error := _validate(args):
        return error
    from ...persistence.repositories.embeddings import EmbeddingRepository
    from ...pipeline.embeddings import run_worker

    with connect_fn() as connection:
        result = run_worker(
            EmbeddingRepository(connection),
            limit=args.limit,
            batch_size=args.batch_size,
            max_minutes=args.max_minutes,
            dry_run=args.dry_run,
        )
    return _print(result)


def handle_assign(args, connect_fn=connect_local) -> int:
    if error := _validate(args):
        return error
    from ...persistence.repositories.cluster_assignment import ClusterAssignmentRepository
    from ...pipeline.cluster_assignment import run_worker

    with connect_fn() as connection:
        result = run_worker(
            ClusterAssignmentRepository(connection),
            limit=args.limit,
            batch_size=args.batch_size,
            max_minutes=args.max_minutes,
            threshold=args.threshold,
            dry_run=args.dry_run,
        )
    return _print(result)


def handle_group(args, connect_fn=connect_local) -> int:
    if error := _validate(args):
        return error
    from ...persistence.repositories.new_cluster_grouping import NewClusterGroupingRepository
    from ...pipeline.new_cluster_grouping import run_worker

    with connect_fn() as connection:
        result = run_worker(
            NewClusterGroupingRepository(connection),
            limit=args.limit,
            threshold=args.threshold,
            min_members=args.min_members,
            max_minutes=args.max_minutes,
            dry_run=args.dry_run,
        )
    return _print(result)


def handle_name(args, connect_fn=connect_local) -> int:
    if error := _validate(args):
        return error
    from ...persistence.repositories.cluster_naming_summary import ClusterNamingSummaryRepository
    from ...pipeline.cluster_naming_summary import run_worker

    with connect_fn() as connection:
        result = run_worker(
            ClusterNamingSummaryRepository(connection),
            limit=args.limit,
            batch_size=args.batch_size,
            max_minutes=args.max_minutes,
            dry_run=args.dry_run,
        )
    return _print(result)

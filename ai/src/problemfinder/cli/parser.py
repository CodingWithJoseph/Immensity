"""Top-level argparse parser for safe continuous-pipeline foundations."""

from __future__ import annotations

import argparse

from .commands import db, scrape, status, sync, worker


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="python -m problemfinder.cli")
    subparsers = parser.add_subparsers(dest="command", required=True)
    for command in (db, scrape, worker, sync, status):
        command.register(subparsers)
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    return int(args.handler(args))

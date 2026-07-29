"""Local pipeline status: row counts grouped by status.

Pipeline state lives on each row's ``status`` column, so status is
``GROUP BY status`` over ``cluster_items`` (the conveyor) and ``clusters``.
"""

from __future__ import annotations

from typing import Any

from ...persistence.local import connect_local

_UNSET = "(unset)"


def register(subparsers) -> None:
    parser = subparsers.add_parser(
        "status", help="Show local cluster_items and clusters counts grouped by status"
    )
    parser.set_defaults(handler=handle_status)


def _counts_by_status(connection: Any, table: str) -> list[tuple[str | None, int]]:
    # table is a fixed literal (cluster_items / clusters), never user input.
    with connection.cursor() as cursor:
        cursor.execute(f"SELECT status, count(*) FROM {table} GROUP BY status ORDER BY status")
        return list(cursor.fetchall())


def format_status_table(title: str, rows: list[tuple[str | None, int]]) -> str:
    labelled = [((status if status is not None else _UNSET), int(count)) for status, count in rows]
    width = max([len("status")] + [len(status) for status, _ in labelled], default=len("status"))
    sep = f"  {'-' * width}  -----"
    lines = [title, f"  {'status'.ljust(width)}  count", sep]
    if not labelled:
        lines.append(f"  {'(no rows)'.ljust(width)}  {0:>5}")
        return "\n".join(lines)
    total = 0
    for status, count in labelled:
        lines.append(f"  {status.ljust(width)}  {count:>5}")
        total += count
    lines.append(sep)
    lines.append(f"  {'TOTAL'.ljust(width)}  {total:>5}")
    return "\n".join(lines)


def handle_status(_args, connect_fn=connect_local) -> int:
    with connect_fn() as connection:
        items = _counts_by_status(connection, "cluster_items")
        clusters = _counts_by_status(connection, "clusters")
    print(format_status_table("cluster_items", items))
    print()
    print(format_status_table("clusters", clusters))
    return 0

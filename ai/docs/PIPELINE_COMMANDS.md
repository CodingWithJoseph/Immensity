# Pipeline commands

| Stage | Command | Pass status |
|---|---|---|
| Scrape GitHub Issues + Reddit | `python -m problemfinder.cli scrape` | `scraped` |
| Clean | `python -m problemfinder.cli worker clean` | `filter_pending` |
| Filter | `python -m problemfinder.cli worker filter` | `classify_pending` |
| Extract problem statement + content gate | `python -m problemfinder.cli worker classify` | `embed_pending` |
| Embed | `python -m problemfinder.cli worker embed` | `assign_pending` |
| Assign | `python -m problemfinder.cli worker assign` | `assigned` or `new_cluster_candidate` |
| Group | `python -m problemfinder.cli worker group` | `grouped` |
| Cluster title/summary | `python -m problemfinder.cli worker name` | cluster `named` |
| Upload | `python -m problemfinder.cli sync publish` | cluster `ready` |

The scheduler runs these commands in order from Monday through Friday. Run
`python scripts/scheduler.py --dry-run --day Monday` to inspect a day without
executing it.

The scrape stage runs GitHub before Reddit inside its existing time allotment.
Use `--source github` or `--source reddit` for a source-specific manual run.
GitHub targets can be replaced with `GITHUB_REPOSITORIES` or repeated
`--github-repository owner/repository` arguments.

## Frozen weekly schedule and carryover contract

The local schedule is intentionally fixed:

| Day | Ordered stages |
|---|---|
| Monday | Scrape, clean, filter |
| Tuesday | Classify |
| Wednesday | Embed, assign, group |
| Thursday | Generate cluster name and summary |
| Friday | Upload |
| Saturday and Sunday | No scheduled work |

Every scheduled day has one shared eight-hour budget. A worker processes the
oldest pending rows until its configured row limit, stage limit, or remaining
nightly time is exhausted. Rows it did not claim keep their pending status and
are available the next time that stage is scheduled. Completed rows are not
reprocessed unless their source content changes and ingestion explicitly
requeues them.

Every published cluster has both `name` and `summary`, and every published post
has a `problem_statement`. Solutions, features, and signal analysis are
generated only when a user requests cluster analysis.

The upload command has one supported payload: named clusters and complete
problem items. It also removes stale scheduled signals and legacy post-level
solution/type values.

`python -m problemfinder.cli db migrate --yes` initializes a fresh database or
applies only migrations not already recorded in
`problemfinder_schema_migrations`.

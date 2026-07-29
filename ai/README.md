# ProblemFinder AI

ProblemFinder turns source posts into clusters of real, software-addressable
problems. Solution and feature analysis is deferred until a user requests it
with the full cluster as evidence.

## Supported flow

1. **Scrape** — collect GitHub issues and Reddit posts, then upsert both into
   `cluster_items`.
2. **Clean** — remove duplicates, deleted/empty posts, bots, stickied/NSFW
   posts, non-English content, same-author near-duplicates, bodies outside
   50–5,000 characters, and structurally unreadable content.
3. **Filter** — require a concrete current problem, then require that software
   can materially address it.
4. **Classify** — extract one normalized `problem_statement`; do not propose a
   solution or feature from an isolated post.
5. **Final content gate** — reject records missing `problem_statement`, using
   the searchable `missing_problem_statement` rejection reason.
6. **Embed and cluster** — embed the title, problem statement, and source body
   when present; assign existing clusters or group new ones.
7. **Title and summary** — generate one cluster title and summary from complete
   member problem statements.
8. **Upload** — publish complete problem records in named clusters, clear
   precomputed signals and legacy solution/type values, then remove stale
   pipeline-owned items and clusters.

## Commands

```text
python -m problemfinder.cli scrape
python -m problemfinder.cli worker clean
python -m problemfinder.cli worker filter
python -m problemfinder.cli worker classify
python -m problemfinder.cli worker embed
python -m problemfinder.cli worker assign
python -m problemfinder.cli worker group
python -m problemfinder.cli worker name
python -m problemfinder.cli sync publish
```

Every worker supports `--dry-run`, `--limit`, and `--max-minutes`. Streaming
workers also support `--batch-size`.

The scheduled `scrape` command runs GitHub first and Reddit second inside the
existing Monday scrape window. Use `scrape --source github` or
`scrape --source reddit` for a single source. GitHub defaults to a curated
20-repository pilot, issues updated in the last 90 days, and at most 200 issues
per repository. Pull requests are excluded. Set `GITHUB_REPOSITORIES` to a
comma-separated owner/repository list, or repeat `--github-repository`, to
replace the pilot targets. A `GITHUB_TOKEN` is optional but recommended.

## Human labeling

The repository has one supported labeling environment:
`notebook/problem_labeler.ipynb`. It labels only the decisions and generated
value used by the current pipeline:

- whether the source describes a real problem;
- whether software can materially address it;
- the grounded problem statement when both decisions pass.

Install and launch it from the repository root:

```text
python -m pip install -r requirements-labeling.txt
python -m jupyter lab notebook/problem_labeler.ipynb
```

The notebook reads the current local `cluster_items` table, can cache a batch
for offline work, and saves append-only JSONL labels under `data/labeling/`.
That directory is ignored by Git.

## Database migrations

Use the one supported migration command for both fresh databases and upgrades:

```text
python -m problemfinder.cli db migrate --yes
```

It applies each pending migration once. The problem-only migration removes
stored opportunity types, solution angles, and scheduled signals, then requeues
accepted records for embedding with the new title/problem/body input. Configure
credentials with `.env.example`. Run tests with
`python -m pytest tests -q`.

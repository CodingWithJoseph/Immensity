# Status vocabulary

`cluster_items.status` is the conveyor:

```text
scraped
  -> clean_running
  -> filter_pending
  -> filter_running
  -> classify_pending
  -> classify_running
  -> embed_pending
  -> embed_running
  -> assign_pending
  -> assign_running
  -> assigned | new_cluster_candidate
  -> grouped
```

Each qualification stage has separate terminal outcomes:

| Stage | Rejected | Failed |
|---|---|---|
| Clean | `clean_rejected` | `clean_failed` |
| Filter | `filter_rejected` | `filter_failed` |
| Classify/content gate | `classify_rejected` | `classify_failed` |
| Embed | — | `embed_failed` |
| Assign | — | `assign_failed` |

`rejected` means the content does not qualify. `failed` means code,
infrastructure, or model parsing failed.

Every rejected row carries a searchable `cluster_items.rejection_reason`.
The stable qualification reasons are `not_a_real_problem`,
`not_software_addressable`, and `missing_problem_statement`.

A row cannot enter embedding or assignment unless it has a non-empty
`problem_statement`. Software addressability is decided by the filter and is
not stored as another opportunity type.

`clusters.status` uses `proposed`, `named`, `ready`, and `sync_failed`.

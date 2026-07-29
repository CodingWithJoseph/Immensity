-- Local-only migration: split the conveyor's terminal "_failed" vocabulary into
-- "_rejected" (did not qualify — a quality decision) and "_failed" (something
-- broke — a worker/model exception).
--
-- Historically the reject path and the error path shared one status per step
-- (clean_failed / filter1_failed / filter2_failed / classify_failed). Going
-- forward the repos write the two outcomes to distinct statuses; this migration
-- backfills existing cluster_items rows to match.
--
-- Distinguishing the two on existing rows: the conveyor repos fold a per-step
-- debug key into raw_json — error_patch writes `{step}_error`, while a reject
-- writes `{step}_result`. So a `{step}_failed` row that carries `{step}_error`
-- was a genuine error and stays `_failed`; every other `{step}_failed` row was a
-- rejection and becomes `_rejected`. The clean worker writes no raw_json marker,
-- so all `clean_failed` rows are treated as rejections.
--
-- Local-only: the `status` column is never published to Supabase. Additive and
-- idempotent — re-running leaves the already-migrated rows untouched (the
-- remaining `_failed` rows all carry a `{step}_error` key).

-- clean: no per-row error marker exists, so every clean_failed row is a rejection.
UPDATE cluster_items
   SET status = 'clean_rejected', updated_at = now()
 WHERE status = 'clean_failed';

-- filter1: keep genuine errors (filter1_error present) as failed; the rest rejected.
UPDATE cluster_items
   SET status = 'filter1_rejected', updated_at = now()
 WHERE status = 'filter1_failed'
   AND NOT COALESCE(raw_json ? 'filter1_error', false);

-- filter2
UPDATE cluster_items
   SET status = 'filter2_rejected', updated_at = now()
 WHERE status = 'filter2_failed'
   AND NOT COALESCE(raw_json ? 'filter2_error', false);

-- classify
UPDATE cluster_items
   SET status = 'classify_rejected', updated_at = now()
 WHERE status = 'classify_failed'
   AND NOT COALESCE(raw_json ? 'classify_error', false);

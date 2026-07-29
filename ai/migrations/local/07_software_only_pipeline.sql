-- One-time reset for the software-addressable problem pipeline.
--
-- This intentionally re-queues every previously cleaned candidate so historical
-- trend/ideation and non-software records must pass the new rules. Run inside
-- the normal migration process after taking the database backup used for all
-- production migrations.

-- A missing generated field is SQL NULL. Remove every historical text sentinel.
ALTER TABLE cluster_items ADD COLUMN IF NOT EXISTS rejection_reason text;
CREATE INDEX IF NOT EXISTS idx_cluster_items_rejection_reason
    ON cluster_items(rejection_reason);

UPDATE cluster_items
SET problem_statement = NULL
WHERE lower(trim(coalesce(problem_statement, ''))) IN
      ('', 'n/a', 'na', 'none', 'not applicable', 'not available', 'null', 'unknown', 'unclear');

-- Remove all derived artifacts before reprocessing. This prevents an old
-- physical, service, trend, or ideation record from remaining discoverable.
UPDATE cluster_items
SET cluster_id = NULL,
    embedding = NULL,
    similarity_score = NULL,
    problem_statement = NULL,
    rejection_reason = NULL,
    status = 'filter_pending',
    updated_at = now()
WHERE status NOT IN ('scraped', 'clean_running', 'clean_rejected', 'clean_failed');

DROP TABLE IF EXISTS cluster_affected_users;
DROP TABLE IF EXISTS cluster_neighbors;
DROP TABLE IF EXISTS cluster_signals;
DROP TYPE IF EXISTS cluster_signal_status;
DELETE FROM clusters;

ALTER TABLE cluster_items
    DROP CONSTRAINT IF EXISTS cluster_items_complete_downstream_content;
ALTER TABLE cluster_items
    ADD CONSTRAINT cluster_items_complete_downstream_content
    CHECK (
        status NOT IN (
            'embed_pending', 'embed_running',
            'assign_pending', 'assign_running',
            'assigned', 'new_cluster_candidate', 'grouped'
        )
        OR NULLIF(trim(problem_statement), '') IS NOT NULL
    );

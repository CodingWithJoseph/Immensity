-- Keep the scheduled pipeline focused on discovering and grouping problems.
-- Solution design and signal analysis now happen only when a user requests
-- cluster analysis.

ALTER TABLE cluster_items
    DROP CONSTRAINT IF EXISTS cluster_items_software_opportunity_type,
    DROP CONSTRAINT IF EXISTS cluster_items_complete_downstream_content;

UPDATE cluster_items
SET rejection_reason = 'not_software_addressable',
    updated_at = now()
WHERE rejection_reason = 'non_software_opportunity';

-- Rebuild embeddings and clusters because embeddings now include title,
-- normalized problem statement, and source body rather than a solution angle.
UPDATE cluster_items
SET embedding = NULL,
    cluster_id = NULL,
    similarity_score = NULL,
    status = 'embed_pending',
    updated_at = now()
WHERE status IN (
        'embed_pending', 'embed_running',
        'assign_pending', 'assign_running',
        'assigned', 'new_cluster_candidate', 'grouped'
    )
  AND NULLIF(trim(problem_statement), '') IS NOT NULL;

UPDATE cluster_items
SET embedding = NULL,
    cluster_id = NULL,
    similarity_score = NULL,
    rejection_reason = 'missing_problem_statement',
    status = 'classify_rejected',
    updated_at = now()
WHERE status IN (
        'embed_pending', 'embed_running',
        'assign_pending', 'assign_running',
        'assigned', 'new_cluster_candidate', 'grouped'
    )
  AND NULLIF(trim(problem_statement), '') IS NULL;

DELETE FROM clusters;
DROP TABLE IF EXISTS cluster_snapshots;
DROP TABLE IF EXISTS cluster_signals;
DROP TYPE IF EXISTS cluster_signal_status;

ALTER TABLE cluster_items
    DROP COLUMN IF EXISTS opportunity_type,
    DROP COLUMN IF EXISTS opportunity_domain,
    DROP COLUMN IF EXISTS solution_angle;

ALTER TABLE cluster_items
    ADD CONSTRAINT cluster_items_problem_statement_required
    CHECK (
        status NOT IN (
            'embed_pending', 'embed_running',
            'assign_pending', 'assign_running',
            'assigned', 'new_cluster_candidate', 'grouped'
        )
        OR NULLIF(trim(problem_statement), '') IS NOT NULL
    );

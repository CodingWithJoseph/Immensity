CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS clusters (
    id integer PRIMARY KEY,
    name text,
    summary text,
    centroid vector(3072),
    status text NOT NULL DEFAULT 'proposed'
);

CREATE TABLE IF NOT EXISTS cluster_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    cluster_id integer REFERENCES clusters(id) ON DELETE SET NULL,
    platform text NOT NULL,
    community text,
    source_item_id text NOT NULL,
    title text NOT NULL,
    body text,
    url text,
    author text,
    score integer,
    num_comments integer,
    posted_at timestamptz,
    raw_json jsonb NOT NULL DEFAULT '{}'::jsonb,
    content_hash text,
    problem_statement text,
    rejection_reason text,
    embedding vector(3072),
    similarity_score double precision,
    status text NOT NULL DEFAULT 'scraped',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (platform, source_item_id)
);

-- CREATE TABLE IF NOT EXISTS does not add columns to an older cluster_items
-- table. Keep the base migration additive so pre-migration databases can reach
-- the current schema before indexes are created.
ALTER TABLE cluster_items
    ADD COLUMN IF NOT EXISTS rejection_reason text;

CREATE INDEX IF NOT EXISTS idx_cluster_items_status
    ON cluster_items(status);
CREATE INDEX IF NOT EXISTS idx_cluster_items_cluster_id
    ON cluster_items(cluster_id);
CREATE INDEX IF NOT EXISTS idx_cluster_items_rejection_reason
    ON cluster_items(rejection_reason);

-- Source context shared across Reddit, GitHub, Stack Exchange, and Hacker News.
ALTER TABLE cluster_items
    ADD COLUMN IF NOT EXISTS source_type text,
    ADD COLUMN IF NOT EXISTS source_group text;

CREATE INDEX IF NOT EXISTS idx_cluster_items_source_type
    ON cluster_items(source_type);
CREATE INDEX IF NOT EXISTS idx_cluster_items_source_group
    ON cluster_items(source_group);
CREATE INDEX IF NOT EXISTS idx_cluster_items_source_group_status
    ON cluster_items(source_group, status);

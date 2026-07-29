-- Remove local fields that do not affect routing, clustering, or publication.
-- The conveyor status and updated_at columns remain the source of truth for
-- resumable scheduled work.

UPDATE cluster_items
SET raw_json = raw_json - ARRAY[
    'filter1_result', 'filter1_error', 'filter1_raw_response',
    'filter2_result', 'filter2_error', 'filter2_raw_response',
    'filter_result', 'filter_error', 'filter_raw_response',
    'classify_result', 'classify_error', 'classify_raw_response',
    'embed_result', 'embed_error', 'embed_raw_response',
    'assign_result', 'assign_error', 'assign_raw_response'
]
WHERE raw_json ?| ARRAY[
    'filter1_result', 'filter1_error', 'filter1_raw_response',
    'filter2_result', 'filter2_error', 'filter2_raw_response',
    'filter_result', 'filter_error', 'filter_raw_response',
    'classify_result', 'classify_error', 'classify_raw_response',
    'embed_result', 'embed_error', 'embed_raw_response',
    'assign_result', 'assign_error', 'assign_raw_response'
];

ALTER TABLE cluster_items
    DROP COLUMN IF EXISTS permalink,
    DROP COLUMN IF EXISTS scraped_at,
    DROP COLUMN IF EXISTS distance_to_centroid,
    DROP COLUMN IF EXISTS membership_confidence,
    DROP COLUMN IF EXISTS assigned_by,
    DROP COLUMN IF EXISTS model_version;

ALTER TABLE clusters
    DROP COLUMN IF EXISTS first_seen;

DROP TABLE IF EXISTS pipeline_runs;

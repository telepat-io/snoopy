-- Persist per-item token usage and estimated cost so analytics can be
-- aggregated at post/comment/subreddit/job/system levels.
ALTER TABLE scan_items ADD prompt_tokens INTEGER NOT NULL DEFAULT 0;
ALTER TABLE scan_items ADD completion_tokens INTEGER NOT NULL DEFAULT 0;
ALTER TABLE scan_items ADD estimated_cost_usd REAL;

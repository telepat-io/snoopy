-- Add consumed flag to scan_items for the consume command
ALTER TABLE scan_items ADD COLUMN consumed INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_scan_items_consumed
  ON scan_items (job_id, qualified, consumed, created_at DESC);

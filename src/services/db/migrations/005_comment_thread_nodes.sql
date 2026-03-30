-- Persist root-to-target thread lineage for each scanned comment item.
CREATE TABLE IF NOT EXISTS comment_thread_nodes (
  id TEXT PRIMARY KEY,
  scan_item_id TEXT NOT NULL,
  reddit_comment_id TEXT NOT NULL,
  parent_reddit_comment_id TEXT,
  author TEXT NOT NULL,
  body TEXT NOT NULL,
  depth INTEGER NOT NULL,
  is_target INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (scan_item_id) REFERENCES scan_items(id)
);

CREATE INDEX IF NOT EXISTS idx_comment_thread_nodes_scan_item_depth
  ON comment_thread_nodes (scan_item_id, depth ASC);

CREATE INDEX IF NOT EXISTS idx_comment_thread_nodes_parent
  ON comment_thread_nodes (parent_reddit_comment_id);

CREATE INDEX IF NOT EXISTS idx_scan_items_job_qualified_posted
  ON scan_items (job_id, qualified, reddit_posted_at DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_scan_items_job_created
  ON scan_items (job_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_scan_items_created
  ON scan_items (created_at DESC);

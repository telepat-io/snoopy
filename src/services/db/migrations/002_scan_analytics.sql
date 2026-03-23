CREATE TABLE IF NOT EXISTS scan_items (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  run_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('post', 'comment')),
  reddit_post_id TEXT NOT NULL,
  reddit_comment_id TEXT,
  subreddit TEXT NOT NULL,
  author TEXT NOT NULL,
  title TEXT,
  body TEXT NOT NULL,
  url TEXT NOT NULL,
  reddit_posted_at TEXT NOT NULL,
  qualified INTEGER NOT NULL DEFAULT 0,
  qualification_reason TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (job_id) REFERENCES jobs(id),
  FOREIGN KEY (run_id) REFERENCES job_runs(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_scan_items_dedup
  ON scan_items (job_id, reddit_post_id, COALESCE(reddit_comment_id, ''));

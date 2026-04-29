import type Database from 'better-sqlite3';

export default {
  id: 1,
  name: 'baseline',
  up(db: Database.Database): void {
    db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS jobs (
        id TEXT PRIMARY KEY,
        slug TEXT UNIQUE,
        name TEXT NOT NULL UNIQUE,
        description TEXT NOT NULL,
        qualification_prompt TEXT NOT NULL,
        subreddits_json TEXT NOT NULL,
        schedule_cron TEXT NOT NULL DEFAULT '*/30 * * * *',
        enabled INTEGER NOT NULL DEFAULT 1,
        monitor_comments INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS job_runs (
        id TEXT PRIMARY KEY,
        job_id TEXT NOT NULL,
        status TEXT NOT NULL,
        message TEXT,
        started_at TEXT,
        finished_at TEXT,
        items_discovered INTEGER NOT NULL DEFAULT 0,
        items_new INTEGER NOT NULL DEFAULT 0,
        items_qualified INTEGER NOT NULL DEFAULT 0,
        prompt_tokens INTEGER NOT NULL DEFAULT 0,
        completion_tokens INTEGER NOT NULL DEFAULT 0,
        estimated_cost_usd REAL,
        log_file_path TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (job_id) REFERENCES jobs(id)
      );

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
        viewed INTEGER NOT NULL DEFAULT 0,
        validated INTEGER NOT NULL DEFAULT 0,
        processed INTEGER NOT NULL DEFAULT 0,
        consumed INTEGER NOT NULL DEFAULT 0,
        prompt_tokens INTEGER NOT NULL DEFAULT 0,
        completion_tokens INTEGER NOT NULL DEFAULT 0,
        estimated_cost_usd REAL,
        qualification_reason TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (job_id) REFERENCES jobs(id),
        FOREIGN KEY (run_id) REFERENCES job_runs(id)
      );

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

      CREATE TABLE IF NOT EXISTS daemon_state (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        is_running INTEGER NOT NULL,
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);

    // Belt-and-suspenders: these columns were historically added via inline
    // ALTER TABLE blocks. For edge-case databases that may be missing them,
    // we safely attempt to add each column and ignore "already exists" errors.
    const safeAddColumn = (table: string, column: string, type: string): void => {
      try {
        db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
      } catch {
        // Column already exists or table does not exist.
      }
    };

    safeAddColumn('jobs', 'slug', 'TEXT');
    safeAddColumn('jobs', 'monitor_comments', 'INTEGER NOT NULL DEFAULT 1');

    safeAddColumn('job_runs', 'started_at', 'TEXT');
    safeAddColumn('job_runs', 'finished_at', 'TEXT');
    safeAddColumn('job_runs', 'items_discovered', 'INTEGER NOT NULL DEFAULT 0');
    safeAddColumn('job_runs', 'items_new', 'INTEGER NOT NULL DEFAULT 0');
    safeAddColumn('job_runs', 'items_qualified', 'INTEGER NOT NULL DEFAULT 0');
    safeAddColumn('job_runs', 'prompt_tokens', 'INTEGER NOT NULL DEFAULT 0');
    safeAddColumn('job_runs', 'completion_tokens', 'INTEGER NOT NULL DEFAULT 0');
    safeAddColumn('job_runs', 'estimated_cost_usd', 'REAL');
    safeAddColumn('job_runs', 'log_file_path', 'TEXT');

    safeAddColumn('scan_items', 'viewed', 'INTEGER NOT NULL DEFAULT 0');
    safeAddColumn('scan_items', 'validated', 'INTEGER NOT NULL DEFAULT 0');
    safeAddColumn('scan_items', 'processed', 'INTEGER NOT NULL DEFAULT 0');
    safeAddColumn('scan_items', 'consumed', 'INTEGER NOT NULL DEFAULT 0');
    safeAddColumn('scan_items', 'prompt_tokens', 'INTEGER NOT NULL DEFAULT 0');
    safeAddColumn('scan_items', 'completion_tokens', 'INTEGER NOT NULL DEFAULT 0');
    safeAddColumn('scan_items', 'estimated_cost_usd', 'REAL');

    db.exec(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_jobs_slug ON jobs(slug);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_job_runs_active_job ON job_runs(job_id) WHERE status = 'running';
      CREATE UNIQUE INDEX IF NOT EXISTS idx_scan_items_dedup ON scan_items(job_id, reddit_post_id, COALESCE(reddit_comment_id, ''));
      CREATE INDEX IF NOT EXISTS idx_scan_items_job_qualified_posted ON scan_items(job_id, qualified, reddit_posted_at DESC, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_scan_items_job_created ON scan_items(job_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_scan_items_created ON scan_items(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_comment_thread_nodes_scan_item_depth ON comment_thread_nodes(scan_item_id, depth ASC);
      CREATE INDEX IF NOT EXISTS idx_comment_thread_nodes_parent ON comment_thread_nodes(parent_reddit_comment_id);
      CREATE INDEX IF NOT EXISTS idx_scan_items_consumed ON scan_items(job_id, qualified, consumed, created_at DESC);
    `);
  }
};

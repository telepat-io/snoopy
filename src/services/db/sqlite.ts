import Database from 'better-sqlite3';
import { ensureAppDirs } from '../../utils/paths.js';

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) {
    return db;
  }

  const paths = ensureAppDirs();
  db = new Database(paths.dbPath);
  try {
    db.pragma('journal_mode = WAL');
  } catch {
    // In rare concurrent startup cases (for example tests), DB may already be locked.
  }

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
      prompt_tokens INTEGER NOT NULL DEFAULT 0,
      completion_tokens INTEGER NOT NULL DEFAULT 0,
      estimated_cost_usd REAL,
      qualification_reason TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (job_id) REFERENCES jobs(id),
      FOREIGN KEY (run_id) REFERENCES job_runs(id)
    );

    CREATE TABLE IF NOT EXISTS daemon_state (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      is_running INTEGER NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  try {
    db.exec('ALTER TABLE jobs ADD COLUMN slug TEXT');
  } catch {
    // Column already exists.
  }

  try {
    db.exec('ALTER TABLE jobs ADD COLUMN monitor_comments INTEGER NOT NULL DEFAULT 1');
  } catch {
    // Column already exists.
  }

  db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_jobs_slug ON jobs(slug)');
  db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_scan_items_dedup ON scan_items(job_id, reddit_post_id, COALESCE(reddit_comment_id, ''))");

  try {
    db.exec('ALTER TABLE job_runs ADD COLUMN started_at TEXT');
  } catch {
    // Column already exists.
  }

  try {
    db.exec('ALTER TABLE job_runs ADD COLUMN finished_at TEXT');
  } catch {
    // Column already exists.
  }

  try {
    db.exec('ALTER TABLE job_runs ADD COLUMN items_discovered INTEGER NOT NULL DEFAULT 0');
  } catch {
    // Column already exists.
  }

  try {
    db.exec('ALTER TABLE job_runs ADD COLUMN items_new INTEGER NOT NULL DEFAULT 0');
  } catch {
    // Column already exists.
  }

  try {
    db.exec('ALTER TABLE job_runs ADD COLUMN items_qualified INTEGER NOT NULL DEFAULT 0');
  } catch {
    // Column already exists.
  }

  try {
    db.exec('ALTER TABLE job_runs ADD COLUMN prompt_tokens INTEGER NOT NULL DEFAULT 0');
  } catch {
    // Column already exists.
  }

  try {
    db.exec('ALTER TABLE job_runs ADD COLUMN completion_tokens INTEGER NOT NULL DEFAULT 0');
  } catch {
    // Column already exists.
  }

  try {
    db.exec('ALTER TABLE job_runs ADD COLUMN estimated_cost_usd REAL');
  } catch {
    // Column already exists.
  }

  try {
    db.exec('ALTER TABLE job_runs ADD COLUMN log_file_path TEXT');
  } catch {
    // Column already exists.
  }

  try {
    db.exec('ALTER TABLE scan_items ADD COLUMN viewed INTEGER NOT NULL DEFAULT 0');
  } catch {
    // Column already exists.
  }

  try {
    db.exec('ALTER TABLE scan_items ADD COLUMN validated INTEGER NOT NULL DEFAULT 0');
  } catch {
    // Column already exists.
  }

  try {
    db.exec('ALTER TABLE scan_items ADD COLUMN processed INTEGER NOT NULL DEFAULT 0');
  } catch {
    // Column already exists.
  }

  try {
    db.exec('ALTER TABLE scan_items ADD COLUMN prompt_tokens INTEGER NOT NULL DEFAULT 0');
  } catch {
    // Column already exists.
  }

  try {
    db.exec('ALTER TABLE scan_items ADD COLUMN completion_tokens INTEGER NOT NULL DEFAULT 0');
  } catch {
    // Column already exists.
  }

  try {
    db.exec('ALTER TABLE scan_items ADD COLUMN estimated_cost_usd REAL');
  } catch {
    // Column already exists.
  }

  return db;
}

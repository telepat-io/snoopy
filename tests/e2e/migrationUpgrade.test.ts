import Database from 'better-sqlite3';
import { runMigrations, getAppliedMigrations, getPendingMigrations } from '../../src/services/db/migrations/runner.js';
import { migrations } from '../../src/services/db/migrations/index.js';

describe('migration upgrade e2e', () => {
  function createTestDb(): Database.Database {
    return new Database(':memory:');
  }

  function tableExists(db: Database.Database, tableName: string): boolean {
    const row = db
      .prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?")
      .get(tableName) as { 1: number } | undefined;
    return Boolean(row);
  }

  function columnExists(db: Database.Database, tableName: string, columnName: string): boolean {
    const pragma = db.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{ name: string }>;
    return pragma.some((col) => col.name === columnName);
  }

  function indexExists(db: Database.Database, indexName: string): boolean {
    const row = db
      .prepare("SELECT 1 FROM sqlite_master WHERE type='index' AND name=?")
      .get(indexName) as { 1: number } | undefined;
    return Boolean(row);
  }

  it('upgrades a pre-002 database (only settings, jobs, job_runs) to full schema', () => {
    const db = createTestDb();

    // Simulate an ancient database created before 002_scan_analytics.sql
    db.exec(`
      CREATE TABLE settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE jobs (
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

      CREATE TABLE job_runs (
        id TEXT PRIMARY KEY,
        job_id TEXT NOT NULL,
        status TEXT NOT NULL,
        message TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);

    runMigrations(db);

    // All tables should exist
    expect(tableExists(db, 'settings')).toBe(true);
    expect(tableExists(db, 'jobs')).toBe(true);
    expect(tableExists(db, 'job_runs')).toBe(true);
    expect(tableExists(db, 'scan_items')).toBe(true);
    expect(tableExists(db, 'comment_thread_nodes')).toBe(true);
    expect(tableExists(db, 'daemon_state')).toBe(true);
    expect(tableExists(db, 'migrations')).toBe(true);

    // Indexes should exist
    expect(indexExists(db, 'idx_jobs_slug')).toBe(true);
    expect(indexExists(db, 'idx_scan_items_dedup')).toBe(true);
    expect(indexExists(db, 'idx_scan_items_consumed')).toBe(true);

    // Migration tracked
    const applied = getAppliedMigrations(db);
    expect(applied.length).toBe(migrations.length);
    expect(applied[0]!.name).toBe('baseline');
  });

  it('upgrades a pre-007 database (missing consumed column + migrations table)', () => {
    const db = createTestDb();

    // Simulate a database from before the consume command (before 007)
    db.exec(`
      CREATE TABLE settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE jobs (
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

      CREATE TABLE job_runs (
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
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE scan_items (
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
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE comment_thread_nodes (
        id TEXT PRIMARY KEY,
        scan_item_id TEXT NOT NULL,
        reddit_comment_id TEXT NOT NULL,
        parent_reddit_comment_id TEXT,
        author TEXT NOT NULL,
        body TEXT NOT NULL,
        depth INTEGER NOT NULL,
        is_target INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE daemon_state (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        is_running INTEGER NOT NULL,
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);

    // Pre-007 DB does NOT have the consumed column
    expect(columnExists(db, 'scan_items', 'consumed')).toBe(false);
    expect(tableExists(db, 'migrations')).toBe(false);

    runMigrations(db);

    // consumed column should now exist
    expect(columnExists(db, 'scan_items', 'consumed')).toBe(true);

    // migrations table should track baseline
    expect(tableExists(db, 'migrations')).toBe(true);
    const applied = getAppliedMigrations(db);
    expect(applied.length).toBe(migrations.length);
    expect(applied[0]!.name).toBe('baseline');

    // No pending migrations
    expect(getPendingMigrations(db).length).toBe(0);
  });

  it('is a no-op on an already-tracked database', () => {
    const db = createTestDb();

    // Start with a fully migrated DB
    runMigrations(db);

    const firstApplied = getAppliedMigrations(db);
    expect(firstApplied.length).toBe(migrations.length);

    // Run again — should be a no-op
    runMigrations(db);

    const secondApplied = getAppliedMigrations(db);
    expect(secondApplied).toEqual(firstApplied);

    // Verify no duplicate rows in migrations table
    const count = db.prepare('SELECT COUNT(*) as count FROM migrations WHERE id = 1').get() as {
      count: number;
    };
    expect(count.count).toBe(1);
  });
});

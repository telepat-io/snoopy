import Database from 'better-sqlite3';
import { runMigrations, getAppliedMigrations, getPendingMigrations } from '../../src/services/db/migrations/runner.js';
import { migrations } from '../../src/services/db/migrations/index.js';

describe('migration runner', () => {
  function createTestDb(): Database.Database {
    return new Database(':memory:');
  }

  it('creates the migrations table on first run', () => {
    const db = createTestDb();
    runMigrations(db);

    const table = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='migrations'").get() as
      | { name: string }
      | undefined;
    expect(table?.name).toBe('migrations');
  });

  it('applies all migrations on a fresh database', () => {
    const db = createTestDb();
    runMigrations(db);

    const applied = getAppliedMigrations(db);
    expect(applied.length).toBe(migrations.length);
    expect(applied.map((a) => a.id)).toEqual(migrations.map((m) => m.id));

    // Verify baseline schema was created
    const jobsTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='jobs'").get() as
      | { name: string }
      | undefined;
    expect(jobsTable?.name).toBe('jobs');

    const scanItemsTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='scan_items'").get() as
      | { name: string }
      | undefined;
    expect(scanItemsTable?.name).toBe('scan_items');
  });

  it('is idempotent on a pre-existing database with full schema', () => {
    const db = createTestDb();

    // Simulate an existing DB created by the old bootstrap
    db.exec(`
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
        consumed INTEGER NOT NULL DEFAULT 0,
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

    runMigrations(db);

    const applied = getAppliedMigrations(db);
    expect(applied.length).toBe(migrations.length);
    expect(applied[0]!.id).toBe(1);
    expect(applied[0]!.name).toBe('baseline');
  });

  it('skips already-applied migrations on subsequent runs', () => {
    const db = createTestDb();
    runMigrations(db);

    const firstApplied = getAppliedMigrations(db);
    expect(firstApplied.length).toBe(migrations.length);

    // Run again — should be a no-op
    runMigrations(db);

    const secondApplied = getAppliedMigrations(db);
    expect(secondApplied).toEqual(firstApplied);
  });

  it('reports pending migrations correctly', () => {
    const db = createTestDb();

    // Before running any migrations, everything is pending
    const pendingBefore = getPendingMigrations(db);
    expect(pendingBefore.length).toBe(migrations.length);

    runMigrations(db);

    const pendingAfter = getPendingMigrations(db);
    expect(pendingAfter.length).toBe(0);
  });

  it('reports applied migrations in ascending order', () => {
    const db = createTestDb();
    runMigrations(db);

    const applied = getAppliedMigrations(db);
    const ids = applied.map((a) => a.id);
    expect(ids).toEqual([...ids].sort((a, b) => a - b));
  });
});

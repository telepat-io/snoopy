import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';

function runDoctor(rootDir: string): string {
  const result = execSync('npx tsx src/cli/index.ts doctor', {
    cwd: process.cwd(),
    env: {
      ...process.env,
      SNOOPY_E2E_ROOT_DIR: rootDir,
      // Suppress keychain prompts on macOS
      SNOOPY_OPENROUTER_API_KEY: process.env.SNOOPY_OPENROUTER_API_KEY ?? 'test-key'
    },
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe']
  });

  return result;
}

function cleanup(rootDir: string): void {
  if (fs.existsSync(rootDir)) {
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
}

function assertContains(haystack: string, needle: string, label: string): void {
  if (!haystack.includes(needle)) {
    throw new Error(`Assertion failed [${label}]: expected stdout to contain "${needle}".\n\nActual stdout:\n${haystack}`);
  }
}

function columnExists(db: Database.Database, tableName: string, columnName: string): boolean {
  const pragma = db.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{ name: string }>;
  return pragma.some((col) => col.name === columnName);
}

function main(): void {
  const stamp = Date.now();
  const rootDir = path.join(os.tmpdir(), `snoopy-e2e-upgrade-${stamp}`);

  console.log(`[e2e:upgrade] Using temp dir: ${rootDir}`);

  try {
    // Create app dirs and an old pre-007 database
    fs.mkdirSync(path.join(rootDir, 'logs'), { recursive: true });
    fs.mkdirSync(path.join(rootDir, 'results'), { recursive: true });
    fs.mkdirSync(path.join(rootDir, 'startup'), { recursive: true });

    const dbPath = path.join(rootDir, 'snoopy.db');
    const db = new Database(dbPath);

    // Simulate a pre-007 database: all tables except consumed column and migrations table
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

    // Verify pre-upgrade state
    if (columnExists(db, 'scan_items', 'consumed')) {
      throw new Error('Pre-upgrade database should NOT have the consumed column');
    }

    const migrationsTable = db
      .prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='migrations'")
      .get() as { 1: number } | undefined;
    if (migrationsTable) {
      throw new Error('Pre-upgrade database should NOT have a migrations table');
    }

    db.close();
    console.log('[e2e:upgrade] ✅ Created pre-007 database');

    // Run the CLI doctor command, which triggers getDb() → runMigrations()
    const stdout = runDoctor(rootDir);

    assertContains(stdout, 'Migrations: 1 applied, 0 pending', 'migration state');
    console.log('[e2e:upgrade] ✅ Doctor reports migrations are up to date');

    // Verify the upgrade happened
    const upgradedDb = new Database(dbPath);

    if (!columnExists(upgradedDb, 'scan_items', 'consumed')) {
      throw new Error('Upgraded database should have the consumed column');
    }
    console.log('[e2e:upgrade] ✅ consumed column was added');

    const migrationsRow = upgradedDb
      .prepare('SELECT id, name FROM migrations WHERE id = 1')
      .get() as { id: number; name: string } | undefined;
    if (!migrationsRow || migrationsRow.name !== 'baseline') {
      throw new Error('Upgraded database should track the baseline migration');
    }
    console.log('[e2e:upgrade] ✅ baseline migration is tracked');

    upgradedDb.close();

    console.log('[e2e:upgrade] ✅ All assertions passed');
  } finally {
    cleanup(rootDir);
    console.log(`[e2e:upgrade] Cleaned up temp dir: ${rootDir}`);
  }
}

main();

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

function main(): void {
  const stamp = Date.now();
  const rootDir = path.join(os.tmpdir(), `snoopy-e2e-fresh-${stamp}`);

  console.log(`[e2e:fresh] Using temp dir: ${rootDir}`);

  try {
    const stdout = runDoctor(rootDir);

    assertContains(stdout, 'Migrations: 1 applied, 0 pending', 'migration state');
    console.log('[e2e:fresh] ✅ Doctor reports migrations are up to date');

    // Verify the DB file was created and has all expected tables
    const dbPath = path.join(rootDir, 'snoopy.db');
    if (!fs.existsSync(dbPath)) {
      throw new Error(`Database file was not created at ${dbPath}`);
    }

    const db = new Database(dbPath);
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table'")
      .all() as Array<{ name: string }>;
    const tableNames = tables.map((t) => t.name);

    const expectedTables = ['settings', 'jobs', 'job_runs', 'scan_items', 'comment_thread_nodes', 'daemon_state', 'migrations'];
    for (const table of expectedTables) {
      if (!tableNames.includes(table)) {
        throw new Error(`Expected table "${table}" not found in fresh database. Found: ${tableNames.join(', ')}`);
      }
    }

    console.log('[e2e:fresh] ✅ All expected tables exist in the database');
    db.close();

    console.log('[e2e:fresh] ✅ All assertions passed');
  } finally {
    cleanup(rootDir);
    console.log(`[e2e:fresh] Cleaned up temp dir: ${rootDir}`);
  }
}

main();

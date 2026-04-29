import Database from 'better-sqlite3';
import { ensureAppDirs } from '../../utils/paths.js';
import { runMigrations } from './migrations/runner.js';

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

  runMigrations(db);

  return db;
}

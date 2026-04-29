import type Database from 'better-sqlite3';
import { migrations, type Migration } from './index.js';

export function runMigrations(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  const appliedRows = db.prepare('SELECT id FROM migrations').all() as Array<{ id: number }>;
  const appliedIds = new Set(appliedRows.map((r) => r.id));

  for (const migration of migrations) {
    if (appliedIds.has(migration.id)) {
      continue;
    }

    const runInTransaction = db.transaction((mig: Migration) => {
      mig.up(db);
      db.prepare('INSERT INTO migrations (id, name) VALUES (?, ?)').run(mig.id, mig.name);
    });

    runInTransaction(migration);
  }
}

export function getAppliedMigrations(db: Database.Database): Array<{ id: number; name: string; appliedAt: string }> {
  try {
    return db
      .prepare('SELECT id, name, applied_at as appliedAt FROM migrations ORDER BY id ASC')
      .all() as Array<{ id: number; name: string; appliedAt: string }>;
  } catch {
    return [];
  }
}

export function getPendingMigrations(db: Database.Database): Migration[] {
  try {
    const appliedRows = db.prepare('SELECT id FROM migrations').all() as Array<{ id: number }>;
    const appliedIds = new Set(appliedRows.map((r) => r.id));

    return migrations.filter((m) => !appliedIds.has(m.id));
  } catch {
    return [...migrations];
  }
}

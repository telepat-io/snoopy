import type Database from 'better-sqlite3';

export default {
  id: 2,
  name: 'feedback_fields',
  up(db: Database.Database): void {
    const safeAddColumn = (table: string, column: string, type: string): void => {
      try {
        db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
      } catch {
        // Column already exists or table does not exist.
      }
    };

    safeAddColumn('scan_items', 'is_valid', 'INTEGER NOT NULL DEFAULT 0');
    safeAddColumn('scan_items', 'is_valid_reason', 'TEXT');
    safeAddColumn('scan_items', 'feedback_consolidated', 'INTEGER NOT NULL DEFAULT 0');

    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_scan_items_feedback_pending
      ON scan_items(job_id, qualified, validated, feedback_consolidated, created_at DESC)
    `);
  }
};

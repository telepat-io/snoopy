import { DEFAULT_NON_QUALIFIED_RETENTION_DAYS } from '../../types/settings.js';
import { getDb } from './sqlite.js';
import { ScanItemsRepository } from './repositories/scanItemsRepo.js';
import { SettingsRepository } from './repositories/settingsRepo.js';

export interface RedactResult {
  redacted: number;
  threadNodesDeleted: number;
}

export function redactOldNonQualifiedBodies(): RedactResult {
  const settingsRepo = new SettingsRepository();

  const rawRetention = settingsRepo.get('non_qualified_retention_days');
  const days = rawRetention
    ? Math.max(1, Math.floor(Number(rawRetention)))
    : DEFAULT_NON_QUALIFIED_RETENTION_DAYS;

  const scanItemsRepo = new ScanItemsRepository();

  const result = scanItemsRepo.redactNonQualifiedOlderThan(days);

  if (result.redacted > 0 || result.threadNodesDeleted > 0) {
    const db = getDb();
    try {
      db.pragma('wal_checkpoint(TRUNCATE)');
      db.exec('VACUUM');
    } catch {
      // VACUUM may fail under heavy write load; ignore.
    }
  }

  return result;
}

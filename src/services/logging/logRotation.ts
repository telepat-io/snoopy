import fs from 'node:fs';
import path from 'node:path';
import { ensureAppDirs } from '../../utils/paths.js';

const DEFAULT_MAX_AGE_MS = 5 * 24 * 60 * 60 * 1000; // 5 days

export function cleanupOldLogs(maxAgeMs: number = DEFAULT_MAX_AGE_MS): void {
  const paths = ensureAppDirs();
  const logsDir = path.join(paths.rootDir, 'logs');

  if (!fs.existsSync(logsDir)) {
    return;
  }

  const now = Date.now();
  const files = fs.readdirSync(logsDir);

  for (const file of files) {
    if (!file.startsWith('run-') || !file.endsWith('.log')) {
      continue;
    }

    const filePath = path.join(logsDir, file);
    try {
      const stat = fs.statSync(filePath);
      const age = now - stat.mtime.getTime();

      if (age > maxAgeMs) {
        fs.unlinkSync(filePath);
      }
    } catch {
      // Ignore errors (file might have been deleted, permission issues, etc.)
    }
  }
}

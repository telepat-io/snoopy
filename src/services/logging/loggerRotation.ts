import fs from 'node:fs';
import path from 'node:path';
import { ensureAppDirs } from '../../utils/paths.js';

const DEFAULT_MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const DEFAULT_MAX_ROTATED_FILES = 5;

function formatTimestamp(date: Date): string {
  const yyyy = String(date.getFullYear());
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mi = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${yyyy}${mm}${dd}-${hh}${mi}${ss}`;
}

export function rotateSystemLog(
  maxSizeBytes: number = DEFAULT_MAX_SIZE_BYTES,
  maxRotatedFiles: number = DEFAULT_MAX_ROTATED_FILES
): void {
  const paths = ensureAppDirs();
  const currentLogPath = path.join(paths.logsDir, 'snoopy.log');

  if (!fs.existsSync(currentLogPath)) {
    return;
  }

  let stat: fs.Stats;
  try {
    stat = fs.statSync(currentLogPath);
  } catch {
    return;
  }

  if (stat.size < maxSizeBytes) {
    return;
  }

  const ts = formatTimestamp(new Date());
  const rotatedPath = path.join(paths.logsDir, `snoopy.${ts}.log`);

  try {
    fs.renameSync(currentLogPath, rotatedPath);
  } catch {
    // If rename fails (e.g. another process already rotated), nothing to do.
    return;
  }

  const entries = fs.readdirSync(paths.logsDir);
  const rotatedFiles = entries
    .filter((f) => f.startsWith('snoopy.') && f.endsWith('.log') && f !== 'snoopy.log')
    .sort();

  while (rotatedFiles.length > maxRotatedFiles) {
    const oldest = rotatedFiles.shift()!;
    try {
      fs.unlinkSync(path.join(paths.logsDir, oldest));
    } catch {
      // Ignore unlink failures.
    }
  }
}

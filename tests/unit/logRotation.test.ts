import fs from 'node:fs';
import path from 'node:path';
import { cleanupOldLogs } from '../../src/services/logging/logRotation.js';
import { ensureAppDirs } from '../../src/utils/paths.js';

describe('logRotation', () => {
  it('deletes only old run log files', () => {
    const paths = ensureAppDirs();
    const oldLogPath = path.join(paths.logsDir, 'run-old.log');
    const freshLogPath = path.join(paths.logsDir, 'run-fresh.log');
    const ignoredPath = path.join(paths.logsDir, 'snoopy.log');

    fs.writeFileSync(oldLogPath, 'old');
    fs.writeFileSync(freshLogPath, 'fresh');
    fs.writeFileSync(ignoredPath, 'ignored');

    const oldTime = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000);
    fs.utimesSync(oldLogPath, oldTime, oldTime);

    cleanupOldLogs();

    expect(fs.existsSync(oldLogPath)).toBe(false);
    expect(fs.existsSync(freshLogPath)).toBe(true);
    expect(fs.existsSync(ignoredPath)).toBe(true);
  });
});

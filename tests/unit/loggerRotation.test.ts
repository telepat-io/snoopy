import fs from 'node:fs';
import path from 'node:path';
import { ensureAppDirs } from '../../src/utils/paths.js';
import { rotateSystemLog } from '../../src/services/logging/loggerRotation.js';

function getLogPath(): string {
  const paths = ensureAppDirs();
  return path.join(paths.logsDir, 'snoopy.log');
}

function writeLargeLog(sizeBytes: number): void {
  const logPath = getLogPath();

  const chunks: string[] = [];
  let written = 0;
  const line = `${'x'.repeat(200)}\n`;
  const lineLen = Buffer.byteLength(line);

  while (written < sizeBytes) {
    chunks.push(line);
    written += lineLen;
  }

  fs.writeFileSync(logPath, chunks.join(''), 'utf8');
}

function listRotatedFiles(): string[] {
  const paths = ensureAppDirs();
  return fs
    .readdirSync(paths.logsDir)
    .filter((f) => f.startsWith('snoopy.') && f.endsWith('.log') && f !== 'snoopy.log')
    .sort();
}

describe('rotateSystemLog', () => {
  beforeEach(() => {
    // Remove any existing snoopy.log and rotated files
    const paths = ensureAppDirs();
    const entries = fs.readdirSync(paths.logsDir);
    for (const entry of entries) {
      if (entry.startsWith('snoopy') && entry.endsWith('.log')) {
        fs.unlinkSync(path.join(paths.logsDir, entry));
      }
    }
  });

  it('does not rotate when log file is under size threshold', () => {
    writeLargeLog(1 * 1024); // 1 KB

    const logPath = getLogPath();
    const originalSize = fs.statSync(logPath).size;

    rotateSystemLog(1 * 1024 * 1024); // 1 MB threshold

    expect(fs.existsSync(logPath)).toBe(true);
    expect(fs.statSync(logPath).size).toBe(originalSize);
    expect(listRotatedFiles()).toHaveLength(0);
  });

  it('rotates log file when over size threshold', () => {
    writeLargeLog(2 * 1024 * 1024); // 2 MB

    const logPath = getLogPath();
    expect(fs.existsSync(logPath)).toBe(true);

    rotateSystemLog(1 * 1024 * 1024); // 1 MB threshold

    // Old log should be rotated (renamed, no longer at original path)
    expect(fs.existsSync(logPath)).toBe(false);
    expect(listRotatedFiles()).toHaveLength(1);
  });

  it('deletes oldest rotated files when exceeding max count', () => {
    // Create 5 pre-existing rotated files
    const paths = ensureAppDirs();
    const timestamps = ['20260101-000000', '20260102-000000', '20260103-000000', '20260104-000000', '20260105-000000'];
    for (const ts of timestamps) {
      fs.writeFileSync(path.join(paths.logsDir, `snoopy.${ts}.log`), `rotated content ${ts}`, 'utf8');
    }

    expect(listRotatedFiles()).toHaveLength(5);

    // Write a current log that's over threshold
    writeLargeLog(2 * 1024 * 1024); // 2 MB

    // Rotate with max 3 files
    rotateSystemLog(1 * 1024 * 1024, 3);

    // 5 pre-existing + 1 new rotation = 6 total, max 3 → 3 oldest deleted
    const rotated = listRotatedFiles();
    expect(rotated.length).toBeLessThanOrEqual(3);
    // Oldest remaining should be 20260104 (20260101-20260103 deleted)
    expect(rotated[0]!).toContain('20260104');
  });

  it('handles missing snoopy.log gracefully', () => {
    const logPath = getLogPath();
    if (fs.existsSync(logPath)) {
      fs.unlinkSync(logPath);
    }

    expect(() => rotateSystemLog()).not.toThrow();
  });

  it('rotates log when at or above threshold', () => {
    writeLargeLog(1 * 1024 * 1024); // ~1 MB

    const logPath = getLogPath();
    const actualSize = fs.statSync(logPath).size;

    // Threshold equals actual size — check is stat.size < threshold (strict)
    // At exact threshold size, condition is false so rotation happens
    rotateSystemLog(actualSize);

    // Rotation should occur (size >= threshold means rotate)
    expect(fs.existsSync(logPath)).toBe(false);
    expect(listRotatedFiles()).toHaveLength(1);
  });

  it('rotates log when size is one byte over threshold', () => {
    writeLargeLog(1 * 1024 * 1024); // 1 MB (slightly over due to exact line sizes)

    const logPath = getLogPath();
    const size = fs.statSync(logPath).size;

    // Threshold one byte below should rotate
    rotateSystemLog(size - 1);

    expect(fs.existsSync(logPath)).toBe(false);
    expect(listRotatedFiles()).toHaveLength(1);
  });

  it('ignores non-rotated snoopy log files when counting', () => {
    const paths = ensureAppDirs();
    // Create a file that matches the rotated pattern but isn't a rotated log
    fs.writeFileSync(path.join(paths.logsDir, 'snoopy.other.txt'), 'not a log', 'utf8');
    // Create the actual rotated files
    fs.writeFileSync(path.join(paths.logsDir, 'snoopy.20260101-000000.log'), 'old', 'utf8');

    writeLargeLog(2 * 1024 * 1024);

    rotateSystemLog(1 * 1024 * 1024, 5);

    // The .txt file should still be there (not cleaned up)
    expect(fs.existsSync(path.join(paths.logsDir, 'snoopy.other.txt'))).toBe(true);
    expect(listRotatedFiles().length).toBeLessThanOrEqual(4);
  });

  it('uses default thresholds when called without arguments', () => {
    writeLargeLog(11 * 1024 * 1024); // 11 MB (over default 10 MB)

    const logPath = getLogPath();

    rotateSystemLog(); // Uses 10 MB default and 5 max

    expect(fs.existsSync(logPath)).toBe(false);
    expect(listRotatedFiles()).toHaveLength(1);
  });

  it('does not rotate log under default threshold', () => {
    writeLargeLog(5 * 1024 * 1024); // 5 MB (under default 10 MB)

    const logPath = getLogPath();

    rotateSystemLog(); // Uses 10 MB default

    expect(fs.existsSync(logPath)).toBe(true);
    expect(listRotatedFiles()).toHaveLength(0);
  });
});

import fs from 'node:fs';

const LOG_ENTRY_START = /^\[[^\]]+\] \[[^\]]+\]/;
const ERROR_ENTRY_START = /^\[[^\]]+\] \[ERROR\]/;

export function readRunLog(logFilePath: string | null | undefined): string | null {
  if (!logFilePath || !fs.existsSync(logFilePath)) {
    return null;
  }

  return fs.readFileSync(logFilePath, 'utf8');
}

export function extractErrorEntries(logContent: string): string[] {
  const lines = logContent.split('\n');
  const entries: string[] = [];
  let current: string[] = [];
  let inErrorEntry = false;

  for (const line of lines) {
    if (ERROR_ENTRY_START.test(line)) {
      if (current.length > 0) {
        entries.push(current.join('\n').trimEnd());
      }
      current = [line];
      inErrorEntry = true;
      continue;
    }

    if (LOG_ENTRY_START.test(line)) {
      if (current.length > 0) {
        entries.push(current.join('\n').trimEnd());
      }
      current = [];
      inErrorEntry = false;
      continue;
    }

    if (inErrorEntry) {
      current.push(line);
    }
  }

  if (current.length > 0) {
    entries.push(current.join('\n').trimEnd());
  }

  return entries.filter((entry) => entry.length > 0);
}

export function hasErrorEntries(logContent: string | null): boolean {
  if (!logContent) {
    return false;
  }

  return extractErrorEntries(logContent).length > 0;
}

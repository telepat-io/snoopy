import fs from 'node:fs';
import path from 'node:path';
import { ensureAppDirs } from './paths.js';

function write(level: string, message: string): void {
  const paths = ensureAppDirs();
  const line = `[${new Date().toISOString()}] [${level}] ${message}\n`;
  const file = path.join(paths.logsDir, 'snoopy.log');
  fs.appendFileSync(file, line);
}

export const logger = {
  info: (message: string) => write('INFO', message),
  warn: (message: string) => write('WARN', message),
  error: (message: string) => write('ERROR', message)
};

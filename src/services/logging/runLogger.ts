import fs from 'node:fs';
import path from 'node:path';
import { ensureAppDirs } from '../../utils/paths.js';

export interface RunLogger {
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
  logRequest(method: string, endpoint: string, payload: unknown): void;
  logResponse(statusCode: number | string, body: unknown): void;
  getLogFilePath(): string;
}

export function createRunLogger(runId: string): RunLogger {
  const paths = ensureAppDirs();
  const logsDir = path.join(paths.rootDir, 'logs');
  const logFilePath = path.join(logsDir, `run-${runId}.log`);

  // Ensure logs directory exists
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  function formatTimestamp(): string {
    return new Date().toISOString();
  }

  function writeLog(level: string, message: string): void {
    const entry = `[${formatTimestamp()}] [${level}] ${message}\n`;
    fs.appendFileSync(logFilePath, entry, 'utf8');
  }

  return {
    info(message: string): void {
      writeLog('INFO', message);
    },

    warn(message: string): void {
      writeLog('WARN', message);
    },

    error(message: string): void {
      writeLog('ERROR', message);
    },

    logRequest(method: string, endpoint: string, payload: unknown): void {
      const entry = `[${formatTimestamp()}] [REQUEST] ${method} ${endpoint}\n${JSON.stringify(payload, null, 2)}\n`;
      fs.appendFileSync(logFilePath, entry, 'utf8');
    },

    logResponse(statusCode: number | string, body: unknown): void {
      const entry = `[${formatTimestamp()}] [RESPONSE] Status ${statusCode}\n${JSON.stringify(body, null, 2)}\n`;
      fs.appendFileSync(logFilePath, entry, 'utf8');
    },

    getLogFilePath(): string {
      return logFilePath;
    }
  };
}

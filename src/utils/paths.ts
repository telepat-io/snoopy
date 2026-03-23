import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export interface AppPaths {
  rootDir: string;
  dbPath: string;
  logsDir: string;
  resultsDir: string;
  pidFilePath: string;
  startupDir: string;
}

export function getAppPaths(): AppPaths {
  const rootDir = process.env.SNOOPY_ROOT_DIR || path.join(os.homedir(), '.snoopy');
  return {
    rootDir,
    dbPath: path.join(rootDir, 'snoopy.db'),
    logsDir: path.join(rootDir, 'logs'),
    resultsDir: path.join(rootDir, 'results'),
    pidFilePath: path.join(rootDir, 'daemon.pid'),
    startupDir: path.join(rootDir, 'startup')
  };
}

export function ensureAppDirs(): AppPaths {
  const paths = getAppPaths();
  [paths.rootDir, paths.logsDir, paths.resultsDir, paths.startupDir].forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
  return paths;
}

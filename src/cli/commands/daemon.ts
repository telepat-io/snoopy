import fs from 'node:fs';
import { CronScheduler } from '../../services/scheduler/cronScheduler.js';
import { cleanupOldLogs } from '../../services/logging/logRotation.js';
import { ensureAppDirs } from '../../utils/paths.js';
import {
  ensureDaemonRunning,
  isDaemonRunning,
  requestDaemonReload
} from '../../services/daemonControl.js';
import {
  printCliHeader,
  printError,
  printInfo,
  printMuted,
  printSection,
  printSuccess,
  printWarning
} from '../ui/consoleUi.js';

let scheduler: CronScheduler | null = null;

export function daemonRun(): void {
  ensureAppDirs();
  cleanupOldLogs();
  printCliHeader('Daemon mode');
  printSection('Daemon');
  scheduler = new CronScheduler();
  scheduler.start();

  process.on('SIGTERM', () => {
    scheduler?.stop();
    process.exit(0);
  });

  process.on('SIGINT', () => {
    scheduler?.stop();
    process.exit(0);
  });

  process.on('SIGUSR2', () => {
    scheduler?.reload();
  });

  setInterval(() => {
    // Keep event loop alive for cron tasks.
  }, 60_000);

  printSuccess('Snoopy daemon is running.');
  printMuted('Press Ctrl+C to stop.');
}

export function daemonReload(): void {
  printCliHeader('Daemon control');
  printSection('Daemon Reload');

  const result = requestDaemonReload();
  if (!result.pid) {
    printWarning('Daemon is not running.');
    return;
  }

  if (!result.reloaded) {
    printError(`Could not reload daemon schedules for pid ${result.pid}.`);
    printMuted('If this persists, restart the daemon with snoopy daemon stop && snoopy daemon start.');
    return;
  }

  printSuccess(`Reloaded daemon schedules (pid ${result.pid}).`);
}

export function daemonStart(): void {
  printCliHeader('Daemon control');
  printSection('Daemon Start');
  const status = ensureDaemonRunning();
  if (!status.started) {
    printWarning(`Daemon already running${status.pid ? ` (pid ${status.pid})` : ''}.`);
    return;
  }
  printSuccess(`Daemon started (pid ${status.pid}).`);
}

export function daemonStop(): void {
  printCliHeader('Daemon control');
  printSection('Daemon Stop');
  const paths = ensureAppDirs();
  if (!fs.existsSync(paths.pidFilePath)) {
    printWarning('Daemon is not running.');
    return;
  }

  const pid = Number(fs.readFileSync(paths.pidFilePath, 'utf8'));
  try {
    process.kill(pid, 'SIGTERM');
  } catch {
    // Ignore if already dead.
  }
  fs.unlinkSync(paths.pidFilePath);
  printSuccess('Daemon stopped.');
}

export function daemonStatus(): void {
  printCliHeader('Daemon control');
  printSection('Daemon Status');
  const status = isDaemonRunning();
  if (!status.pid) {
    printInfo('Daemon status: stopped');
    return;
  }

  if (status.running) {
    printSuccess(`Daemon status: running (pid ${status.pid})`);
    return;
  }

  printError(`Daemon status: stale pid file (pid ${status.pid})`);
  printMuted('Run snoopy daemon stop to clear stale state.');
}

import fs from 'node:fs';
import { spawn } from 'node:child_process';
import { CronScheduler } from '../../services/scheduler/cronScheduler.js';
import { cleanupOldLogs } from '../../services/logging/logRotation.js';
import { ensureAppDirs } from '../../utils/paths.js';
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

function getDaemonPid(): number | null {
  const paths = ensureAppDirs();
  if (!fs.existsSync(paths.pidFilePath)) {
    return null;
  }

  const pid = Number(fs.readFileSync(paths.pidFilePath, 'utf8'));
  return Number.isFinite(pid) ? pid : null;
}

export function isDaemonRunning(): { running: boolean; pid: number | null } {
  const pid = getDaemonPid();
  if (!pid) {
    return { running: false, pid: null };
  }

  try {
    process.kill(pid, 0);
    return { running: true, pid };
  } catch {
    return { running: false, pid };
  }
}

export function ensureDaemonRunning(): { started: boolean; pid: number | null } {
  const paths = ensureAppDirs();
  const status = isDaemonRunning();
  if (status.running) {
    return { started: false, pid: status.pid };
  }

  if (fs.existsSync(paths.pidFilePath)) {
    fs.unlinkSync(paths.pidFilePath);
  }

  const child = spawn(process.execPath, [process.argv[1]!, 'daemon', 'run'], {
    detached: true,
    stdio: 'ignore'
  });

  child.unref();
  const pid = child.pid ?? null;
  if (pid !== null) {
    fs.writeFileSync(paths.pidFilePath, String(pid));
  }
  return { started: true, pid };
}

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

  setInterval(() => {
    // Keep event loop alive for cron tasks.
  }, 60_000);

  printSuccess('Snoopy daemon is running.');
  printMuted('Press Ctrl+C to stop.');
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

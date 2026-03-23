import fs from 'node:fs';
import { spawn } from 'node:child_process';
import { ensureAppDirs } from '../utils/paths.js';

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

export function requestDaemonReload(): { reloaded: boolean; pid: number | null } {
  const status = isDaemonRunning();
  if (!status.running || !status.pid) {
    return { reloaded: false, pid: status.pid };
  }

  try {
    process.kill(status.pid, 'SIGUSR2');
    return { reloaded: true, pid: status.pid };
  } catch {
    return { reloaded: false, pid: status.pid };
  }
}

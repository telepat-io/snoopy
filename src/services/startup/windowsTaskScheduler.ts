import { execFileSync } from 'node:child_process';

const TASK_NAME = 'Snoopy\\Daemon';

function validateWindowsStartupCommandPath(commandPath: string): void {
  const trimmedPath = commandPath.trim();
  const isAbsoluteWindowsPath = /^[a-zA-Z]:[\\/]/.test(trimmedPath);

  if (!trimmedPath || !isAbsoluteWindowsPath || /["\r\n]/.test(trimmedPath)) {
    throw new Error('Startup command path must be an absolute Windows path without quotes or newlines.');
  }
}

export function installWindowsTask(commandPath: string): void {
  // Startup persistence is explicit user opt-in through startup commands.
  // Use execFileSync argument arrays to avoid cmd.exe parsing/injection risks.
  validateWindowsStartupCommandPath(commandPath);
  const runTarget = `"${commandPath}" daemon run`;
  execFileSync('schtasks', ['/create', '/tn', TASK_NAME, '/tr', runTarget, '/sc', 'onlogon', '/f'], {
    stdio: 'pipe'
  });
}

export function uninstallWindowsTask(): void {
  try {
    execFileSync('schtasks', ['/delete', '/tn', TASK_NAME, '/f'], { stdio: 'pipe' });
  } catch {
    // Ignore when task does not exist.
  }
}

export function hasWindowsTaskInstalled(): boolean {
  try {
    execFileSync('schtasks', ['/query', '/tn', TASK_NAME], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

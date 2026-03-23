import { execSync } from 'node:child_process';

const TASK_NAME = 'Snoopy\\Daemon';

export function installWindowsTask(commandPath: string): void {
  const runTarget = `"${commandPath}" daemon run`;
  const command = `schtasks /create /tn "${TASK_NAME}" /tr ${JSON.stringify(runTarget)} /sc onlogon /f`;
  execSync(command, { shell: 'cmd.exe' });
}

export function uninstallWindowsTask(): void {
  try {
    execSync(`schtasks /delete /tn "${TASK_NAME}" /f`, { shell: 'cmd.exe' });
  } catch {
    // Ignore when task does not exist.
  }
}

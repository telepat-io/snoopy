import { execSync } from 'node:child_process';

const REG_PATH = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run';
const REG_VALUE = 'SnoopyDaemon';

export function installWindowsRunFallback(commandPath: string): void {
  const startupValue = `"${commandPath}" daemon run`;
  const cmd = `reg add "${REG_PATH}" /v "${REG_VALUE}" /t REG_SZ /d ${JSON.stringify(startupValue)} /f`;
  execSync(cmd, { shell: 'cmd.exe' });
}

export function uninstallWindowsRunFallback(): void {
  try {
    execSync(`reg delete "${REG_PATH}" /v "${REG_VALUE}" /f`, { shell: 'cmd.exe' });
  } catch {
    // Ignore when key does not exist.
  }
}

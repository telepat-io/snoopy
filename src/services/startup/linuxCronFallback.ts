import { execSync } from 'node:child_process';

export function installLinuxCronFallback(commandPath: string): void {
  const entry = `@reboot ${commandPath} daemon run >> ~/.snoopy/logs/cron.log 2>&1`;
  let current = '';
  try {
    current = execSync('crontab -l', { encoding: 'utf8' });
  } catch {
    current = '';
  }

  if (!current.includes(entry)) {
    const payload = `${current.trim()}\n${entry}\n`.trimStart();
    execSync('crontab -', { input: `${payload}\n` });
  }
}

export function uninstallLinuxCronFallback(): void {
  let current = '';
  try {
    current = execSync('crontab -l', { encoding: 'utf8' });
  } catch {
    return;
  }

  const lines = current
    .split('\n')
    .filter((line) => !line.includes('snoopy daemon run'));

  execSync('crontab -', { input: `${lines.join('\n')}\n` });
}

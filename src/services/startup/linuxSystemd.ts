import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execSync } from 'node:child_process';

const SERVICE_NAME = 'snoopy-daemon.service';

export function hasSystemdUser(): boolean {
  try {
    execSync('systemctl --user --version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

export function installLinuxSystemd(commandPath: string): string {
  const systemdDir = path.join(os.homedir(), '.config', 'systemd', 'user');
  const servicePath = path.join(systemdDir, SERVICE_NAME);
  fs.mkdirSync(systemdDir, { recursive: true });

  const content = `[Unit]
Description=Snoopy Daemon
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
ExecStart=${commandPath} daemon run
Restart=always
RestartSec=10

[Install]
WantedBy=default.target
`;

  fs.writeFileSync(servicePath, content);
  execSync('systemctl --user daemon-reload');
  execSync(`systemctl --user enable ${SERVICE_NAME}`);
  execSync(`systemctl --user restart ${SERVICE_NAME}`);
  return servicePath;
}

export function uninstallLinuxSystemd(): void {
  const servicePath = path.join(os.homedir(), '.config', 'systemd', 'user', SERVICE_NAME);
  execSync(`systemctl --user disable --now ${SERVICE_NAME} >/dev/null 2>&1 || true`);
  if (fs.existsSync(servicePath)) {
    fs.unlinkSync(servicePath);
  }
  execSync('systemctl --user daemon-reload >/dev/null 2>&1 || true');
}

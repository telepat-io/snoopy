import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { hasSystemdUser, installLinuxSystemd, uninstallLinuxSystemd } from './linuxSystemd.js';
import { installLinuxCronFallback, uninstallLinuxCronFallback } from './linuxCronFallback.js';
import { installMacStartup, uninstallMacStartup } from './macosLaunchd.js';
import { installWindowsRunFallback, uninstallWindowsRunFallback } from './windowsRunFallback.js';
import { installWindowsTask, uninstallWindowsTask } from './windowsTaskScheduler.js';

export interface StartupInstallResult {
  success: boolean;
  method: string;
  detail: string;
}

export interface StartupStatusResult {
  enabled: boolean;
  method: string;
  detail: string;
}

export function installStartup(commandPath: string): StartupInstallResult {
  if (process.platform === 'darwin') {
    const detail = installMacStartup(commandPath);
    return { success: true, method: 'launchd', detail };
  }

  if (process.platform === 'linux') {
    if (hasSystemdUser()) {
      const detail = installLinuxSystemd(commandPath);
      return { success: true, method: 'systemd-user', detail };
    }

    installLinuxCronFallback(commandPath);
    return { success: true, method: 'cron-@reboot', detail: 'crontab entry installed' };
  }

  if (process.platform === 'win32') {
    try {
      installWindowsTask(commandPath);
      return { success: true, method: 'task-scheduler', detail: 'Task Scheduler job created' };
    } catch {
      installWindowsRunFallback(commandPath);
      return { success: true, method: 'registry-run', detail: 'Registry startup entry created' };
    }
  }

  return { success: false, method: 'unsupported', detail: 'Unsupported platform' };
}

export function uninstallStartup(): void {
  if (process.platform === 'darwin') {
    uninstallMacStartup();
  }

  if (process.platform === 'linux') {
    uninstallLinuxSystemd();
    uninstallLinuxCronFallback();
  }

  if (process.platform === 'win32') {
    uninstallWindowsTask();
    uninstallWindowsRunFallback();
  }
}

export function getStartupStatus(): StartupStatusResult {
  if (process.platform === 'darwin') {
    const plistPath = path.join(os.homedir(), 'Library', 'LaunchAgents', 'com.snoopy.daemon.plist');
    const enabled = fs.existsSync(plistPath);
    return {
      enabled,
      method: 'launchd',
      detail: enabled ? plistPath : 'LaunchAgent not installed'
    };
  }

  if (process.platform === 'linux') {
    const systemdPath = path.join(os.homedir(), '.config', 'systemd', 'user', 'snoopy-daemon.service');
    if (fs.existsSync(systemdPath)) {
      return {
        enabled: true,
        method: 'systemd-user',
        detail: systemdPath
      };
    }

    try {
      const crontab = execSync('crontab -l', { encoding: 'utf8' });
      const enabled = crontab.includes('snoopy daemon run');
      return {
        enabled,
        method: 'cron-@reboot',
        detail: enabled ? 'crontab entry present' : 'crontab entry not present'
      };
    } catch {
      return {
        enabled: false,
        method: hasSystemdUser() ? 'systemd-user' : 'cron-@reboot',
        detail: 'No startup registration found'
      };
    }
  }

  if (process.platform === 'win32') {
    try {
      execSync('schtasks /query /tn "Snoopy\\Daemon"', { shell: 'cmd.exe', stdio: 'ignore' });
      return {
        enabled: true,
        method: 'task-scheduler',
        detail: 'Scheduled task exists'
      };
    } catch {
      try {
        execSync('reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "SnoopyDaemon"', {
          shell: 'cmd.exe',
          stdio: 'ignore'
        });
        return {
          enabled: true,
          method: 'registry-run',
          detail: 'Registry startup entry exists'
        };
      } catch {
        return {
          enabled: false,
          method: 'task-scheduler',
          detail: 'No startup registration found'
        };
      }
    }
  }

  return {
    enabled: false,
    method: 'unsupported',
    detail: 'Unsupported platform'
  };
}

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { hasSystemdUser, installLinuxSystemd, uninstallLinuxSystemd } from './linuxSystemd.js';
import { installLinuxCronFallback, uninstallLinuxCronFallback } from './linuxCronFallback.js';
import { installMacStartup, uninstallMacStartup } from './macosLaunchd.js';
import { hasWindowsTaskInstalled, installWindowsTask, uninstallWindowsTask } from './windowsTaskScheduler.js';

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
    // On Windows we intentionally use a single explicit method.
    // If task creation fails, we do not silently fall back to registry persistence.
    try {
      installWindowsTask(commandPath);
      return { success: true, method: 'task-scheduler', detail: 'Task Scheduler job created' };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        method: 'task-scheduler',
        detail: `Task Scheduler startup setup failed: ${message}`
      };
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
    if (hasWindowsTaskInstalled()) {
      return {
        enabled: true,
        method: 'task-scheduler',
        detail: 'Scheduled task exists'
      };
    }

    return {
      enabled: false,
      method: 'task-scheduler',
      detail: 'No startup registration found'
    };
  }

  return {
    enabled: false,
    method: 'unsupported',
    detail: 'Unsupported platform'
  };
}

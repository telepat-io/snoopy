const mockExistsSync = jest.fn();
const mockMkdirSync = jest.fn();
const mockWriteFileSync = jest.fn();
const mockUnlinkSync = jest.fn();
const mockExecSync = jest.fn();
const mockHomedir = jest.fn(() => '/Users/tester');

jest.mock('node:fs', () => ({
  __esModule: true,
  default: {
    existsSync: (...args: unknown[]) => mockExistsSync(...args),
    mkdirSync: (...args: unknown[]) => mockMkdirSync(...args),
    writeFileSync: (...args: unknown[]) => mockWriteFileSync(...args),
    unlinkSync: (...args: unknown[]) => mockUnlinkSync(...args)
  }
}));

jest.mock('node:os', () => ({
  __esModule: true,
  default: {
    homedir: () => mockHomedir()
  }
}));

jest.mock('node:child_process', () => ({
  execSync: (...args: unknown[]) => mockExecSync(...args)
}));

import path from 'node:path';
import { installLinuxCronFallback, uninstallLinuxCronFallback } from '../../src/services/startup/linuxCronFallback.js';
import { hasSystemdUser, installLinuxSystemd, uninstallLinuxSystemd } from '../../src/services/startup/linuxSystemd.js';
import { installMacStartup, uninstallMacStartup } from '../../src/services/startup/macosLaunchd.js';
import { installWindowsRunFallback, uninstallWindowsRunFallback } from '../../src/services/startup/windowsRunFallback.js';
import { installWindowsTask, uninstallWindowsTask } from '../../src/services/startup/windowsTaskScheduler.js';

describe('startup platform helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHomedir.mockReturnValue('/Users/tester');
    mockExistsSync.mockReturnValue(false);
    mockExecSync.mockReturnValue('');
  });

  it('writes and unloads/loads the mac launchd plist', () => {
    const plistPath = path.join('/Users/tester', 'Library', 'LaunchAgents', 'com.snoopy.daemon.plist');

    const result = installMacStartup('/usr/local/bin/snoopy');

    expect(result).toBe(plistPath);
    expect(mockMkdirSync).toHaveBeenCalledWith(path.join('/Users/tester', 'Library', 'LaunchAgents'), {
      recursive: true
    });
    expect(mockWriteFileSync).toHaveBeenCalledWith(plistPath, expect.stringContaining('<string>/usr/local/bin/snoopy</string>'));
    expect(mockExecSync).toHaveBeenNthCalledWith(1, `launchctl unload ${plistPath} >/dev/null 2>&1 || true`);
    expect(mockExecSync).toHaveBeenNthCalledWith(2, `launchctl load ${plistPath}`);
  });

  it('removes the mac launchd plist when present', () => {
    const plistPath = path.join('/Users/tester', 'Library', 'LaunchAgents', 'com.snoopy.daemon.plist');
    mockExistsSync.mockReturnValue(true);

    uninstallMacStartup();

    expect(mockExecSync).toHaveBeenCalledWith(`launchctl unload ${plistPath} >/dev/null 2>&1 || true`);
    expect(mockUnlinkSync).toHaveBeenCalledWith(plistPath);
  });

  it('detects systemd support based on systemctl availability', () => {
    mockExecSync.mockReturnValueOnce('systemd 255');
    expect(hasSystemdUser()).toBe(true);

    mockExecSync.mockImplementationOnce(() => {
      throw new Error('missing systemd');
    });
    expect(hasSystemdUser()).toBe(false);
  });

  it('writes and enables the linux systemd user service', () => {
    const servicePath = path.join('/Users/tester', '.config', 'systemd', 'user', 'snoopy-daemon.service');

    const result = installLinuxSystemd('/usr/bin/snoopy');

    expect(result).toBe(servicePath);
    expect(mockMkdirSync).toHaveBeenCalledWith(path.join('/Users/tester', '.config', 'systemd', 'user'), {
      recursive: true
    });
    expect(mockWriteFileSync).toHaveBeenCalledWith(servicePath, expect.stringContaining('ExecStart=/usr/bin/snoopy daemon run'));
    expect(mockExecSync).toHaveBeenCalledWith('systemctl --user daemon-reload');
    expect(mockExecSync).toHaveBeenCalledWith('systemctl --user enable snoopy-daemon.service');
    expect(mockExecSync).toHaveBeenCalledWith('systemctl --user restart snoopy-daemon.service');
  });

  it('uninstalls the linux systemd service and reloads the daemon', () => {
    const servicePath = path.join('/Users/tester', '.config', 'systemd', 'user', 'snoopy-daemon.service');
    mockExistsSync.mockReturnValue(true);

    uninstallLinuxSystemd();

    expect(mockExecSync).toHaveBeenCalledWith('systemctl --user disable --now snoopy-daemon.service >/dev/null 2>&1 || true');
    expect(mockUnlinkSync).toHaveBeenCalledWith(servicePath);
    expect(mockExecSync).toHaveBeenCalledWith('systemctl --user daemon-reload >/dev/null 2>&1 || true');
  });

  it('installs the linux cron fallback only when the entry is missing', () => {
    mockExecSync.mockReturnValueOnce('MAILTO=user@example.com\n');

    installLinuxCronFallback('/usr/bin/snoopy');

    expect(mockExecSync).toHaveBeenNthCalledWith(1, 'crontab -l', { encoding: 'utf8' });
    expect(mockExecSync).toHaveBeenNthCalledWith(
      2,
      'crontab -',
      expect.objectContaining({ input: expect.stringContaining('@reboot /usr/bin/snoopy daemon run') })
    );

    jest.clearAllMocks();
    mockExecSync.mockReturnValueOnce('@reboot /usr/bin/snoopy daemon run >> ~/.snoopy/logs/cron.log 2>&1\n');
    installLinuxCronFallback('/usr/bin/snoopy');

    expect(mockExecSync).toHaveBeenCalledTimes(1);
  });

  it('uninstalls the linux cron fallback and ignores missing crontabs', () => {
    mockExecSync
      .mockReturnValueOnce('@reboot /usr/bin/snoopy daemon run >> ~/.snoopy/logs/cron.log 2>&1\nMAILTO=user@example.com\n')
      .mockReturnValueOnce('');

    uninstallLinuxCronFallback();

    expect(mockExecSync).toHaveBeenNthCalledWith(1, 'crontab -l', { encoding: 'utf8' });
    expect(mockExecSync).toHaveBeenNthCalledWith(
      2,
      'crontab -',
      expect.objectContaining({ input: expect.stringContaining('MAILTO=user@example.com') })
    );

    jest.clearAllMocks();
    mockExecSync.mockImplementationOnce(() => {
      throw new Error('no crontab');
    });

    expect(() => uninstallLinuxCronFallback()).not.toThrow();
    expect(mockExecSync).toHaveBeenCalledTimes(1);
  });

  it('creates and removes the windows registry startup entry', () => {
    installWindowsRunFallback('C:/Tools/snoopy.exe');

    expect(mockExecSync).toHaveBeenCalledWith(
      'reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "SnoopyDaemon" /t REG_SZ /d "\\"C:/Tools/snoopy.exe\\" daemon run" /f',
      { shell: 'cmd.exe' }
    );

    jest.clearAllMocks();
    uninstallWindowsRunFallback();
    expect(mockExecSync).toHaveBeenCalledWith(
      'reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "SnoopyDaemon" /f',
      { shell: 'cmd.exe' }
    );
  });

  it('ignores missing windows registry startup entries on uninstall', () => {
    mockExecSync.mockImplementationOnce(() => {
      throw new Error('missing key');
    });

    expect(() => uninstallWindowsRunFallback()).not.toThrow();
  });

  it('creates and removes the windows scheduled task', () => {
    installWindowsTask('C:/Tools/snoopy.exe');

    expect(mockExecSync).toHaveBeenCalledWith(
      'schtasks /create /tn "Snoopy\\Daemon" /tr "\\"C:/Tools/snoopy.exe\\" daemon run" /sc onlogon /f',
      { shell: 'cmd.exe' }
    );

    jest.clearAllMocks();
    uninstallWindowsTask();
    expect(mockExecSync).toHaveBeenCalledWith('schtasks /delete /tn "Snoopy\\Daemon" /f', {
      shell: 'cmd.exe'
    });
  });

  it('ignores missing scheduled tasks on uninstall', () => {
    mockExecSync.mockImplementationOnce(() => {
      throw new Error('missing task');
    });

    expect(() => uninstallWindowsTask()).not.toThrow();
  });
});

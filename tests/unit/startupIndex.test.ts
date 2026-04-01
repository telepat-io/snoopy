const mockExistsSync = jest.fn();
const mockExecSync = jest.fn();
const mockHomedir = jest.fn(() => '/Users/tester');

jest.mock('node:fs', () => ({
  __esModule: true,
  default: {
    existsSync: (...args: unknown[]) => mockExistsSync(...args)
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

const originalPlatform = process.platform;

function setPlatform(platform: NodeJS.Platform): void {
  Object.defineProperty(process, 'platform', {
    configurable: true,
    value: platform
  });
}

async function loadStartupIndex() {
  jest.resetModules();

  const mocks = {
    hasSystemdUser: jest.fn(),
    installLinuxSystemd: jest.fn(),
    uninstallLinuxSystemd: jest.fn(),
    installLinuxCronFallback: jest.fn(),
    uninstallLinuxCronFallback: jest.fn(),
    installMacStartup: jest.fn(),
    uninstallMacStartup: jest.fn(),
    installWindowsRunFallback: jest.fn(),
    uninstallWindowsRunFallback: jest.fn(),
    installWindowsTask: jest.fn(),
    uninstallWindowsTask: jest.fn()
  };

  jest.doMock('../../src/services/startup/linuxSystemd.js', () => ({
    hasSystemdUser: mocks.hasSystemdUser,
    installLinuxSystemd: mocks.installLinuxSystemd,
    uninstallLinuxSystemd: mocks.uninstallLinuxSystemd
  }));
  jest.doMock('../../src/services/startup/linuxCronFallback.js', () => ({
    installLinuxCronFallback: mocks.installLinuxCronFallback,
    uninstallLinuxCronFallback: mocks.uninstallLinuxCronFallback
  }));
  jest.doMock('../../src/services/startup/macosLaunchd.js', () => ({
    installMacStartup: mocks.installMacStartup,
    uninstallMacStartup: mocks.uninstallMacStartup
  }));
  jest.doMock('../../src/services/startup/windowsRunFallback.js', () => ({
    installWindowsRunFallback: mocks.installWindowsRunFallback,
    uninstallWindowsRunFallback: mocks.uninstallWindowsRunFallback
  }));
  jest.doMock('../../src/services/startup/windowsTaskScheduler.js', () => ({
    installWindowsTask: mocks.installWindowsTask,
    uninstallWindowsTask: mocks.uninstallWindowsTask
  }));

  const startup = await import('../../src/services/startup/index.js');
  return { startup, mocks };
}

describe('startup index', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHomedir.mockReturnValue('/Users/tester');
    mockExistsSync.mockReturnValue(false);
    mockExecSync.mockReturnValue('');
    setPlatform(originalPlatform);
  });

  afterEach(() => {
    setPlatform(originalPlatform);
  });

  it('installs startup via launchd on macOS', async () => {
    const { startup, mocks } = await loadStartupIndex();
    setPlatform('darwin');
    mocks.installMacStartup.mockReturnValue('/Users/tester/Library/LaunchAgents/com.snoopy.daemon.plist');

    const result = startup.installStartup('/usr/local/bin/snoopy');

    expect(mocks.installMacStartup).toHaveBeenCalledWith('/usr/local/bin/snoopy');
    expect(result).toEqual({
      success: true,
      method: 'launchd',
      detail: '/Users/tester/Library/LaunchAgents/com.snoopy.daemon.plist'
    });
  });

  it('installs startup via systemd or cron on linux', async () => {
    const { startup, mocks } = await loadStartupIndex();
    setPlatform('linux');
    mocks.hasSystemdUser.mockReturnValue(true);
    mocks.installLinuxSystemd.mockReturnValue('/Users/tester/.config/systemd/user/snoopy-daemon.service');

    expect(startup.installStartup('/usr/bin/snoopy')).toEqual({
      success: true,
      method: 'systemd-user',
      detail: '/Users/tester/.config/systemd/user/snoopy-daemon.service'
    });
    expect(mocks.installLinuxSystemd).toHaveBeenCalledWith('/usr/bin/snoopy');

    mocks.hasSystemdUser.mockReturnValue(false);
    expect(startup.installStartup('/usr/bin/snoopy')).toEqual({
      success: true,
      method: 'cron-@reboot',
      detail: 'crontab entry installed'
    });
    expect(mocks.installLinuxCronFallback).toHaveBeenCalledWith('/usr/bin/snoopy');
  });

  it('installs startup via task scheduler or registry fallback on windows', async () => {
    const { startup, mocks } = await loadStartupIndex();
    setPlatform('win32');

    expect(startup.installStartup('C:/Tools/snoopy.exe')).toEqual({
      success: true,
      method: 'task-scheduler',
      detail: 'Task Scheduler job created'
    });
    expect(mocks.installWindowsTask).toHaveBeenCalledWith('C:/Tools/snoopy.exe');

    mocks.installWindowsTask.mockImplementationOnce(() => {
      throw new Error('task scheduler failed');
    });
    expect(startup.installStartup('C:/Tools/snoopy.exe')).toEqual({
      success: true,
      method: 'registry-run',
      detail: 'Registry startup entry created'
    });
    expect(mocks.installWindowsRunFallback).toHaveBeenCalledWith('C:/Tools/snoopy.exe');
  });

  it('returns unsupported startup installation on unknown platforms', async () => {
    const { startup } = await loadStartupIndex();
    setPlatform('freebsd' as NodeJS.Platform);

    expect(startup.installStartup('/opt/snoopy')).toEqual({
      success: false,
      method: 'unsupported',
      detail: 'Unsupported platform'
    });
  });

  it('uninstalls startup using platform-specific handlers', async () => {
    let loaded = await loadStartupIndex();
    setPlatform('darwin');
    loaded.startup.uninstallStartup();
    expect(loaded.mocks.uninstallMacStartup).toHaveBeenCalledTimes(1);

    loaded = await loadStartupIndex();
    setPlatform('linux');
    loaded.startup.uninstallStartup();
    expect(loaded.mocks.uninstallLinuxSystemd).toHaveBeenCalledTimes(1);
    expect(loaded.mocks.uninstallLinuxCronFallback).toHaveBeenCalledTimes(1);

    loaded = await loadStartupIndex();
    setPlatform('win32');
    loaded.startup.uninstallStartup();
    expect(loaded.mocks.uninstallWindowsTask).toHaveBeenCalledTimes(1);
    expect(loaded.mocks.uninstallWindowsRunFallback).toHaveBeenCalledTimes(1);
  });

  it('reports mac startup status from launch agent existence', async () => {
    const { startup } = await loadStartupIndex();
    setPlatform('darwin');
    mockExistsSync.mockReturnValue(true);

    expect(startup.getStartupStatus()).toEqual({
      enabled: true,
      method: 'launchd',
      detail: '/Users/tester/Library/LaunchAgents/com.snoopy.daemon.plist'
    });

    mockExistsSync.mockReturnValue(false);
    expect(startup.getStartupStatus()).toEqual({
      enabled: false,
      method: 'launchd',
      detail: 'LaunchAgent not installed'
    });
  });

  it('reports linux startup status from systemd or cron state', async () => {
    const { startup, mocks } = await loadStartupIndex();
    setPlatform('linux');

    mockExistsSync.mockReturnValue(true);
    expect(startup.getStartupStatus()).toEqual({
      enabled: true,
      method: 'systemd-user',
      detail: '/Users/tester/.config/systemd/user/snoopy-daemon.service'
    });

    mockExistsSync.mockReturnValue(false);
    mockExecSync.mockReturnValue('@reboot /usr/bin/snoopy daemon run\n');
    expect(startup.getStartupStatus()).toEqual({
      enabled: true,
      method: 'cron-@reboot',
      detail: 'crontab entry present'
    });

    mockExecSync.mockReturnValue('MAILTO=user@example.com\n');
    expect(startup.getStartupStatus()).toEqual({
      enabled: false,
      method: 'cron-@reboot',
      detail: 'crontab entry not present'
    });

    mockExecSync.mockImplementationOnce(() => {
      throw new Error('no crontab');
    });
    mocks.hasSystemdUser.mockReturnValue(true);
    expect(startup.getStartupStatus()).toEqual({
      enabled: false,
      method: 'systemd-user',
      detail: 'No startup registration found'
    });
  });

  it('reports windows startup status from task scheduler or registry fallbacks', async () => {
    const { startup } = await loadStartupIndex();
    setPlatform('win32');

    expect(startup.getStartupStatus()).toEqual({
      enabled: true,
      method: 'task-scheduler',
      detail: 'Scheduled task exists'
    });

    mockExecSync.mockImplementationOnce(() => {
      throw new Error('task missing');
    });
    expect(startup.getStartupStatus()).toEqual({
      enabled: true,
      method: 'registry-run',
      detail: 'Registry startup entry exists'
    });

    mockExecSync
      .mockImplementationOnce(() => {
        throw new Error('task missing');
      })
      .mockImplementationOnce(() => {
        throw new Error('registry missing');
      });
    expect(startup.getStartupStatus()).toEqual({
      enabled: false,
      method: 'task-scheduler',
      detail: 'No startup registration found'
    });
  });

  it('reports unsupported startup status on unknown platforms', async () => {
    const { startup } = await loadStartupIndex();
    setPlatform('freebsd' as NodeJS.Platform);

    expect(startup.getStartupStatus()).toEqual({
      enabled: false,
      method: 'unsupported',
      detail: 'Unsupported platform'
    });
  });
});

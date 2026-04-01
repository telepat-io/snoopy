const mockExistsSync = jest.fn();
const mockReadFileSync = jest.fn();
const mockGetDb = jest.fn();
const mockJobsList = jest.fn();
const mockRunsLatestWithJobNames = jest.fn();
const mockExtractErrorEntries = jest.fn();
const mockReadRunLog = jest.fn();
const mockGetOpenRouterApiKey = jest.fn();
const mockGetStartupStatus = jest.fn();
const mockEnsureAppDirs = jest.fn();
const mockPrintCommandScreen = jest.fn();
const mockPrintError = jest.fn();
const mockPrintInfo = jest.fn();
const mockPrintKeyValue = jest.fn();
const mockPrintMuted = jest.fn();
const mockPrintSection = jest.fn();
const mockPrintSuccess = jest.fn();
const mockPrintWarning = jest.fn();
const mockFormatRunDisplayTimestamp = jest.fn((...args: unknown[]) => {
  void args;
  return 'TS run';
});

const FIXED_NOW = Date.parse('2026-04-01T12:00:00.000Z');

function hoursAgoIso(hours: number): string {
  return new Date(FIXED_NOW - hours * 60 * 60 * 1000).toISOString();
}

jest.mock('node:fs', () => ({
  __esModule: true,
  default: {
    existsSync: (...args: unknown[]) => mockExistsSync(...args),
    readFileSync: (...args: unknown[]) => mockReadFileSync(...args)
  }
}));

jest.mock('../../src/services/db/sqlite.js', () => ({
  getDb: (...args: unknown[]) => mockGetDb(...args)
}));

jest.mock('../../src/services/db/repositories/jobsRepo.js', () => ({
  JobsRepository: class {
    list() {
      return mockJobsList();
    }
  }
}));

jest.mock('../../src/services/db/repositories/runsRepo.js', () => ({
  RunsRepository: class {
    latestWithJobNames(limit?: number) {
      return mockRunsLatestWithJobNames(limit);
    }
  }
}));

jest.mock('../../src/services/logging/logReader.js', () => ({
  extractErrorEntries: (...args: unknown[]) => mockExtractErrorEntries(...args),
  readRunLog: (...args: unknown[]) => mockReadRunLog(...args)
}));

jest.mock('../../src/services/security/secretStore.js', () => ({
  getOpenRouterApiKey: (...args: unknown[]) => mockGetOpenRouterApiKey(...args)
}));

jest.mock('../../src/services/startup/index.js', () => ({
  getStartupStatus: (...args: unknown[]) => mockGetStartupStatus(...args)
}));

jest.mock('../../src/utils/paths.js', () => ({
  ensureAppDirs: (...args: unknown[]) => mockEnsureAppDirs(...args)
}));

jest.mock('../../src/cli/ui/consoleUi.js', () => ({
  printCommandScreen: mockPrintCommandScreen,
  printError: mockPrintError,
  printInfo: mockPrintInfo,
  printKeyValue: mockPrintKeyValue,
  printMuted: mockPrintMuted,
  printSection: mockPrintSection,
  printSuccess: mockPrintSuccess,
  printWarning: mockPrintWarning
}));

jest.mock('../../src/cli/ui/time.js', () => ({
  formatRunDisplayTimestamp: (value: unknown) => mockFormatRunDisplayTimestamp(value)
}));

import { runDoctor } from '../../src/cli/commands/doctor.js';

describe('runDoctor coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Date, 'now').mockReturnValue(FIXED_NOW);
    mockEnsureAppDirs.mockReturnValue({
      dbPath: '/tmp/snoopy.db',
      pidFilePath: '/tmp/snoopy.pid'
    });
    mockGetDb.mockReturnValue({
      prepare: () => ({
        get: () => ({ ok: 1 })
      })
    });
    mockJobsList.mockReturnValue([
      { id: 'job-1', enabled: true },
      { id: 'job-2', enabled: false }
    ]);
    mockRunsLatestWithJobNames.mockReturnValue([]);
    mockExtractErrorEntries.mockReturnValue([]);
    mockReadRunLog.mockReturnValue(null);
    mockGetOpenRouterApiKey.mockResolvedValue('api-key');
    mockGetStartupStatus.mockReturnValue({
      enabled: true,
      method: 'launchd',
      detail: 'configured'
    });
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(String(process.pid));
    jest.spyOn(process, 'kill').mockImplementation(((pid: number, signal?: NodeJS.Signals | number) => {
      if (signal === 0) {
        return true;
      }

      throw new Error('unexpected signal');
    }) as typeof process.kill);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('prints healthy diagnostics and no recent errors', async () => {
    await runDoctor();

    expect(mockPrintCommandScreen).toHaveBeenCalledWith('Diagnostics', 'Snoopy Doctor');
    expect(mockRunsLatestWithJobNames).toHaveBeenCalledWith(20);
    expect(mockPrintKeyValue).toHaveBeenCalledWith('Platform', process.platform);
    expect(mockPrintKeyValue).toHaveBeenCalledWith('Node', process.version);
    expect(mockPrintSuccess).toHaveBeenCalledWith('Database: DB reachable at /tmp/snoopy.db');
    expect(mockPrintSuccess).toHaveBeenCalledWith('OpenRouter API key: configured');
    expect(mockPrintInfo).toHaveBeenCalledWith('Jobs: 2 total, 1 enabled');
    expect(mockPrintSuccess).toHaveBeenCalledWith(`Daemon: Daemon running (pid ${process.pid})`);
    expect(mockPrintInfo).toHaveBeenCalledWith('Startup on reboot: enabled via launchd');
    expect(mockPrintInfo).toHaveBeenCalledWith('Startup details: configured');
    expect(mockPrintSuccess).toHaveBeenCalledWith('No recent job run failures or logged errors in the last 24 hours.');
  });

  it('warns when the daemon pid file is missing and still prints environment details', async () => {
    mockExistsSync.mockReturnValue(false);

    await runDoctor();

    expect(mockPrintWarning).toHaveBeenCalledWith('Daemon: Daemon not running (no pid file)');
    expect(mockPrintMuted).toHaveBeenCalledWith('  → Run: snoopy daemon start  to start the background daemon');
    expect(mockPrintInfo).toHaveBeenCalledWith('Startup details: configured');
    expect(mockReadFileSync).not.toHaveBeenCalled();
  });

  it('prints remediation guidance for database, api key, daemon, and recent failures', async () => {
    mockGetDb.mockImplementation(() => {
      throw new Error('db unavailable');
    });
    mockGetOpenRouterApiKey.mockResolvedValue(null);
    mockGetStartupStatus.mockReturnValue({
      enabled: false,
      method: 'cron-@reboot',
      detail: 'not configured'
    });
    mockReadFileSync.mockReturnValue('not-a-number');
    mockRunsLatestWithJobNames.mockReturnValue([
      {
        id: 'run-1',
        jobId: 'job-1',
        jobName: 'Alpha',
        status: 'failed',
        message: 'run failed',
        createdAt: hoursAgoIso(1),
        logFilePath: '/tmp/run-1.log'
      }
    ]);
    mockReadRunLog.mockReturnValue('run log');
    mockExtractErrorEntries.mockReturnValue(['[2026-03-01T00:00:00Z] [ERROR] last error']);

    await runDoctor();

    expect(mockPrintError).toHaveBeenCalledWith('Database: DB error: Error: db unavailable');
    expect(mockPrintMuted).toHaveBeenCalledWith('  → Check that /tmp/snoopy.db is accessible and not corrupted');
    expect(mockPrintWarning).toHaveBeenCalledWith('OpenRouter API key: missing');
    expect(mockPrintMuted).toHaveBeenCalledWith('  → Run: snoopy settings  to configure your OpenRouter API key');
    expect(mockPrintWarning).toHaveBeenCalledWith('Daemon: Invalid daemon pid file');
    expect(mockPrintMuted).toHaveBeenCalledWith('  → Run: snoopy daemon start  to start the background daemon');
    expect(mockPrintInfo).toHaveBeenCalledWith('Startup on reboot: disabled via cron-@reboot');
    expect(mockPrintWarning).toHaveBeenCalledWith('Found 1 recent run(s) with failures or logged errors.');
    expect(mockPrintMuted).toHaveBeenCalledWith(
      '  → Review job config with: snoopy job  or investigate logs with: snoopy logs <runId>'
    );
    expect(mockPrintWarning).toHaveBeenCalledWith('TS run Alpha (failed)');
    expect(mockPrintKeyValue).toHaveBeenCalledWith('Run ID', 'run-1');
    expect(mockPrintKeyValue).toHaveBeenCalledWith('Message', 'run failed');
    expect(mockPrintInfo).toHaveBeenCalledWith('[2026-03-01T00:00:00Z] [ERROR] last error');
  });

  it('reports recent logged errors even for non-failed runs and falls back to the job id', async () => {
    mockRunsLatestWithJobNames.mockReturnValue([
      {
        id: 'run-2',
        jobId: 'job-2',
        jobName: null,
        status: 'completed',
        message: null,
        createdAt: hoursAgoIso(2),
        logFilePath: '/tmp/run-2.log'
      }
    ]);
    mockReadRunLog.mockReturnValue('run log 2');
    mockExtractErrorEntries.mockReturnValue([
      '[2026-03-01T00:00:00Z] [ERROR] first error\nstack line',
      '[2026-03-01T00:05:00Z] [ERROR] second error\nextra details'
    ]);

    await runDoctor();

    expect(mockReadRunLog).toHaveBeenCalledWith('/tmp/run-2.log');
    expect(mockExtractErrorEntries).toHaveBeenCalledWith('run log 2');
    expect(mockPrintWarning).toHaveBeenCalledWith('Found 1 recent run(s) with failures or logged errors.');
    expect(mockPrintWarning).toHaveBeenCalledWith('TS run job-2 (completed)');
    expect(mockPrintKeyValue).toHaveBeenCalledWith('Run ID', 'run-2');
    expect(mockPrintKeyValue).toHaveBeenCalledWith('Message', '-');
    expect(mockPrintInfo).toHaveBeenCalledWith('[2026-03-01T00:05:00Z] [ERROR] second error');
  });

  it('ignores old or invalid run timestamps when scanning recent problems', async () => {
    mockRunsLatestWithJobNames.mockReturnValue([
      {
        id: 'run-old',
        jobId: 'job-1',
        jobName: 'Old job',
        status: 'failed',
        message: 'old failure',
        createdAt: 'not-a-timestamp',
        logFilePath: '/tmp/run-old.log'
      },
      {
        id: 'run-older',
        jobId: 'job-1',
        jobName: 'Older job',
        status: 'failed',
        message: 'ancient failure',
        createdAt: '2020-01-01T00:00:00.000Z',
        logFilePath: '/tmp/run-older.log'
      }
    ]);

    await runDoctor();

    expect(mockPrintSuccess).toHaveBeenCalledWith('No recent job run failures or logged errors in the last 24 hours.');
    expect(mockReadRunLog).not.toHaveBeenCalled();
  });
});

const mockRender = jest.fn((...args: unknown[]) => {
  void args;
  return {
  waitUntilExit: jest.fn(async () => {}),
  unmount: jest.fn()
  };
});

const mockResolveJobFromArgOrPrompt = jest.fn();
const mockEnsureDaemonRunning = jest.fn(() => ({ started: false, pid: null }));
const mockRequestDaemonReload = jest.fn(() => ({ reloaded: false, pid: null as number | null }));
const mockRunnerRun = jest.fn(async () => {});
const mockGetOpenRouterApiKey = jest.fn(async () => 'api-key');
const mockIsKeytarAvailable = jest.fn(async () => true);
const mockSetOpenRouterApiKey = jest.fn(async () => {});
const mockDeleteOpenRouterApiKey = jest.fn(async () => {});
const mockGetStartupStatus = jest.fn(() => ({ enabled: false, method: 'launchd', detail: 'not configured' }));
const mockInstallStartup = jest.fn(() => ({ success: true, method: 'launchd', detail: 'installed' }));

const mockPrintCommandScreen = jest.fn();
const mockPrintError = jest.fn();
const mockPrintInfo = jest.fn();
const mockPrintKeyValue = jest.fn();
const mockPrintSection = jest.fn();
const mockPrintSuccess = jest.fn();
const mockPrintWarning = jest.fn();
const mockIsRichTty = jest.fn(() => false);
const mockFormatPostScanBlock = jest.fn(() => 'POST BLOCK');
const mockFormatCommentScanBlock = jest.fn(() => 'COMMENT BLOCK');
const mockFormatRunDisplayTimestamp = jest.fn((run: { id: string }) => `TS:${run.id}`);

const mockJobsGetByRef = jest.fn();
const mockJobsListWithStats = jest.fn();
const mockJobsRemoveByRef = jest.fn();
const mockJobsSetEnabledByRef = jest.fn();
const mockJobsSetEnabled = jest.fn();

const mockRunsListByJob = jest.fn();
const mockRunsCountByJob = jest.fn();
const mockRunsCountAll = jest.fn();
const mockRunsListByJobPage = jest.fn();
const mockRunsLatestWithJobNamesPage = jest.fn();
const mockRunsGetByJobIndex = jest.fn();
const mockRunsGetLatestWithJobNamesByIndex = jest.fn();

jest.mock('ink', () => ({
  render: mockRender
}));

jest.mock('../../src/cli/commands/selection.js', () => ({
  resolveJobFromArgOrPrompt: mockResolveJobFromArgOrPrompt
}));

jest.mock('../../src/services/daemonControl.js', () => ({
  ensureDaemonRunning: mockEnsureDaemonRunning,
  requestDaemonReload: mockRequestDaemonReload
}));

jest.mock('../../src/services/scheduler/jobRunner.js', () => ({
  JobRunner: class {
    run = mockRunnerRun;
  }
}));

jest.mock('../../src/services/security/secretStore.js', () => ({
  getOpenRouterApiKey: mockGetOpenRouterApiKey,
  isKeytarAvailable: mockIsKeytarAvailable,
  setOpenRouterApiKey: mockSetOpenRouterApiKey,
  deleteOpenRouterApiKey: mockDeleteOpenRouterApiKey
}));

jest.mock('../../src/services/startup/index.js', () => ({
  getStartupStatus: mockGetStartupStatus,
  installStartup: mockInstallStartup
}));

jest.mock('../../src/services/db/repositories/jobsRepo.js', () => ({
  JobsRepository: class {
    getByRef(ref: string) {
      return mockJobsGetByRef(ref);
    }

    listWithStats() {
      return mockJobsListWithStats();
    }

    removeByRef(ref: string) {
      return mockJobsRemoveByRef(ref);
    }

    setEnabledByRef(ref: string, enabled: boolean) {
      return mockJobsSetEnabledByRef(ref, enabled);
    }

    setEnabled(jobId: string, enabled: boolean) {
      return mockJobsSetEnabled(jobId, enabled);
    }
  }
}));

jest.mock('../../src/services/db/repositories/runsRepo.js', () => ({
  RunsRepository: class {
    listByJob(jobId: string, limit?: number) {
      return mockRunsListByJob(jobId, limit);
    }

    countByJob(jobId: string) {
      return mockRunsCountByJob(jobId);
    }

    countAll() {
      return mockRunsCountAll();
    }

    listByJobPage(jobId: string, limit: number, offset: number) {
      return mockRunsListByJobPage(jobId, limit, offset);
    }

    latestWithJobNamesPage(limit: number, offset: number) {
      return mockRunsLatestWithJobNamesPage(limit, offset);
    }

    getByJobIndex(jobId: string, index: number) {
      return mockRunsGetByJobIndex(jobId, index);
    }

    getLatestWithJobNamesByIndex(index: number) {
      return mockRunsGetLatestWithJobNamesByIndex(index);
    }
  }
}));

jest.mock('../../src/services/db/repositories/settingsRepo.js', () => ({
  SettingsRepository: class {
    getAppSettings() {
      return {
        model: 'moonshotai/kimi-k2.5',
        modelSettings: {
          temperature: 0.2,
          maxTokens: 800,
          topP: 0.9
        },
        cronIntervalMinutes: 30,
        jobTimeoutMs: 600000,
        notificationsEnabled: true
      };
    }

    setAppSettings() {}
  }
}));

jest.mock('../../src/cli/ui/consoleUi.js', () => ({
  formatCommentScanBlock: mockFormatCommentScanBlock,
  formatPostScanBlock: mockFormatPostScanBlock,
  isRichTty: mockIsRichTty,
  printCommandScreen: mockPrintCommandScreen,
  printError: mockPrintError,
  printInfo: mockPrintInfo,
  printKeyValue: mockPrintKeyValue,
  printSection: mockPrintSection,
  printSuccess: mockPrintSuccess,
  printWarning: mockPrintWarning
}));

jest.mock('../../src/cli/ui/time.js', () => ({
  formatRunDisplayTimestamp: mockFormatRunDisplayTimestamp
}));

jest.mock('../../src/ui/components/JobsTable.js', () => ({
  JobsTable: 'jobs-table'
}));

jest.mock('../../src/ui/components/RunsTable.js', () => ({
  RunsTable: 'runs-table'
}));

jest.mock('../../src/cli/flows/jobAddFlow.js', () => ({
  JobAddFlow: 'job-add-flow'
}));

import {
  disableJob,
  enableJob,
  listJobRuns,
  listJobs,
  removeJob,
  runInitialJobAndEnable,
  runJobNow
} from '../../src/cli/commands/job.js';

function getRenderedProps(): Record<string, unknown> {
  return ((mockRender.mock.calls[0]?.[0] as { props?: Record<string, unknown> } | undefined)?.props ?? {});
}

function createJob(overrides: Partial<{
  id: string;
  slug: string;
  name: string;
  enabled: boolean;
}> = {}) {
  return {
    id: overrides.id ?? 'job-1',
    slug: overrides.slug ?? 'alpha',
    name: overrides.name ?? 'Alpha',
    description: 'desc',
    qualificationPrompt: 'prompt',
    subreddits: ['a'],
    scheduleCron: '*/30 * * * *',
    enabled: overrides.enabled ?? true,
    monitorComments: true,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01'
  };
}

function createJobSummary(index: number, overrides: Partial<{
  jobId: string;
  jobSlug: string;
  jobName: string;
  enabled: number;
}> = {}) {
  return {
    jobId: overrides.jobId ?? `job-${index}`,
    jobSlug: overrides.jobSlug ?? `slug-${index}`,
    jobName: overrides.jobName ?? `Job ${index}`,
    enabled: overrides.enabled ?? 1,
    description: `Description ${index}`,
    subredditsJson: '["alpha"]',
    scheduleCron: '*/30 * * * *',
    lastRunAt: '2026-01-01 00:00:00',
    totalScanned: 10 + index,
    totalQualified: 3 + index,
    totalCostUsd: 0.12,
    runCount: 1
  };
}

function createRun(overrides: Partial<{
  id: string;
  jobId: string;
  jobName: string | null;
  jobSlug: string | null;
  status: string;
  message: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
  estimatedCostUsd: number | null;
  logFilePath: string | null;
}> = {}) {
  return {
    id: overrides.id ?? 'run-1',
    jobId: overrides.jobId ?? 'job-1',
    jobName: overrides.jobName ?? 'Alpha',
    jobSlug: overrides.jobSlug ?? 'alpha',
    status: overrides.status ?? 'completed',
    message: overrides.message === undefined ? null : overrides.message,
    startedAt: overrides.startedAt === undefined ? '2026-01-01T00:00:00Z' : overrides.startedAt,
    finishedAt: overrides.finishedAt === undefined ? '2026-01-01T00:00:05Z' : overrides.finishedAt,
    createdAt: overrides.createdAt ?? '2026-01-01T00:00:00Z',
    itemsDiscovered: 6,
    itemsNew: 3,
    itemsQualified: 2,
    promptTokens: 120,
    completionTokens: 45,
    estimatedCostUsd: overrides.estimatedCostUsd === undefined ? 0.123456 : overrides.estimatedCostUsd,
    logFilePath: overrides.logFilePath === undefined ? '/tmp/run.log' : overrides.logFilePath
  };
}

describe('job commands', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsRichTty.mockReturnValue(false);
    mockEnsureDaemonRunning.mockReturnValue({ started: false, pid: null });
    mockRequestDaemonReload.mockReturnValue({ reloaded: false, pid: null });
    mockRunnerRun.mockImplementation(async () => {});
    mockIsKeytarAvailable.mockResolvedValue(true);
    mockJobsGetByRef.mockReturnValue(null);
    mockJobsListWithStats.mockReturnValue([]);
    mockJobsRemoveByRef.mockReturnValue(null);
    mockJobsSetEnabledByRef.mockReturnValue(null);
    mockRunsListByJob.mockReturnValue([]);
    mockRunsCountByJob.mockReturnValue(0);
    mockRunsCountAll.mockReturnValue(0);
    mockRunsListByJobPage.mockReturnValue([]);
    mockRunsLatestWithJobNamesPage.mockReturnValue([]);
    mockRunsGetByJobIndex.mockReturnValue(null);
    mockRunsGetLatestWithJobNamesByIndex.mockReturnValue(null);
  });

  it('shows an empty jobs screen when no jobs exist', async () => {
    await listJobs();

    expect(mockPrintCommandScreen).toHaveBeenCalledWith('Jobs', 'Configured Jobs');
    expect(mockPrintWarning).toHaveBeenCalledWith('No jobs configured yet.');
  });

  it('prints a flat jobs list when not in a rich tty', async () => {
    mockJobsListWithStats.mockReturnValue([createJobSummary(1, { jobName: 'Alpha', jobSlug: 'alpha' })]);

    await listJobs();

    expect(mockPrintInfo).toHaveBeenCalledWith('Alpha (alpha) state=on');
    expect(mockPrintKeyValue).toHaveBeenCalledWith('Scanned', '11');
    expect(mockPrintKeyValue).toHaveBeenCalledWith('Qualified', '4');
    expect(mockRender).not.toHaveBeenCalled();
  });

  it('renders the jobs table in a rich tty', async () => {
    const rows = [createJobSummary(1)];
    mockIsRichTty.mockReturnValue(true);
    mockJobsListWithStats.mockReturnValue(rows);

    await listJobs();

    const props = getRenderedProps();
    expect(mockRender).toHaveBeenCalledTimes(1);
    expect(props.jobs).toEqual(rows);
    expect(typeof props.onExit).toBe('function');
  });

  it('deletes the selected job when repository removal succeeds', async () => {
    const job = createJob();
    mockResolveJobFromArgOrPrompt.mockResolvedValue(job);
    mockJobsRemoveByRef.mockReturnValue(job);

    await removeJob();

    expect(mockPrintCommandScreen).toHaveBeenCalledWith('Jobs', 'Delete Job');
    expect(mockJobsRemoveByRef).toHaveBeenCalledWith('job-1');
    expect(mockPrintSuccess).toHaveBeenCalledWith('Deleted job job-1 (alpha) with all runs and scan items.');
  });

  it('prints an error when deletion cannot remove the selected job', async () => {
    const job = createJob();
    mockResolveJobFromArgOrPrompt.mockResolvedValue(job);
    mockJobsRemoveByRef.mockReturnValue(null);

    await removeJob('job-1');

    expect(mockPrintError).toHaveBeenCalledWith('Job not found: job-1');
  });

  it('returns early when no job is selected for deletion', async () => {
    mockResolveJobFromArgOrPrompt.mockResolvedValue(null);

    await removeJob();

    expect(mockJobsRemoveByRef).not.toHaveBeenCalled();
  });

  it('enables and disables jobs through repository lookups', async () => {
    const job = createJob();
    mockResolveJobFromArgOrPrompt.mockResolvedValue(job);
    mockJobsSetEnabledByRef
      .mockReturnValueOnce({ ...job, enabled: true })
      .mockReturnValueOnce({ ...job, enabled: false });

    await enableJob();
    await disableJob();

    expect(mockJobsSetEnabledByRef).toHaveBeenNthCalledWith(1, 'job-1', true);
    expect(mockJobsSetEnabledByRef).toHaveBeenNthCalledWith(2, 'job-1', false);
    expect(mockPrintSuccess).toHaveBeenCalledWith('Enabled job job-1 (alpha)');
    expect(mockPrintSuccess).toHaveBeenCalledWith('Disabled job job-1 (alpha)');
  });

  it('prints errors when enable or disable cannot update the selected job', async () => {
    const job = createJob();
    mockResolveJobFromArgOrPrompt.mockResolvedValue(job);
    mockJobsSetEnabledByRef.mockReturnValue(null);

    await enableJob();
    await disableJob();

    expect(mockPrintError).toHaveBeenCalledWith('Job not found: job-1');
    expect(mockPrintError).toHaveBeenCalledTimes(2);
  });

  it('shows an empty run history screen when there are no runs', async () => {
    mockRunsCountAll.mockReturnValue(0);

    await listJobRuns();

    expect(mockPrintCommandScreen).toHaveBeenCalledWith('Run history', 'Job Runs');
    expect(mockPrintWarning).toHaveBeenCalledWith('No run history yet.');
  });

  it('prints an error when listing runs for an unknown job ref', async () => {
    mockJobsGetByRef.mockReturnValue(null);

    await listJobRuns('missing-job');

    expect(mockPrintError).toHaveBeenCalledWith('Job not found: missing-job');
  });

  it('prints flat run history and truncation guidance outside rich tty', async () => {
    const rows = Array.from({ length: 50 }, (_, index) =>
      createRun({ id: `run-${index + 1}`, jobName: `Job ${index + 1}`, jobId: `job-${index + 1}` })
    );
    mockRunsCountAll.mockReturnValue(60);
    mockRunsLatestWithJobNamesPage.mockReturnValue(rows);

    await listJobRuns();

    expect(mockPrintCommandScreen).toHaveBeenCalledWith('Run history', 'Job Runs');
    expect(mockPrintInfo).toHaveBeenCalledWith('TS:run-1 Job 1 [run-1] completed');
    expect(mockPrintInfo).toHaveBeenCalledWith('Showing first 50 of 60 run(s). Use a rich TTY to browse all runs.');
    expect(mockPrintKeyValue).toHaveBeenCalledWith('Run ID', 'run-1');
  });

  it('renders run history in a rich tty and reuses cached rows', async () => {
    const job = createJob();
    const runOne = createRun({ id: 'run-1' });
    const runTwo = createRun({ id: 'run-2', status: 'failed' });
    mockIsRichTty.mockReturnValue(true);
    mockJobsGetByRef.mockReturnValue(job);
    mockRunsCountByJob.mockReturnValue(2);
    mockRunsGetByJobIndex.mockImplementation((jobId: string, index: number) => {
      expect(jobId).toBe('job-1');
      return index === 0 ? runOne : index === 1 ? runTwo : null;
    });

    await listJobRuns('job-1');

    const props = getRenderedProps() as {
      totalRuns: number;
      getRunAt: (index: number) => unknown;
    };
    expect(props.totalRuns).toBe(2);
    expect(props.getRunAt(0)).toEqual(runOne);
    expect(props.getRunAt(1)).toEqual(runTwo);
    expect(props.getRunAt(0)).toEqual(runOne);
    expect(mockRunsGetByJobIndex).toHaveBeenCalledTimes(2);
  });

  it('prints a summary when a manual run completes without a stored run row', async () => {
    const job = createJob();
    mockResolveJobFromArgOrPrompt.mockResolvedValue(job);
    mockRunsListByJob.mockReturnValue([]);

    await runJobNow(undefined, { limit: 3 });

    expect(mockPrintCommandScreen).toHaveBeenCalledWith('Manual run', 'Run Job Now');
    expect(mockPrintInfo).toHaveBeenCalledWith('Running Alpha (alpha) with limit 3');
    expect(mockPrintWarning).toHaveBeenCalledWith('Manual run finished for Alpha (alpha) with limit 3.');
  });

  it('logs rich manual run progress events and prints a completed summary', async () => {
    const job = createJob();
    const latestRun = createRun({ message: 'Some items were skipped.' });
    mockIsRichTty.mockReturnValue(true);
    mockResolveJobFromArgOrPrompt.mockResolvedValue(job);
    mockRunnerRun.mockImplementation(async (...args: unknown[]) => {
      const options = (args[1] as { onProgress?: (event: unknown) => void } | undefined) ?? {};

      options.onProgress?.({ type: 'run_start', jobId: 'job-1', jobName: 'Alpha', subredditCount: 2, maxNewItems: 4 });
      options.onProgress?.({ type: 'subreddit_fetched', subreddit: 'alpha', postCount: 5 });
      options.onProgress?.({ type: 'post_scanned', postId: 'post-1', subreddit: 'alpha', status: 'existing', itemsNew: 1, itemsQualified: 0 });
      options.onProgress?.({
        type: 'post_scanned',
        postId: 'post-2',
        subreddit: 'alpha',
        status: 'new',
        title: 'Title',
        bodySnippet: 'Body',
        postUrl: 'https://reddit.test/post-2',
        qualified: true,
        qualificationReason: 'Clear signal',
        itemsNew: 2,
        itemsQualified: 1
      });
      options.onProgress?.({ type: 'comments_loaded', postId: 'post-2', subreddit: 'alpha', authors: 3, threads: 4 });
      options.onProgress?.({
        type: 'comment_scanned',
        postId: 'post-2',
        commentId: 'comment-1',
        author: 'user1',
        status: 'existing',
        itemsNew: 2,
        itemsQualified: 1
      });
      options.onProgress?.({
        type: 'comment_scanned',
        postId: 'post-2',
        commentId: 'comment-2',
        author: 'user2',
        status: 'new',
        commentSnippet: 'Comment body',
        postUrl: 'https://reddit.test/post-2',
        commentUrl: 'https://reddit.test/comment-2',
        qualified: false,
        qualificationReason: 'Weak signal',
        itemsNew: 3,
        itemsQualified: 1
      });
      options.onProgress?.({ type: 'limit_reached', maxNewItems: 4, itemsNew: 4 });
      options.onProgress?.({ type: 'run_skipped', reason: 'missing_api_key', message: 'skip message' });
      options.onProgress?.({
        type: 'run_complete',
        itemsDiscovered: 10,
        itemsNew: 4,
        itemsQualified: 2,
        promptTokens: 100,
        completionTokens: 20,
        estimatedCostUsd: 0.3
      });
      options.onProgress?.({ type: 'run_failed', message: 'boom' });
    });
    mockRunsListByJob.mockReturnValue([latestRun]);

    await runJobNow(undefined, { limit: 4 });

    expect(mockPrintInfo).toHaveBeenCalledWith('Starting scan across 2 subreddit(s) (limit 4).');
    expect(mockPrintInfo).toHaveBeenCalledWith('Fetched r/alpha: 5 posts');
    expect(mockPrintInfo).toHaveBeenCalledWith('Post post-1: already scanned');
    expect(mockPrintInfo).toHaveBeenCalledWith('POST BLOCK');
    expect(mockPrintInfo).toHaveBeenCalledWith('Comments on post-2: 3 author(s), 4 thread(s)');
    expect(mockPrintInfo).toHaveBeenCalledWith('Comment comment-1: already scanned');
    expect(mockPrintInfo).toHaveBeenCalledWith('COMMENT BLOCK');
    expect(mockPrintWarning).toHaveBeenCalledWith('Reached maxNewItems=4. Stopping early.');
    expect(mockPrintWarning).toHaveBeenCalledWith('skip message');
    expect(mockPrintSuccess).toHaveBeenCalledWith('Scan complete. discovered=10, new=4, qualified=2');
    expect(mockPrintError).toHaveBeenCalledWith('Run failed: boom');
    expect(mockPrintSection).toHaveBeenCalledWith('Manual run completed for Alpha (alpha) with limit 4');
    expect(mockPrintKeyValue).toHaveBeenCalledWith('Duration', '5s');
    expect(mockPrintKeyValue).toHaveBeenCalledWith('Cost', '$0.123456');
    expect(mockPrintWarning).toHaveBeenCalledWith('Message: Some items were skipped.');
  });

  it('uses placeholder summary fields when the latest run has incomplete timing and no cost', async () => {
    const job = createJob();
    const latestRun = createRun({
      startedAt: null,
      finishedAt: null,
      estimatedCostUsd: null,
      logFilePath: null,
      message: null
    });
    mockResolveJobFromArgOrPrompt.mockResolvedValue(job);
    mockRunsListByJob.mockReturnValue([latestRun]);

    await runJobNow(undefined, {});

    expect(mockPrintSection).toHaveBeenCalledWith('Manual run completed for Alpha (alpha)');
    expect(mockPrintKeyValue).toHaveBeenCalledWith('Duration', '-');
    expect(mockPrintKeyValue).toHaveBeenCalledWith('Cost', '-');
    expect(mockPrintKeyValue).toHaveBeenCalledWith('Log', '-');
  });

  it('throws when the initial job lookup fails before enabling', async () => {
    mockJobsGetByRef.mockReturnValue(null);

    await expect(runInitialJobAndEnable('missing-job')).rejects.toThrow('Job not found: missing-job');
  });

  it('runs the initial scan, enables the job, and warns when daemon reload fails', async () => {
    const job = createJob();
    mockJobsGetByRef.mockReturnValue(job);
    mockResolveJobFromArgOrPrompt.mockResolvedValue(job);
    mockRunsListByJob.mockReturnValue([]);
    mockRequestDaemonReload.mockReturnValue({ reloaded: false, pid: 321 as number | null });

    await runInitialJobAndEnable('job-1', {
      limit: 2,
      installSignalHandlers: false,
      printLifecycleMessages: true
    });

    expect(mockRunnerRun).toHaveBeenCalledTimes(1);
    expect(mockJobsSetEnabled).toHaveBeenCalledWith('job-1', true);
    expect(mockPrintInfo).toHaveBeenCalledWith('Running an initial scan now so you can see immediate results.');
    expect(mockPrintInfo).toHaveBeenCalledWith('Scheduled runs are paused for this job until the initial run attempt finishes.');
    expect(mockPrintWarning).toHaveBeenCalledWith('Job was enabled, but daemon schedules could not be reloaded automatically.');
    expect(mockPrintInfo).toHaveBeenCalledWith(
      'Run snoopy daemon reload (or restart the daemon) to pick up this job schedule immediately.'
    );
    expect(mockPrintSuccess).toHaveBeenCalledWith('Enabled job job-1 (alpha) for scheduled runs.');
  });
});
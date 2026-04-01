const promptAnswers: string[] = [];
const mockEmitKeypressEvents = jest.fn();
const mockCreateInterface = jest.fn(() => ({
  question: jest.fn(async () => promptAnswers.shift() ?? ''),
  close: jest.fn()
}));

jest.mock('node:readline/promises', () => ({
  createInterface: mockCreateInterface
}));

jest.mock('node:readline', () => ({
  __esModule: true,
  default: {
    emitKeypressEvents: mockEmitKeypressEvents
  }
}));

const mockPrintError = jest.fn();
const mockPrintInfo = jest.fn();
const mockPrintWarning = jest.fn();

jest.mock('../../src/cli/ui/consoleUi.js', () => ({
  printError: mockPrintError,
  printInfo: mockPrintInfo,
  printWarning: mockPrintWarning
}));

import { resolveJobFromArgOrPrompt, resolveRunFromArgOrPrompt } from '../../src/cli/commands/selection.js';
import { formatRunDisplayLabel } from '../../src/cli/ui/time.js';

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

function createRun(overrides: Partial<{
  id: string;
  jobId: string;
  jobName: string;
  jobSlug: string;
  status: string;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
}> = {}) {
  return {
    id: overrides.id ?? 'run-1',
    jobId: overrides.jobId ?? 'job-1',
    jobName: overrides.jobName ?? 'Alpha',
    jobSlug: overrides.jobSlug ?? 'alpha',
    status: overrides.status ?? 'completed',
    message: null,
    startedAt: overrides.startedAt ?? null,
    finishedAt: overrides.finishedAt ?? null,
    createdAt: overrides.createdAt ?? '2026-01-01',
    itemsDiscovered: 1,
    itemsNew: 1,
    itemsQualified: 1,
    promptTokens: 10,
    completionTokens: 5,
    estimatedCostUsd: 0.0001,
    logFilePath: '/tmp/run-1.log'
  };
}

describe('command selection helpers', () => {
  const originalStdinTty = process.stdin.isTTY;
  const originalStdoutTty = process.stdout.isTTY;
  const originalSetRawMode = process.stdin.setRawMode;
  const originalIsRaw = process.stdin.isRaw;
  const originalStdoutWrite = process.stdout.write;

  beforeEach(() => {
    jest.clearAllMocks();
    promptAnswers.length = 0;
    Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true });
    Object.defineProperty(process.stdout, 'isTTY', { value: true, configurable: true });
    Object.defineProperty(process.stdin, 'setRawMode', { value: undefined, configurable: true, writable: true });
    Object.defineProperty(process.stdin, 'isRaw', { value: false, configurable: true, writable: true });
    process.stdout.write = jest.fn().mockReturnValue(true) as typeof process.stdout.write;
  });

  afterAll(() => {
    Object.defineProperty(process.stdin, 'isTTY', { value: originalStdinTty, configurable: true });
    Object.defineProperty(process.stdout, 'isTTY', { value: originalStdoutTty, configurable: true });
    Object.defineProperty(process.stdin, 'setRawMode', {
      value: originalSetRawMode,
      configurable: true,
      writable: true
    });
    Object.defineProperty(process.stdin, 'isRaw', { value: originalIsRaw, configurable: true, writable: true });
    process.stdout.write = originalStdoutWrite;
  });

  it('resolves provided jobRef directly', async () => {
    const job = createJob();

    const jobsRepo = {
      getByRef: jest.fn(() => job),
      list: jest.fn(() => [job])
    };

    const resolved = await resolveJobFromArgOrPrompt(jobsRepo, 'job-1');

    expect(resolved).toEqual(job);
    expect(jobsRepo.getByRef).toHaveBeenCalledWith('job-1');
    expect(jobsRepo.list).not.toHaveBeenCalled();
  });

  it('prints an error when the provided jobRef is missing', async () => {
    const jobsRepo = {
      getByRef: jest.fn(() => null),
      list: jest.fn(() => [])
    };

    const resolved = await resolveJobFromArgOrPrompt(jobsRepo, 'missing-job');

    expect(resolved).toBeNull();
    expect(mockPrintError).toHaveBeenCalledWith('Job not found: missing-job');
  });

  it('prompts for job selection when jobRef is omitted', async () => {
    const jobs = [createJob(), createJob({ id: 'job-2', slug: 'beta', name: 'Beta', enabled: false })];

    const jobsRepo = {
      getByRef: jest.fn(() => null),
      list: jest.fn(() => jobs)
    };

    const selectIndex = jest.fn(async () => 1);

    const resolved = await resolveJobFromArgOrPrompt(jobsRepo, undefined, { selectIndex });

    expect(resolved).toEqual(jobs[1]);
    expect(selectIndex).toHaveBeenCalled();
  });

  it('warns when interactive job selection has no configured jobs', async () => {
    const jobsRepo = {
      getByRef: jest.fn(() => null),
      list: jest.fn(() => [])
    };

    const resolved = await resolveJobFromArgOrPrompt(jobsRepo, undefined);

    expect(resolved).toBeNull();
    expect(mockPrintWarning).toHaveBeenCalledWith('No jobs configured yet.');
  });

  it('falls back to numeric prompt selection when raw keyboard mode is unavailable', async () => {
    promptAnswers.push('2');
    const jobs = [createJob(), createJob({ id: 'job-2', slug: 'beta', name: 'Beta' })];
    const jobsRepo = {
      getByRef: jest.fn(() => null),
      list: jest.fn(() => jobs)
    };

    const resolved = await resolveJobFromArgOrPrompt(jobsRepo, undefined);

    expect(resolved).toEqual(jobs[1]);
    expect(mockCreateInterface).toHaveBeenCalledTimes(1);
  });

  it('retries after invalid numeric prompt input and then accepts a valid selection', async () => {
    promptAnswers.push('9', '1');
    const jobs = [createJob(), createJob({ id: 'job-2', slug: 'beta', name: 'Beta' })];
    const jobsRepo = {
      getByRef: jest.fn(() => null),
      list: jest.fn(() => jobs)
    };

    const resolved = await resolveJobFromArgOrPrompt(jobsRepo, undefined);

    expect(resolved).toEqual(jobs[0]);
    expect(mockPrintWarning).toHaveBeenCalledWith('Invalid selection. Enter a number from 1-2, or q to cancel.');
    expect(mockCreateInterface).toHaveBeenCalledTimes(2);
  });

  it('cancels selection when the prompt receives q', async () => {
    promptAnswers.push('q');
    const jobs = [createJob()];
    const jobsRepo = {
      getByRef: jest.fn(() => null),
      list: jest.fn(() => jobs)
    };

    const resolved = await resolveJobFromArgOrPrompt(jobsRepo, undefined);

    expect(resolved).toBeNull();
    expect(mockPrintWarning).toHaveBeenCalledWith('Selection cancelled.');
  });

  it('supports arrow key selection when raw keyboard input is available', async () => {
    const setRawMode = jest.fn();
    Object.defineProperty(process.stdin, 'setRawMode', { value: setRawMode, configurable: true, writable: true });

    const jobs = [createJob(), createJob({ id: 'job-2', slug: 'beta', name: 'Beta' })];
    const jobsRepo = {
      getByRef: jest.fn(() => null),
      list: jest.fn(() => jobs)
    };

    const pending = resolveJobFromArgOrPrompt(jobsRepo, undefined);
    await new Promise((resolve) => setImmediate(resolve));
    process.stdin.emit('keypress', '', { name: 'down' });
    process.stdin.emit('keypress', '', { name: 'enter' });

    await expect(pending).resolves.toEqual(jobs[1]);
    expect(setRawMode).toHaveBeenNthCalledWith(1, true);
    expect(setRawMode).toHaveBeenNthCalledWith(2, false);
    expect(mockEmitKeypressEvents).toHaveBeenCalledWith(process.stdin);
  });

  it('drops to prompt mode after keyboard cancellation and still allows quitting', async () => {
    const setRawMode = jest.fn();
    Object.defineProperty(process.stdin, 'setRawMode', { value: setRawMode, configurable: true, writable: true });
    promptAnswers.push('quit');

    const jobsRepo = {
      getByRef: jest.fn(() => null),
      list: jest.fn(() => [createJob()])
    };

    const pending = resolveJobFromArgOrPrompt(jobsRepo, undefined);
    await new Promise((resolve) => setImmediate(resolve));
    process.stdin.emit('keypress', 'q', { name: 'q' });

    await expect(pending).resolves.toBeNull();
    expect(mockPrintWarning).toHaveBeenCalledWith('Selection cancelled.');
  });

  it('requires explicit jobRef when non-interactive and missing', async () => {
    Object.defineProperty(process.stdin, 'isTTY', { value: false, configurable: true });

    const jobsRepo = {
      getByRef: jest.fn(() => null),
      list: jest.fn(() => [])
    };

    const resolved = await resolveJobFromArgOrPrompt(jobsRepo, undefined, { requiredForMessage: 'manual run' });

    expect(resolved).toBeNull();
    expect(mockPrintError).toHaveBeenCalledWith(
      'Missing job reference for manual run. Provide <jobRef> when running non-interactively.'
    );
  });

  it('shows warning when selected job has no runs', async () => {
    const selectedJob = createJob();

    const runsRepo = {
      getById: jest.fn(() => null),
      listByJob: jest.fn(() => [])
    };

    const resolved = await resolveRunFromArgOrPrompt(runsRepo, undefined, selectedJob, {
      selectIndex: async () => 0
    });

    expect(resolved).toBeNull();
    expect(mockPrintWarning).toHaveBeenCalledWith('No run history found for Alpha (alpha).');
  });

  it('prints an error when the provided run id is missing', async () => {
    const runsRepo = {
      getById: jest.fn(() => null),
      listByJob: jest.fn(() => [])
    };

    const resolved = await resolveRunFromArgOrPrompt(runsRepo, 'run-missing', createJob());

    expect(resolved).toBeNull();
    expect(mockPrintError).toHaveBeenCalledWith('Run not found: run-missing');
  });

  it('resolves a provided run id directly', async () => {
    const run = createRun({ id: 'run-2' });
    const runsRepo = {
      getById: jest.fn(() => run),
      listByJob: jest.fn(() => [])
    };

    const resolved = await resolveRunFromArgOrPrompt(runsRepo, 'run-2', createJob());

    expect(resolved).toEqual(run);
    expect(runsRepo.getById).toHaveBeenCalledWith('run-2');
  });

  it('selects a run via keyboard index callback', async () => {
    const selectedJob = createJob();
    const runs = [createRun()];

    const runsRepo = {
      getById: jest.fn(() => null),
      listByJob: jest.fn(() => runs)
    };

    const selectIndex = jest
      .fn<Promise<number | null>, [string[], string]>()
      .mockImplementationOnce(async () => 0);

    const resolved = await resolveRunFromArgOrPrompt(runsRepo, undefined, selectedJob, { selectIndex });

    expect(resolved).toEqual(runs[0]);
    expect(selectIndex).toHaveBeenCalledTimes(1);
    expect(selectIndex).toHaveBeenCalledWith([`1. run-1 completed ${formatRunDisplayLabel(runs[0])}`], 'run');
  });

  it('falls back to prompt input for run selection when raw keyboard mode is unavailable', async () => {
    promptAnswers.push('1');
    const selectedJob = createJob();
    const runs = [createRun({ id: 'run-1' })];
    const runsRepo = {
      getById: jest.fn(() => null),
      listByJob: jest.fn(() => runs)
    };

    const resolved = await resolveRunFromArgOrPrompt(runsRepo, undefined, selectedJob);

    expect(resolved).toEqual(runs[0]);
    expect(mockPrintInfo).toHaveBeenCalledWith('Runs for Alpha (alpha):');
  });
});

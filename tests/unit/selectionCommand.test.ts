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

describe('command selection helpers', () => {
  const originalStdinTty = process.stdin.isTTY;
  const originalStdoutTty = process.stdout.isTTY;

  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true });
    Object.defineProperty(process.stdout, 'isTTY', { value: true, configurable: true });
  });

  afterAll(() => {
    Object.defineProperty(process.stdin, 'isTTY', { value: originalStdinTty, configurable: true });
    Object.defineProperty(process.stdout, 'isTTY', { value: originalStdoutTty, configurable: true });
  });

  it('resolves provided jobRef directly', async () => {
    const job = {
      id: 'job-1',
      slug: 'alpha',
      name: 'Alpha',
      description: 'desc',
      qualificationPrompt: 'prompt',
      subreddits: ['a'],
      scheduleCron: '*/30 * * * *',
      enabled: true,
      monitorComments: true,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01'
    };

    const jobsRepo = {
      getByRef: jest.fn(() => job),
      list: jest.fn(() => [job])
    };

    const resolved = await resolveJobFromArgOrPrompt(jobsRepo, 'job-1');

    expect(resolved).toEqual(job);
    expect(jobsRepo.getByRef).toHaveBeenCalledWith('job-1');
    expect(jobsRepo.list).not.toHaveBeenCalled();
  });

  it('prompts for job selection when jobRef is omitted', async () => {
    const jobs = [
      {
        id: 'job-1',
        slug: 'alpha',
        name: 'Alpha',
        description: 'desc',
        qualificationPrompt: 'prompt',
        subreddits: ['a'],
        scheduleCron: '*/30 * * * *',
        enabled: true,
        monitorComments: true,
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01'
      },
      {
        id: 'job-2',
        slug: 'beta',
        name: 'Beta',
        description: 'desc',
        qualificationPrompt: 'prompt',
        subreddits: ['b'],
        scheduleCron: '*/30 * * * *',
        enabled: false,
        monitorComments: true,
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01'
      }
    ];

    const jobsRepo = {
      getByRef: jest.fn(() => null),
      list: jest.fn(() => jobs)
    };

    const selectIndex = jest.fn(async () => 1);

    const resolved = await resolveJobFromArgOrPrompt(jobsRepo, undefined, { selectIndex });

    expect(resolved).toEqual(jobs[1]);
    expect(selectIndex).toHaveBeenCalled();
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
    const selectedJob = {
      id: 'job-1',
      slug: 'alpha',
      name: 'Alpha',
      description: 'desc',
      qualificationPrompt: 'prompt',
      subreddits: ['a'],
      scheduleCron: '*/30 * * * *',
      enabled: true,
      monitorComments: true,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01'
    };

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

  it('selects a run via keyboard index callback', async () => {
    const selectedJob = {
      id: 'job-1',
      slug: 'alpha',
      name: 'Alpha',
      description: 'desc',
      qualificationPrompt: 'prompt',
      subreddits: ['a'],
      scheduleCron: '*/30 * * * *',
      enabled: true,
      monitorComments: true,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01'
    };

    const runs = [
      {
        id: 'run-1',
        jobId: 'job-1',
        jobName: 'Alpha',
        jobSlug: 'alpha',
        status: 'completed',
        message: null,
        startedAt: null,
        finishedAt: null,
        createdAt: '2026-01-01',
        itemsDiscovered: 1,
        itemsNew: 1,
        itemsQualified: 1,
        promptTokens: 10,
        completionTokens: 5,
        estimatedCostUsd: 0.0001,
        logFilePath: '/tmp/run-1.log'
      }
    ];

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
});

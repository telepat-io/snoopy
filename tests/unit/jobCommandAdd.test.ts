const mockQuestion = jest.fn<Promise<string>, [string]>();
const mockClose = jest.fn();
const mockCreateInterface = jest.fn(() => ({
  question: mockQuestion,
  close: mockClose
}));

const mockSetOpenRouterApiKey = jest.fn();
const mockGetOpenRouterApiKey = jest.fn(async () => 'existing-key');
const mockDeleteOpenRouterApiKey = jest.fn();

const mockInstallStartup = jest.fn(() => ({
  success: true,
  method: 'launchd',
  detail: 'installed'
}));
const mockGetStartupStatus = jest.fn(() => ({
  enabled: false,
  method: 'launchd',
  detail: 'not configured'
}));

const mockEnsureDaemonRunning = jest.fn(() => ({
  started: false,
  pid: 4321
}));
const mockRequestDaemonReload = jest.fn(() => ({
  reloaded: false,
  pid: null
}));

const mockRunnerRun = jest.fn(async () => {});

const mockPrintCliHeader = jest.fn();
const mockPrintError = jest.fn();
const mockPrintInfo = jest.fn();
const mockPrintKeyValue = jest.fn();
const mockPrintSection = jest.fn();
const mockPrintSuccess = jest.fn();
const mockPrintWarning = jest.fn();
const mockIsRichTty = jest.fn(() => false);

interface StoredJob {
  id: string;
  slug: string;
  name: string;
  description: string;
  qualificationPrompt: string;
  subreddits: string[];
  scheduleCron: string;
  enabled: boolean;
  monitorComments: boolean;
}

const store = {
  nextId: 1,
  jobsById: new Map<string, StoredJob>(),
  jobsBySlug: new Map<string, StoredJob>(),
  settings: {
    model: 'moonshotai/kimi-k2.5',
    modelSettings: {
      temperature: 0.2,
      maxTokens: 800,
      topP: 0.9
    },
    cronIntervalMinutes: 30,
    jobTimeoutMs: 600000,
    notificationsEnabled: true
  }
};

const flowResult = {
  settings: {
    model: 'moonshotai/kimi-k2.5',
    modelSettings: {
      temperature: 0.2,
      maxTokens: 800,
      topP: 0.9
    }
  },
  job: {
    slug: 'romanian-sme-ai-leads',
    name: 'Romanian SME AI Agent Prospects',
    description: 'Find Romanian SME founders exploring AI agents.',
    qualificationPrompt: 'Qualify Romanian SME owners discussing AI tooling needs.',
    subreddits: ['Romania', 'Entrepreneur'],
    monitorComments: true
  }
};

const mockRender = jest.fn((element: { props?: { onDone?: (value: typeof flowResult) => void } }) => {
  element.props?.onDone?.(flowResult);
  return {
    waitUntilExit: async () => {}
  };
});

jest.mock('node:readline/promises', () => ({
  createInterface: mockCreateInterface
}));

jest.mock('../../src/services/security/secretStore.js', () => ({
  getOpenRouterApiKey: mockGetOpenRouterApiKey,
  setOpenRouterApiKey: mockSetOpenRouterApiKey,
  deleteOpenRouterApiKey: mockDeleteOpenRouterApiKey
}));

jest.mock('../../src/services/startup/index.js', () => ({
  getStartupStatus: mockGetStartupStatus,
  installStartup: mockInstallStartup
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

jest.mock('../../src/services/db/repositories/settingsRepo.js', () => ({
  SettingsRepository: class {
    getAppSettings() {
      return store.settings;
    }

    setAppSettings(next: typeof store.settings) {
      store.settings = next;
    }
  }
}));

jest.mock('../../src/services/db/repositories/jobsRepo.js', () => ({
  JobsRepository: class {
    create(input: Omit<StoredJob, 'id'>): StoredJob {
      const id = `job-${store.nextId++}`;
      const job: StoredJob = { id, ...input };
      store.jobsById.set(id, job);
      store.jobsBySlug.set(job.slug, job);
      return job;
    }

    getByRef(ref: string): StoredJob | null {
      return store.jobsById.get(ref) ?? store.jobsBySlug.get(ref) ?? null;
    }

    setEnabled(jobId: string, enabled: boolean): StoredJob | null {
      const job = store.jobsById.get(jobId) ?? null;
      if (!job) {
        return null;
      }

      job.enabled = enabled;
      return job;
    }
  }
}));

jest.mock('../../src/services/db/repositories/runsRepo.js', () => ({
  RunsRepository: class {
    listByJob() {
      return [];
    }
  }
}));

jest.mock('../../src/cli/ui/consoleUi.js', () => ({
  isRichTty: mockIsRichTty,
  printCliHeader: mockPrintCliHeader,
  printError: mockPrintError,
  printInfo: mockPrintInfo,
  printKeyValue: mockPrintKeyValue,
  printSection: mockPrintSection,
  printSuccess: mockPrintSuccess,
  printWarning: mockPrintWarning
}));

jest.mock('ink', () => ({
  render: mockRender
}));

jest.mock('../../src/cli/flows/jobAddFlow.js', () => ({
  JobAddFlow: 'job-add-flow'
}));

import { addJob } from '../../src/cli/commands/job.js';

describe('addJob startup registration prompt', () => {
  beforeEach(() => {
    store.nextId = 1;
    store.jobsById.clear();
    store.jobsBySlug.clear();
    store.settings = {
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

    jest.clearAllMocks();
    mockGetStartupStatus.mockReturnValue({ enabled: false, method: 'launchd', detail: 'not configured' });
    mockEnsureDaemonRunning.mockReturnValue({ started: false, pid: 4321 });
    mockInstallStartup.mockReturnValue({ success: true, method: 'launchd', detail: 'installed' });
  });

  it('installs startup registration when user answers yes', async () => {
    mockQuestion.mockResolvedValueOnce('y');

    await addJob();

    expect(mockCreateInterface).toHaveBeenCalledTimes(1);
    expect(mockQuestion).toHaveBeenCalledWith('Install OS startup registration so daemon survives reboot? (y/n): ');
    expect(mockClose).toHaveBeenCalledTimes(1);
    expect(mockInstallStartup).toHaveBeenCalledTimes(1);
    expect(mockEnsureDaemonRunning).toHaveBeenCalledTimes(1);
    expect(mockRunnerRun).toHaveBeenCalledTimes(1);
  });

  it('does not install startup registration when user presses Enter', async () => {
    mockQuestion.mockResolvedValueOnce('');

    await addJob();

    expect(mockCreateInterface).toHaveBeenCalledTimes(1);
    expect(mockInstallStartup).not.toHaveBeenCalled();
    expect(mockEnsureDaemonRunning).toHaveBeenCalledTimes(1);
    expect(mockRunnerRun).toHaveBeenCalledTimes(1);
  });

  it('continues add flow when startup prompt input fails', async () => {
    mockQuestion.mockRejectedValueOnce(new Error('stdin closed'));

    await expect(addJob()).resolves.toBeUndefined();

    expect(mockCreateInterface).toHaveBeenCalledTimes(1);
    expect(mockClose).toHaveBeenCalledTimes(1);
    expect(mockInstallStartup).not.toHaveBeenCalled();
    expect(mockEnsureDaemonRunning).toHaveBeenCalledTimes(1);
    expect(mockRunnerRun).toHaveBeenCalledTimes(1);
  });
});

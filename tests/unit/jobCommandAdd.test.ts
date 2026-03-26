const mockPromptSelections: boolean[] = [];

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

const mockRender = jest.fn((element: { type?: unknown; props?: { onDone?: (value: unknown) => void } }) => {
  if (element.type === 'job-add-flow') {
    element.props?.onDone?.(flowResult);
    return {
      waitUntilExit: async () => {}
    };
  }

  const nextSelection = mockPromptSelections.length > 0 ? mockPromptSelections.shift() : false;
  if (typeof nextSelection === 'boolean') {
    element.props?.onDone?.(nextSelection);
  }

  return {
    waitUntilExit: async () => {}
  };
});

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
  render: mockRender,
  useApp: () => ({
    exit: jest.fn()
  })
}));

jest.mock('../../src/cli/flows/jobAddFlow.js', () => ({
  JobAddFlow: 'job-add-flow'
}));

import { addJob } from '../../src/cli/commands/job.js';

describe('addJob startup registration prompt', () => {
  const originalStdinIsTTY = process.stdin.isTTY;
  const originalStdoutIsTTY = process.stdout.isTTY;

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
    mockPromptSelections.length = 0;
    Object.defineProperty(process.stdin, 'isTTY', { configurable: true, value: true });
    Object.defineProperty(process.stdout, 'isTTY', { configurable: true, value: true });
    mockGetStartupStatus.mockReturnValue({ enabled: false, method: 'launchd', detail: 'not configured' });
    mockEnsureDaemonRunning.mockReturnValue({ started: false, pid: 4321 });
    mockInstallStartup.mockReturnValue({ success: true, method: 'launchd', detail: 'installed' });
  });

  afterAll(() => {
    Object.defineProperty(process.stdin, 'isTTY', { configurable: true, value: originalStdinIsTTY });
    Object.defineProperty(process.stdout, 'isTTY', { configurable: true, value: originalStdoutIsTTY });
  });

  it('installs startup registration when selector choice is yes', async () => {
    mockPromptSelections.push(true);

    await addJob();

    expect(mockRender).toHaveBeenCalledTimes(2);
    expect(mockInstallStartup).toHaveBeenCalledTimes(1);
    expect(mockEnsureDaemonRunning).toHaveBeenCalledTimes(1);
    expect(mockRunnerRun).toHaveBeenCalledTimes(1);
  });

  it('does not install startup registration when selector choice is no', async () => {
    mockPromptSelections.push(false);

    await addJob();

    expect(mockRender).toHaveBeenCalledTimes(2);
    expect(mockInstallStartup).not.toHaveBeenCalled();
    expect(mockEnsureDaemonRunning).toHaveBeenCalledTimes(1);
    expect(mockRunnerRun).toHaveBeenCalledTimes(1);
  });

  it('continues add flow without startup install in non-interactive terminals', async () => {
    Object.defineProperty(process.stdin, 'isTTY', { configurable: true, value: false });
    Object.defineProperty(process.stdout, 'isTTY', { configurable: true, value: false });

    await expect(addJob()).resolves.toBeUndefined();

    expect(mockRender).toHaveBeenCalledTimes(1);
    expect(mockInstallStartup).not.toHaveBeenCalled();
    expect(mockEnsureDaemonRunning).toHaveBeenCalledTimes(1);
    expect(mockRunnerRun).toHaveBeenCalledTimes(1);
  });
});

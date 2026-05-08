const mockPrintCommandScreen = jest.fn();
const mockPrintError = jest.fn();
const mockPrintInfo = jest.fn();
const mockPrintKeyValue = jest.fn();
const mockPrintMuted = jest.fn();
const mockPrintSection = jest.fn();
const mockPrintSuccess = jest.fn();
const mockPrintWarning = jest.fn();
const mockIsRichTty = jest.fn(() => true);

const promptAnswers: string[] = [];
const mockCreateInterface = jest.fn(() => ({
  question: jest.fn(async () => promptAnswers.shift() ?? ''),
  close: jest.fn()
}));

const mockEditPromptInteractively = jest.fn();
const mockJobsGetByRef = jest.fn();
const mockJobsUpdateQualificationPromptByRef = jest.fn();

jest.mock('node:readline/promises', () => ({
  createInterface: mockCreateInterface
}));

jest.mock('../../src/cli/ui/consoleUi.js', () => ({
  isRichTty: mockIsRichTty,
  printCommandScreen: mockPrintCommandScreen,
  printError: mockPrintError,
  printInfo: mockPrintInfo,
  printKeyValue: mockPrintKeyValue,
  printMuted: mockPrintMuted,
  printSection: mockPrintSection,
  printSuccess: mockPrintSuccess,
  printWarning: mockPrintWarning
}));

jest.mock('../../src/cli/commands/promptEditor.js', () => ({
  editPromptInteractively: mockEditPromptInteractively
}));

jest.mock('../../src/services/db/repositories/jobsRepo.js', () => ({
  JobsRepository: class {
    getByRef(ref: string) {
      return mockJobsGetByRef(ref);
    }

    updateQualificationPromptByRef(ref: string, prompt: string) {
      return mockJobsUpdateQualificationPromptByRef(ref, prompt);
    }
  }
}));

import { setPrompt, showPrompt } from '../../src/cli/commands/prompt.js';

function createJob(overrides: Partial<{
  id: string;
  slug: string;
  name: string;
  qualificationPrompt: string;
  updatedAt: string;
}> = {}) {
  return {
    id: overrides.id ?? 'job-1',
    slug: overrides.slug ?? 'alpha',
    name: overrides.name ?? 'Alpha',
    description: 'desc',
    qualificationPrompt: overrides.qualificationPrompt ?? 'existing prompt',
    subreddits: ['a'],
    scheduleCron: '*/30 * * * *',
    enabled: true,
    monitorComments: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: overrides.updatedAt ?? '2026-01-02T00:00:00.000Z'
  };
}

describe('prompt command', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    promptAnswers.length = 0;
    mockJobsGetByRef.mockReturnValue(null);
    mockJobsUpdateQualificationPromptByRef.mockReturnValue(null);
    mockEditPromptInteractively.mockResolvedValue(null);
    mockIsRichTty.mockReturnValue(true);
  });

  it('prints only the prompt text in --raw mode', async () => {
    const stdoutSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
    mockJobsGetByRef.mockReturnValue(createJob({ qualificationPrompt: 'raw prompt text' }));

    await showPrompt('job-1', { raw: true });

    expect(stdoutSpy).toHaveBeenCalledWith('raw prompt text\n');
    expect(mockPrintCommandScreen).not.toHaveBeenCalled();
    stdoutSpy.mockRestore();
  });

  it('updates prompt from interactive editor flow', async () => {
    const existing = createJob({ qualificationPrompt: 'old prompt' });
    const updated = createJob({ qualificationPrompt: 'new prompt' });
    mockJobsGetByRef.mockReturnValue(existing);
    mockJobsUpdateQualificationPromptByRef.mockReturnValue(updated);
    promptAnswers.push('y');
    mockEditPromptInteractively.mockResolvedValue('new prompt');

    await showPrompt('alpha');

    expect(mockEditPromptInteractively).toHaveBeenCalledWith('old prompt');
    expect(mockJobsUpdateQualificationPromptByRef).toHaveBeenCalledWith('job-1', 'new prompt');
    expect(mockPrintSuccess).toHaveBeenCalledWith('Updated qualification prompt for Alpha (alpha).');
  });

  it('skips interactive edit in non-rich terminal mode', async () => {
    mockIsRichTty.mockReturnValue(false);
    mockJobsGetByRef.mockReturnValue(createJob());

    await showPrompt('job-1');

    expect(mockEditPromptInteractively).not.toHaveBeenCalled();
    expect(mockPrintInfo).toHaveBeenCalledWith('Use --raw for non-interactive prompt retrieval.');
  });

  it('sets prompt directly with prompt set', async () => {
    const existing = createJob({ qualificationPrompt: 'before' });
    const updated = createJob({ qualificationPrompt: 'after' });
    mockJobsGetByRef.mockReturnValue(existing);
    mockJobsUpdateQualificationPromptByRef.mockReturnValue(updated);

    await setPrompt('alpha', 'after');

    expect(mockJobsUpdateQualificationPromptByRef).toHaveBeenCalledWith('job-1', 'after');
    expect(mockPrintSuccess).toHaveBeenCalledWith('Updated qualification prompt for Alpha (alpha).');
  });

  it('throws when prompt set receives empty text', async () => {
    await expect(setPrompt('alpha', '   ')).rejects.toThrow('Prompt cannot be empty.');
  });
});

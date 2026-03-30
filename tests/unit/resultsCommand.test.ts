const mockRender = jest.fn();
const mockIsRichTty = jest.fn();
const mockPrintCommandScreen = jest.fn();
const mockPrintError = jest.fn();
const mockPrintInfo = jest.fn();
const mockPrintKeyValue = jest.fn();
const mockPrintSection = jest.fn();
const mockPrintWarning = jest.fn();
const mockResolveJobFromArgOrPrompt = jest.fn();
const mockListByJob = jest.fn();
const mockListCommentThreadNodes = jest.fn();

jest.mock('ink', () => ({
  render: mockRender
}));

jest.mock('../../src/cli/ui/consoleUi.js', () => ({
  isRichTty: mockIsRichTty,
  printCommandScreen: mockPrintCommandScreen,
  printError: mockPrintError,
  printInfo: mockPrintInfo,
  printKeyValue: mockPrintKeyValue,
  printSection: mockPrintSection,
  printWarning: mockPrintWarning
}));

jest.mock('../../src/cli/commands/selection.js', () => ({
  resolveJobFromArgOrPrompt: mockResolveJobFromArgOrPrompt
}));

jest.mock('../../src/services/db/repositories/jobsRepo.js', () => ({
  JobsRepository: jest.fn().mockImplementation(() => ({}))
}));

jest.mock('../../src/services/db/repositories/scanItemsRepo.js', () => ({
  ScanItemsRepository: jest.fn().mockImplementation(() => ({
    listByJob: mockListByJob,
    listCommentThreadNodes: mockListCommentThreadNodes
  }))
}));

jest.mock('../../src/ui/components/ResultsViewer.js', () => ({
  ResultsViewer: () => null
}));

import { showResults } from '../../src/cli/commands/results.js';

describe('showResults command', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockListCommentThreadNodes.mockReturnValue([]);
    mockRender.mockReturnValue({
      unmount: jest.fn(),
      waitUntilExit: jest.fn(async () => undefined)
    });
  });

  it('shows warning when selected job has no results', async () => {
    mockResolveJobFromArgOrPrompt.mockResolvedValue({
      id: 'job-1',
      slug: 'alpha',
      name: 'Alpha'
    });
    mockListByJob.mockReturnValue([]);

    await showResults('alpha');

    expect(mockPrintWarning).toHaveBeenCalledWith('No results found for Alpha (alpha).');
    expect(mockRender).not.toHaveBeenCalled();
  });

  it('renders interactive viewer in rich TTY mode', async () => {
    mockResolveJobFromArgOrPrompt.mockResolvedValue({
      id: 'job-1',
      slug: 'alpha',
      name: 'Alpha'
    });
    mockListByJob.mockReturnValue([
      {
        id: 'scan-1',
        jobId: 'job-1',
        runId: 'run-1',
        type: 'post',
        redditPostId: 'post-1',
        redditCommentId: null,
        subreddit: 'askreddit',
        author: 'alice',
        title: 'title',
        body: 'body',
        url: 'https://example.com',
        redditPostedAt: '2026-03-01T00:00:00.000Z',
        qualified: true,
        viewed: false,
        validated: false,
        processed: false,
        qualificationReason: 'fit',
        promptTokens: 1,
        completionTokens: 1,
        estimatedCostUsd: 0.000001,
        createdAt: '2026-03-01T00:00:00.000Z'
      }
    ]);
    mockIsRichTty.mockReturnValue(true);

    await showResults('alpha');

    expect(mockResolveJobFromArgOrPrompt).toHaveBeenCalledWith(expect.any(Object), 'alpha', {
      requiredForMessage: 'results viewing'
    });
    expect(mockRender).toHaveBeenCalledTimes(1);
  });

  it('prints flat output when rich TTY is unavailable', async () => {
    mockResolveJobFromArgOrPrompt.mockResolvedValue({
      id: 'job-1',
      slug: 'alpha',
      name: 'Alpha'
    });
    mockListByJob.mockReturnValue([
      {
        id: 'scan-1',
        jobId: 'job-1',
        runId: 'run-1',
        type: 'comment',
        redditPostId: 'post-1',
        redditCommentId: 'c1',
        subreddit: 'askreddit',
        author: 'alice',
        title: null,
        body: 'body',
        url: 'https://example.com',
        redditPostedAt: '2026-03-01T00:00:00.000Z',
        qualified: false,
        viewed: false,
        validated: false,
        processed: false,
        qualificationReason: 'no',
        promptTokens: 0,
        completionTokens: 0,
        estimatedCostUsd: null,
        createdAt: '2026-03-01T00:00:00.000Z'
      }
    ]);
    mockIsRichTty.mockReturnValue(false);

    await showResults('alpha');

    expect(mockPrintWarning).toHaveBeenCalledWith('Rich terminal not detected; rendering flat output.');
    expect(mockPrintSection).toHaveBeenCalledWith('Results');
    expect(mockRender).not.toHaveBeenCalled();
  });

  it('returns early when no job is resolved', async () => {
    mockResolveJobFromArgOrPrompt.mockResolvedValue(null);

    await showResults();

    expect(mockListByJob).not.toHaveBeenCalled();
  });
});

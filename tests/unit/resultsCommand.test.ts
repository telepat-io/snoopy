const mockRender = jest.fn();
const mockIsRichTty = jest.fn();
const mockPrintCommandScreen = jest.fn();
const mockPrintError = jest.fn();
const mockPrintInfo = jest.fn();
const mockPrintKeyValue = jest.fn();
const mockPrintSection = jest.fn();
const mockPrintWarning = jest.fn();
const mockResolveJobFromArgOrPrompt = jest.fn();
const mockCountByJob = jest.fn();
const mockListByJobPage = jest.fn();
const mockGetByJobIndex = jest.fn();
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
    countByJob: mockCountByJob,
    listByJobPage: mockListByJobPage,
    getByJobIndex: mockGetByJobIndex,
    listCommentThreadNodes: mockListCommentThreadNodes
  }))
}));

jest.mock('../../src/ui/components/ResultsViewer.js', () => ({
  ResultsViewer: () => null
}));

import { showResults } from '../../src/cli/commands/results.js';

function getRenderedProps(): Record<string, unknown> {
  return ((mockRender.mock.calls[0]?.[0] as { props?: Record<string, unknown> } | undefined)?.props ?? {});
}

describe('showResults command', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCountByJob.mockReturnValue(0);
    mockListByJobPage.mockReturnValue([]);
    mockGetByJobIndex.mockReturnValue(null);
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
    mockCountByJob.mockReturnValue(0);

    await showResults('alpha');

    expect(mockPrintWarning).toHaveBeenCalledWith('No results found for Alpha (alpha).');
    expect(mockRender).not.toHaveBeenCalled();
  });

  it('renders interactive viewer in rich TTY mode and caches item/thread lookups', async () => {
    mockResolveJobFromArgOrPrompt.mockResolvedValue({
      id: 'job-1',
      slug: 'alpha',
      name: 'Alpha'
    });
    mockCountByJob.mockReturnValue(2);
    mockGetByJobIndex.mockImplementation((_jobId: string, index: number) => {
      if (index === 0) {
        return {
          id: 'scan-1',
          jobId: 'job-1',
          runId: 'run-1',
          type: 'comment',
          redditPostId: 'post-1',
          redditCommentId: 'c-1',
          subreddit: 'askreddit',
          author: 'alice',
          title: 'title',
          body: 'body',
          url: 'https://example.com/1',
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
        };
      }

      if (index === 1) {
        return {
          id: 'scan-2',
          jobId: 'job-1',
          runId: 'run-1',
          type: 'post',
          redditPostId: 'post-2',
          redditCommentId: null,
          subreddit: 'askreddit',
          author: 'bob',
          title: 'other title',
          body: 'other body',
          url: 'https://example.com/2',
          redditPostedAt: '2026-03-01T01:00:00.000Z',
          qualified: false,
          viewed: false,
          validated: false,
          processed: false,
          qualificationReason: 'no fit',
          promptTokens: 2,
          completionTokens: 2,
          estimatedCostUsd: 0.000002,
          createdAt: '2026-03-01T01:00:00.000Z'
        };
      }

      return null;
    });
    mockListCommentThreadNodes.mockReturnValue([{ id: 'node-1' }]);
    mockIsRichTty.mockReturnValue(true);

    await showResults('alpha');

    const props = getRenderedProps() as {
      totalItems: number;
      getItemAt: (index: number) => unknown;
    };
    expect(mockResolveJobFromArgOrPrompt).toHaveBeenCalledWith(expect.any(Object), 'alpha', {
      requiredForMessage: 'results viewing'
    });
    expect(mockRender).toHaveBeenCalledTimes(1);
    expect(props.totalItems).toBe(2);
    expect(props.getItemAt(-1)).toBeNull();
    expect(props.getItemAt(0)).toEqual(
      expect.objectContaining({ id: 'scan-1', commentThreadNodes: [{ id: 'node-1' }] })
    );
    expect(props.getItemAt(0)).toEqual(
      expect.objectContaining({ id: 'scan-1', commentThreadNodes: [{ id: 'node-1' }] })
    );
    expect(props.getItemAt(1)).toEqual(expect.objectContaining({ id: 'scan-2', commentThreadNodes: [] }));
    expect(mockGetByJobIndex).toHaveBeenCalledTimes(2);
    expect(mockListCommentThreadNodes).toHaveBeenCalledTimes(1);
  });

  it('prints flat output when rich TTY is unavailable', async () => {
    mockResolveJobFromArgOrPrompt.mockResolvedValue({
      id: 'job-1',
      slug: 'alpha',
      name: 'Alpha'
    });
    mockCountByJob.mockReturnValue(51);
    mockListByJobPage.mockReturnValue([
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
    mockListCommentThreadNodes.mockReturnValueOnce([]).mockReturnValueOnce([{ id: 'node-2' }]);
    mockIsRichTty.mockReturnValue(false);

    await showResults('alpha');

    expect(mockPrintWarning).toHaveBeenCalledWith('Rich terminal not detected; rendering flat output.');
    expect(mockPrintSection).toHaveBeenCalledWith('Results');
    expect(mockPrintWarning).toHaveBeenCalledWith('Thread unavailable for this item.');
    expect(mockPrintInfo).toHaveBeenCalledWith('Showing first 1 of 51 result(s). Use a rich TTY to browse all items.');
    expect(mockRender).not.toHaveBeenCalled();
  });

  it('prints thread-node counts for flat comment results when thread data exists', async () => {
    mockResolveJobFromArgOrPrompt.mockResolvedValue({
      id: 'job-1',
      slug: 'alpha',
      name: 'Alpha'
    });
    mockCountByJob.mockReturnValue(1);
    mockListByJobPage.mockReturnValue([
      {
        id: 'scan-2',
        jobId: 'job-1',
        runId: 'run-1',
        type: 'comment',
        redditPostId: 'post-1',
        redditCommentId: 'c2',
        subreddit: 'askreddit',
        author: 'bob',
        title: null,
        body: 'body',
        url: 'https://example.com/comment',
        redditPostedAt: '2026-03-01T00:00:00.000Z',
        qualified: true,
        viewed: false,
        validated: false,
        processed: false,
        qualificationReason: 'yes',
        promptTokens: 0,
        completionTokens: 0,
        estimatedCostUsd: null,
        createdAt: '2026-03-01T00:00:00.000Z'
      }
    ]);
    mockListCommentThreadNodes.mockReset();
    mockListCommentThreadNodes.mockReturnValue([{ id: 'node-1' }, { id: 'node-2' }]);
    mockIsRichTty.mockReturnValue(false);

    await showResults('alpha');

    expect(mockListCommentThreadNodes).toHaveBeenCalledWith('scan-2');
    expect(mockPrintKeyValue).toHaveBeenCalledWith('Thread nodes', '2');
  });

  it('prints an error when the interactive viewer fails to open', async () => {
    mockResolveJobFromArgOrPrompt.mockResolvedValue({
      id: 'job-1',
      slug: 'alpha',
      name: 'Alpha'
    });
    mockCountByJob.mockReturnValue(1);
    mockIsRichTty.mockReturnValue(true);
    mockRender.mockImplementationOnce(() => {
      throw new Error('viewer boom');
    });

    await showResults('alpha');

    expect(mockPrintError).toHaveBeenCalledWith('Failed to open results viewer: viewer boom');
  });

  it('returns early when no job is resolved', async () => {
    mockResolveJobFromArgOrPrompt.mockResolvedValue(null);

    await showResults();

    expect(mockCountByJob).not.toHaveBeenCalled();
  });
});

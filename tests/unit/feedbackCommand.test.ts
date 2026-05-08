const mockPrintCommandScreen = jest.fn();
const mockPrintError = jest.fn();
const mockPrintInfo = jest.fn();
const mockPrintKeyValue = jest.fn();
const mockPrintMuted = jest.fn();
const mockPrintSection = jest.fn();
const mockPrintSuccess = jest.fn();
const mockPrintWarning = jest.fn();
const mockIsRichTty = jest.fn(() => false);

const mockJobsGetByRef = jest.fn();
const mockScanListUnvalidatedQualified = jest.fn();
const mockScanGetQualifiedById = jest.fn();
const mockScanSubmitFeedback = jest.fn();
const mockScanCountPendingFeedbackConsolidation = jest.fn();
const mockConsolidateFeedback = jest.fn();

jest.mock('../../src/cli/ui/consoleUi.js', () => ({
  printCommandScreen: mockPrintCommandScreen,
  printError: mockPrintError,
  printInfo: mockPrintInfo,
  printKeyValue: mockPrintKeyValue,
  printMuted: mockPrintMuted,
  printSection: mockPrintSection,
  printSuccess: mockPrintSuccess,
  printWarning: mockPrintWarning,
  isRichTty: mockIsRichTty
}));

jest.mock('../../src/services/db/repositories/jobsRepo.js', () => ({
  JobsRepository: jest.fn().mockImplementation(() => ({
    getByRef: mockJobsGetByRef
  }))
}));

jest.mock('../../src/services/db/repositories/scanItemsRepo.js', () => ({
  ScanItemsRepository: jest.fn().mockImplementation(() => ({
    listUnvalidatedQualified: mockScanListUnvalidatedQualified,
    getQualifiedById: mockScanGetQualifiedById,
    submitFeedback: mockScanSubmitFeedback,
    countPendingFeedbackConsolidation: mockScanCountPendingFeedbackConsolidation,
    listCommentThreadNodes: jest.fn().mockReturnValue([])
  }))
}));

jest.mock('../../src/services/feedback/consolidationService.js', () => ({
  consolidateFeedback: mockConsolidateFeedback
}));

import type { QualifiedScanItemRow } from '../../src/services/db/repositories/scanItemsRepo.js';
import { feedbackReview, feedbackSubmit, feedbackConsolidate } from '../../src/cli/commands/feedback.js';

function makeRow(id: string, overrides: Partial<QualifiedScanItemRow> = {}): QualifiedScanItemRow {
  return {
    id,
    jobId: 'job-1',
    runId: 'run-1',
    type: 'post',
    subreddit: 'askreddit',
    author: 'author',
    title: 'Title',
    body: 'Body',
    url: 'https://reddit.com/item',
    redditPostedAt: '2026-03-31T00:00:00.000Z',
    viewed: false,
    validated: false,
    isValid: false,
    isValidReason: null,
    feedbackConsolidated: false,
    processed: false,
    consumed: false,
    qualificationReason: 'fit',
    createdAt: '2026-03-31T00:00:00.000Z',
    ...overrides
  };
}

describe('feedback command', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockJobsGetByRef.mockReturnValue(null);
    mockScanListUnvalidatedQualified.mockReturnValue([]);
    mockScanGetQualifiedById.mockReturnValue(null);
    mockScanSubmitFeedback.mockReturnValue(true);
    mockScanCountPendingFeedbackConsolidation.mockReturnValue(0);
    mockConsolidateFeedback.mockResolvedValue({
      totalPendingBefore: 0,
      totalPendingAfter: 0,
      totalConsolidated: 0,
      requiresConsolidation: false,
      jobs: []
    });
  });

  it('returns empty array in review --json mode when queue is empty and does not print command screen', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    await feedbackReview(undefined, { json: true });

    expect(consoleSpy).toHaveBeenCalledWith(JSON.stringify([], null, 2));
    expect(mockPrintCommandScreen).not.toHaveBeenCalled();
    expect(mockPrintInfo).not.toHaveBeenCalledWith('No more results to validate. Exiting review.');
    consoleSpy.mockRestore();
  });

  it('prints explicit exit message in TUI mode when queue is empty', async () => {
    await feedbackReview();

    expect(mockPrintCommandScreen).toHaveBeenCalledWith('Feedback', 'Review feedback queue');
    expect(mockPrintInfo).toHaveBeenCalledWith('No more results to validate. Exiting review.');
  });

  it('throws when submit has both --valid and --invalid', async () => {
    mockScanGetQualifiedById.mockReturnValue(makeRow('row-1'));

    await expect(feedbackSubmit('row-1', { valid: true, invalid: true })).rejects.toThrow(
      'Choose exactly one: --valid or --invalid.'
    );
  });

  it('throws when submit has --invalid without reason', async () => {
    mockScanGetQualifiedById.mockReturnValue(makeRow('row-1'));

    await expect(feedbackSubmit('row-1', { invalid: true })).rejects.toThrow(
      'A reason is required when using --invalid.'
    );
  });

  it('emits json payload from submit including consolidation hints', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    mockScanGetQualifiedById.mockReturnValue(makeRow('row-1', { jobId: 'job-77' }));
    mockScanCountPendingFeedbackConsolidation.mockReturnValue(2);

    await feedbackSubmit('row-1', { valid: true, json: true });

    expect(mockScanSubmitFeedback).toHaveBeenCalledWith('row-1', true, null);
    const payload = JSON.parse(String(consoleSpy.mock.calls[0]?.[0] ?? '{}')) as Record<string, unknown>;
    expect(payload).toEqual(
      expect.objectContaining({
        resultId: 'row-1',
        saved: true,
        requiresConsolidation: true,
        recommendedNextCommand: 'snoopy feedback consolidate'
      })
    );
    consoleSpy.mockRestore();
  });

  it('prints no pending message in consolidate when nothing to process', async () => {
    await feedbackConsolidate();

    expect(mockConsolidateFeedback).toHaveBeenCalledWith({ jobRef: undefined, limit: undefined });
    expect(mockPrintInfo).toHaveBeenCalledWith('No pending feedback to consolidate.');
  });
});

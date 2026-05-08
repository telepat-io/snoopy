const mockJobsGetByRef = jest.fn();
const mockScanListUnvalidatedQualified = jest.fn();
const mockScanGetQualifiedById = jest.fn();
const mockScanSubmitFeedback = jest.fn();
const mockScanCountPendingFeedbackConsolidation = jest.fn();
const mockConsolidateFeedback = jest.fn();

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
    countPendingFeedbackConsolidation: mockScanCountPendingFeedbackConsolidation
  }))
}));

jest.mock('../../src/services/feedback/consolidationService.js', () => ({
  consolidateFeedback: mockConsolidateFeedback
}));

import type { QualifiedScanItemRow } from '../../src/services/db/repositories/scanItemsRepo.js';
import { feedbackConsolidateReport, feedbackReviewReport, feedbackSubmitReport } from '../../src/mcp/helpers.js';

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

describe('mcp helpers feedback reports', () => {
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

  it('returns queue with workflow hints in feedbackReviewReport', () => {
    mockScanListUnvalidatedQualified.mockReturnValue([makeRow('row-1')]);

    const result = feedbackReviewReport(undefined, 5);

    expect(mockScanListUnvalidatedQualified).toHaveBeenCalledWith(undefined, 5);
    expect(result).toEqual(
      expect.objectContaining({
        count: 1,
        limit: 5,
        workflow: {
          nextStep: 'collect-user-feedback-and-call-snoopy_feedback_submit',
          then: 'call-snoopy_feedback_consolidate'
        }
      })
    );
  });

  it('throws when feedbackSubmitReport invalid verdict has no reason', () => {
    mockScanGetQualifiedById.mockReturnValue(makeRow('row-1'));

    expect(() => feedbackSubmitReport('row-1', false)).toThrow('reason is required when isValid=false');
  });

  it('returns submit status with consolidation recommendation', () => {
    mockScanGetQualifiedById.mockReturnValue(makeRow('row-1', { jobId: 'job-42' }));
    mockScanCountPendingFeedbackConsolidation.mockReturnValue(3);

    const result = feedbackSubmitReport('row-1', true);

    expect(mockScanSubmitFeedback).toHaveBeenCalledWith('row-1', true, null);
    expect(result).toEqual(
      expect.objectContaining({
        resultId: 'row-1',
        saved: true,
        pendingFeedbackConsolidationCount: 3,
        requiresConsolidation: true,
        recommendedNextCommand: 'snoopy feedback consolidate'
      })
    );
  });

  it('returns consolidation report with recommendedNextAction', async () => {
    mockConsolidateFeedback.mockResolvedValue({
      totalPendingBefore: 2,
      totalPendingAfter: 1,
      totalConsolidated: 1,
      requiresConsolidation: true,
      jobs: []
    });

    const result = await feedbackConsolidateReport('alpha', 10);

    expect(mockConsolidateFeedback).toHaveBeenCalledWith({ jobRef: 'alpha', limit: 10 });
    expect(result).toEqual(
      expect.objectContaining({
        requiresConsolidation: true,
        recommendedNextAction: 'run snoopy feedback consolidate again'
      })
    );
  });
});

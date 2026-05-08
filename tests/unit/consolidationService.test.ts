const mockJobsGetByRef = jest.fn();
const mockJobsGetById = jest.fn();
const mockJobsUpdateQualificationPromptById = jest.fn();

const mockScanListPendingFeedbackConsolidation = jest.fn();
const mockScanMarkFeedbackConsolidated = jest.fn();
const mockScanCountPendingFeedbackConsolidation = jest.fn();

const mockSettingsGetAppSettings = jest.fn();
const mockGetOpenRouterApiKey = jest.fn();
const mockConsolidateQualificationPrompt = jest.fn();

jest.mock('../../src/services/db/repositories/jobsRepo.js', () => ({
  JobsRepository: jest.fn().mockImplementation(() => ({
    getByRef: mockJobsGetByRef,
    getById: mockJobsGetById,
    updateQualificationPromptById: mockJobsUpdateQualificationPromptById
  }))
}));

jest.mock('../../src/services/db/repositories/scanItemsRepo.js', () => ({
  ScanItemsRepository: jest.fn().mockImplementation(() => ({
    listPendingFeedbackConsolidation: mockScanListPendingFeedbackConsolidation,
    markFeedbackConsolidated: mockScanMarkFeedbackConsolidated,
    countPendingFeedbackConsolidation: mockScanCountPendingFeedbackConsolidation
  }))
}));

jest.mock('../../src/services/db/repositories/settingsRepo.js', () => ({
  SettingsRepository: jest.fn().mockImplementation(() => ({
    getAppSettings: mockSettingsGetAppSettings
  }))
}));

jest.mock('../../src/services/security/secretStore.js', () => ({
  getOpenRouterApiKey: mockGetOpenRouterApiKey
}));

jest.mock('../../src/services/openrouter/client.js', () => ({
  OpenRouterClient: jest.fn().mockImplementation(() => ({
    consolidateQualificationPrompt: mockConsolidateQualificationPrompt
  }))
}));

import type { QualifiedScanItemRow } from '../../src/services/db/repositories/scanItemsRepo.js';
import { consolidateFeedback } from '../../src/services/feedback/consolidationService.js';

function makeRow(id: string, overrides: Partial<QualifiedScanItemRow> = {}): QualifiedScanItemRow {
  return {
    id,
    jobId: 'job-1',
    runId: 'run-1',
    type: 'post',
    subreddit: 'askreddit',
    author: 'alice',
    title: 'Title',
    body: 'Body',
    url: 'https://reddit.com/item',
    redditPostedAt: '2026-03-31T00:00:00.000Z',
    viewed: false,
    validated: true,
    isValid: false,
    isValidReason: 'Not a buying signal',
    feedbackConsolidated: false,
    processed: false,
    consumed: false,
    qualificationReason: 'fit',
    createdAt: '2026-03-31T00:00:00.000Z',
    ...overrides
  };
}

describe('consolidationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockJobsGetByRef.mockReturnValue(null);
    mockJobsGetById.mockReturnValue({
      id: 'job-1',
      slug: 'alpha',
      name: 'Alpha',
      qualificationPrompt: 'Current prompt'
    });
    mockScanListPendingFeedbackConsolidation.mockReturnValue([]);
    mockScanMarkFeedbackConsolidated.mockReturnValue(0);
    mockScanCountPendingFeedbackConsolidation.mockReturnValue(0);
    mockSettingsGetAppSettings.mockReturnValue({
      model: 'test-model',
      modelSettings: {
        temperature: 0.2,
        maxTokens: 300,
        topP: 0.9
      }
    });
    mockGetOpenRouterApiKey.mockResolvedValue('key-123');
    mockConsolidateQualificationPrompt.mockResolvedValue({
      revisedQualificationPrompt: 'Improved prompt',
      changeSummary: ['Added clearer disqualifier'],
      rationale: 'Generalized invalid reasons',
      promptTokens: 100,
      completionTokens: 40
    });
  });

  it('returns early with zeroes when no pending feedback exists', async () => {
    const result = await consolidateFeedback();

    expect(result).toEqual({
      jobRef: undefined,
      totalPendingBefore: 0,
      totalPendingAfter: 0,
      totalConsolidated: 0,
      requiresConsolidation: false,
      jobs: []
    });
    expect(mockGetOpenRouterApiKey).not.toHaveBeenCalled();
  });

  it('throws when jobRef is provided but does not resolve', async () => {
    await expect(consolidateFeedback({ jobRef: 'missing' })).rejects.toThrow('Job not found: missing');
  });

  it('consolidates feedback for a known job and updates prompt/flags', async () => {
    mockScanListPendingFeedbackConsolidation.mockReturnValue([
      makeRow('r1', { jobId: 'job-1', isValid: false, isValidReason: 'No buying intent' }),
      makeRow('r2', { jobId: 'job-1', isValid: true, isValidReason: null })
    ]);
    mockScanMarkFeedbackConsolidated.mockReturnValue(2);
    mockScanCountPendingFeedbackConsolidation.mockReturnValue(0);

    const result = await consolidateFeedback();

    expect(mockConsolidateQualificationPrompt).toHaveBeenCalledWith(
      expect.objectContaining({
        currentQualificationPrompt: 'Current prompt',
        feedbackItems: [expect.objectContaining({ id: 'r1', userIsValid: false, userReason: 'No buying intent' })]
      })
    );
    expect(mockJobsUpdateQualificationPromptById).toHaveBeenCalledWith('job-1', 'Improved prompt');
    expect(mockScanMarkFeedbackConsolidated).toHaveBeenCalledWith(['r1', 'r2']);

    expect(result.totalPendingBefore).toBe(2);
    expect(result.totalConsolidated).toBe(2);
    expect(result.requiresConsolidation).toBe(false);
    expect(result.jobs[0]).toEqual(
      expect.objectContaining({
        jobId: 'job-1',
        consolidatedCount: 2,
        promptUpdated: true,
        changeSummary: ['Added clearer disqualifier']
      })
    );
  });

  it('skips prompt update when pending feedback has no invalid items with reasons', async () => {
    mockScanListPendingFeedbackConsolidation.mockReturnValue([
      makeRow('r1', { jobId: 'job-1', isValid: true, isValidReason: null }),
      makeRow('r2', { jobId: 'job-1', isValid: false, isValidReason: '   ' }),
    ]);
    mockScanMarkFeedbackConsolidated.mockReturnValue(2);
    mockScanCountPendingFeedbackConsolidation.mockReturnValue(0);

    const result = await consolidateFeedback();

    expect(mockConsolidateQualificationPrompt).not.toHaveBeenCalled();
    expect(mockJobsUpdateQualificationPromptById).not.toHaveBeenCalled();
    expect(mockScanMarkFeedbackConsolidated).toHaveBeenCalledWith(['r1', 'r2']);
    expect(result.jobs[0]).toEqual(
      expect.objectContaining({
        jobId: 'job-1',
        consolidatedCount: 2,
        promptUpdated: false,
      })
    );
  });

  it('continues processing and reports errors when one job fails', async () => {
    mockScanListPendingFeedbackConsolidation.mockReturnValue([
      makeRow('r1', { jobId: 'job-1' }),
      makeRow('r2', { jobId: 'job-2' })
    ]);
    mockJobsGetById.mockImplementation((jobId: string) => {
      if (jobId === 'job-1') {
        return { id: 'job-1', slug: 'alpha', name: 'Alpha', qualificationPrompt: 'Prompt A' };
      }
      return { id: 'job-2', slug: 'beta', name: 'Beta', qualificationPrompt: 'Prompt B' };
    });

    mockConsolidateQualificationPrompt
      .mockResolvedValueOnce({
        revisedQualificationPrompt: 'Improved A',
        changeSummary: ['A'],
        rationale: 'A',
        promptTokens: 10,
        completionTokens: 5
      })
      .mockRejectedValueOnce(new Error('LLM failed'));

    mockScanMarkFeedbackConsolidated.mockReturnValueOnce(1);
    mockScanCountPendingFeedbackConsolidation.mockReturnValue(1);

    const result = await consolidateFeedback();

    expect(result.totalPendingBefore).toBe(2);
    expect(result.totalConsolidated).toBe(1);
    expect(result.requiresConsolidation).toBe(true);
    expect(result.jobs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ jobId: 'job-1', consolidatedCount: 1, promptUpdated: true }),
        expect.objectContaining({ jobId: 'job-2', consolidatedCount: 0, promptUpdated: false, error: 'LLM failed' })
      ])
    );
  });
});

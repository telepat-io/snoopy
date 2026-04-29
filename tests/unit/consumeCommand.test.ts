const mockPrintCommandScreen = jest.fn();
const mockPrintError = jest.fn();
const mockPrintInfo = jest.fn();
const mockPrintKeyValue = jest.fn();
const mockPrintMuted = jest.fn();
const mockPrintSuccess = jest.fn();
const mockPrintWarning = jest.fn();

const mockJobsGetByRef = jest.fn();
const mockScanListUnconsumedQualified = jest.fn();
const mockScanMarkConsumed = jest.fn();

jest.mock('../../src/cli/ui/consoleUi.js', () => ({
  printCommandScreen: mockPrintCommandScreen,
  printError: mockPrintError,
  printInfo: mockPrintInfo,
  printKeyValue: mockPrintKeyValue,
  printMuted: mockPrintMuted,
  printSuccess: mockPrintSuccess,
  printWarning: mockPrintWarning
}));

jest.mock('../../src/services/db/repositories/jobsRepo.js', () => ({
  JobsRepository: jest.fn().mockImplementation(() => ({
    getByRef: mockJobsGetByRef
  }))
}));

jest.mock('../../src/services/db/repositories/scanItemsRepo.js', () => ({
  ScanItemsRepository: jest.fn().mockImplementation(() => ({
    listUnconsumedQualified: mockScanListUnconsumedQualified,
    markConsumed: mockScanMarkConsumed
  }))
}));

import type { QualifiedScanItemRow } from '../../src/services/db/repositories/scanItemsRepo.js';
import { consumeResults } from '../../src/cli/commands/consume.js';

describe('consume command', () => {
  function makeRow(id: string, overrides: Partial<QualifiedScanItemRow> = {}): QualifiedScanItemRow {
    return {
      id,
      jobId: 'job-1',
      runId: 'run-1',
      author: 'author',
      title: 'Title',
      body: 'Body',
      url: 'https://reddit.com/item',
      redditPostedAt: '2026-03-31T00:00:00.000Z',
      viewed: false,
      validated: false,
      processed: false,
      consumed: false,
      qualificationReason: 'fit',
      createdAt: '2026-03-31T00:00:00.000Z',
      ...overrides
    };
  }

  beforeEach(() => {
    jest.clearAllMocks();
    mockJobsGetByRef.mockReturnValue(null);
    mockScanListUnconsumedQualified.mockReturnValue([]);
    mockScanMarkConsumed.mockReturnValue(0);
  });

  it('returns warning when no unconsumed results exist', () => {
    consumeResults();

    expect(mockScanListUnconsumedQualified).toHaveBeenCalledWith(undefined, undefined);
    expect(mockPrintWarning).toHaveBeenCalledWith('No unconsumed qualified results found.');
    expect(mockScanMarkConsumed).not.toHaveBeenCalled();
  });

  it('returns empty JSON array when no unconsumed results exist and --json is set', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consumeResults(undefined, { json: true });

    expect(mockScanListUnconsumedQualified).toHaveBeenCalledWith(undefined, undefined);
    expect(consoleSpy).toHaveBeenCalledWith(JSON.stringify([], null, 2));
    expect(mockPrintWarning).not.toHaveBeenCalled();
    expect(mockScanMarkConsumed).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('filters by job when jobRef is provided', () => {
    mockJobsGetByRef.mockReturnValue({ id: 'job-1', slug: 'alpha' });
    mockScanListUnconsumedQualified.mockReturnValue([makeRow('row-1')]);
    mockScanMarkConsumed.mockReturnValue(1);

    consumeResults('alpha');

    expect(mockJobsGetByRef).toHaveBeenCalledWith('alpha');
    expect(mockScanListUnconsumedQualified).toHaveBeenCalledWith('job-1', undefined);
    expect(mockScanMarkConsumed).toHaveBeenCalledWith(['row-1']);
    expect(mockPrintSuccess).toHaveBeenCalledWith('Consumed 1 result(s).');
  });

  it('returns error when jobRef does not exist', () => {
    consumeResults('missing');

    expect(mockPrintError).toHaveBeenCalledWith('Job not found: missing');
    expect(mockScanListUnconsumedQualified).not.toHaveBeenCalled();
  });

  it('returns results across all jobs when no jobRef is provided', () => {
    mockScanListUnconsumedQualified.mockReturnValue([
      makeRow('row-1', { jobId: 'job-1' }),
      makeRow('row-2', { jobId: 'job-2' })
    ]);
    mockScanMarkConsumed.mockReturnValue(2);

    consumeResults();

    expect(mockScanListUnconsumedQualified).toHaveBeenCalledWith(undefined, undefined);
    expect(mockScanMarkConsumed).toHaveBeenCalledWith(['row-1', 'row-2']);
    expect(mockPrintSuccess).toHaveBeenCalledWith('Consumed 2 result(s).');
  });

  it('respects --limit when provided', () => {
    mockScanListUnconsumedQualified.mockReturnValue([makeRow('row-1')]);

    consumeResults(undefined, { limit: 5 });

    expect(mockScanListUnconsumedQualified).toHaveBeenCalledWith(undefined, 5);
  });

  it('outputs JSON when --json is selected', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const rows = [makeRow('row-1')];
    mockScanListUnconsumedQualified.mockReturnValue(rows);

    consumeResults(undefined, { json: true });

    expect(consoleSpy).toHaveBeenCalledWith(JSON.stringify(rows, null, 2));
    consoleSpy.mockRestore();
  });

  it('outputs JSON and does not consume when --json and --dry-run are combined', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const rows = [makeRow('row-1'), makeRow('row-2')];
    mockScanListUnconsumedQualified.mockReturnValue(rows);

    consumeResults(undefined, { json: true, dryRun: true });

    expect(consoleSpy).toHaveBeenCalledWith(JSON.stringify(rows, null, 2));
    expect(mockScanMarkConsumed).not.toHaveBeenCalled();
    expect(mockPrintSuccess).toHaveBeenCalledWith('Found 2 result(s) (dry run — not consumed).');
    consoleSpy.mockRestore();
  });

  it('outputs filtered JSON when jobRef and --json are provided', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    mockJobsGetByRef.mockReturnValue({ id: 'job-1', slug: 'alpha' });
    const rows = [makeRow('row-1', { jobId: 'job-1' })];
    mockScanListUnconsumedQualified.mockReturnValue(rows);

    consumeResults('alpha', { json: true });

    expect(mockScanListUnconsumedQualified).toHaveBeenCalledWith('job-1', undefined);
    expect(consoleSpy).toHaveBeenCalledWith(JSON.stringify(rows, null, 2));
    expect(mockScanMarkConsumed).toHaveBeenCalledWith(['row-1']);
    consoleSpy.mockRestore();
  });

  it('does not mark consumed when --dry-run is selected', () => {
    mockScanListUnconsumedQualified.mockReturnValue([makeRow('row-1')]);

    consumeResults(undefined, { dryRun: true });

    expect(mockScanMarkConsumed).not.toHaveBeenCalled();
    expect(mockPrintSuccess).toHaveBeenCalledWith('Found 1 result(s) (dry run — not consumed).');
  });

  it('marks results consumed after displaying them', () => {
    mockScanListUnconsumedQualified.mockReturnValue([
      makeRow('row-1'),
      makeRow('row-2')
    ]);
    mockScanMarkConsumed.mockReturnValue(2);

    consumeResults();

    expect(mockScanMarkConsumed).toHaveBeenCalledWith(['row-1', 'row-2']);
    expect(mockPrintSuccess).toHaveBeenCalledWith('Consumed 2 result(s).');
  });

  it('handles empty markConsumed result gracefully', () => {
    mockScanListUnconsumedQualified.mockReturnValue([makeRow('row-1')]);
    mockScanMarkConsumed.mockReturnValue(0);

    consumeResults();

    expect(mockScanMarkConsumed).toHaveBeenCalledWith(['row-1']);
    expect(mockPrintSuccess).toHaveBeenCalledWith('Consumed 0 result(s).');
  });
});

const mockPrintCommandScreen = jest.fn();
const mockPrintError = jest.fn();
const mockPrintInfo = jest.fn();
const mockPrintKeyValue = jest.fn();
const mockPrintSuccess = jest.fn();
const mockPrintWarning = jest.fn();

const mockJobsGetByRef = jest.fn();
const mockJobsList = jest.fn();
const mockRunsListByJob = jest.fn();
const mockScanListQualifiedByJob = jest.fn();
const mockScanListQualifiedByJobRun = jest.fn();
const mockCsvExport = jest.fn();
const mockJsonExport = jest.fn();

jest.mock('../../src/cli/ui/consoleUi.js', () => ({
  printCommandScreen: mockPrintCommandScreen,
  printError: mockPrintError,
  printInfo: mockPrintInfo,
  printKeyValue: mockPrintKeyValue,
  printSuccess: mockPrintSuccess,
  printWarning: mockPrintWarning
}));

jest.mock('../../src/services/db/repositories/jobsRepo.js', () => ({
  JobsRepository: jest.fn().mockImplementation(() => ({
    getByRef: mockJobsGetByRef,
    list: mockJobsList
  }))
}));

jest.mock('../../src/services/db/repositories/runsRepo.js', () => ({
  RunsRepository: jest.fn().mockImplementation(() => ({
    listByJob: mockRunsListByJob
  }))
}));

jest.mock('../../src/services/db/repositories/scanItemsRepo.js', () => ({
  ScanItemsRepository: jest.fn().mockImplementation(() => ({
    listQualifiedByJob: mockScanListQualifiedByJob,
    listQualifiedByJobRun: mockScanListQualifiedByJobRun
  }))
}));

jest.mock('../../src/services/export/csvResults.js', () => ({
  CsvResultsExporter: jest.fn().mockImplementation(() => ({
    exportJobResults: mockCsvExport
  }))
}));

jest.mock('../../src/services/export/jsonResults.js', () => ({
  JsonResultsExporter: jest.fn().mockImplementation(() => ({
    exportJobResults: mockJsonExport
  }))
}));

import type { Job } from '../../src/types/job.js';
import type { QualifiedScanItemRow } from '../../src/services/db/repositories/scanItemsRepo.js';
import { exportCsv } from '../../src/cli/commands/export.js';

describe('export command', () => {
  function makeJob(id: string, slug: string): Job {
    return {
      id,
      slug,
      name: `Job ${slug}`,
      description: 'desc',
      qualificationPrompt: 'prompt',
      subreddits: ['askreddit'],
      scheduleCron: '*/30 * * * *',
      enabled: true,
      monitorComments: true,
      createdAt: '2026-03-31T00:00:00.000Z',
      updatedAt: '2026-03-31T00:00:00.000Z'
    };
  }

  function makeRow(id: string): QualifiedScanItemRow {
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
      createdAt: '2026-03-31T00:00:00.000Z'
    };
  }

  beforeEach(() => {
    jest.clearAllMocks();
    mockJobsGetByRef.mockReturnValue(null);
    mockJobsList.mockReturnValue([]);
    mockRunsListByJob.mockReturnValue([]);
    mockScanListQualifiedByJob.mockReturnValue([]);
    mockScanListQualifiedByJobRun.mockReturnValue([]);
    mockCsvExport.mockReturnValue({ outputPath: '/tmp/out.csv', rowCount: 0 });
    mockJsonExport.mockReturnValue({ outputPath: '/tmp/out.json', rowCount: 0 });
  });

  it('defaults to CSV export when no format flag is provided', () => {
    const job = makeJob('job-1', 'alpha');
    const rows = [makeRow('row-1')];
    mockJobsList.mockReturnValue([job]);
    mockScanListQualifiedByJob.mockReturnValue(rows);
    mockCsvExport.mockReturnValue({ outputPath: '/tmp/a.csv', rowCount: 1 });

    exportCsv();

    expect(mockScanListQualifiedByJob).toHaveBeenCalledWith('job-1', 100);
    expect(mockCsvExport).toHaveBeenCalledWith(job, rows);
    expect(mockJsonExport).not.toHaveBeenCalled();
    expect(mockPrintSuccess).toHaveBeenCalledWith('Exported 1 file(s), 1 row(s).');
  });

  it('exports JSON when --json is selected', () => {
    const job = makeJob('job-1', 'alpha');
    const rows = [makeRow('row-1')];
    mockJobsList.mockReturnValue([job]);
    mockScanListQualifiedByJob.mockReturnValue(rows);
    mockJsonExport.mockReturnValue({ outputPath: '/tmp/a.json', rowCount: 1 });

    exportCsv(undefined, { json: true });

    expect(mockPrintCommandScreen).toHaveBeenCalledWith('Data exports', 'Export JSON');
    expect(mockJsonExport).toHaveBeenCalledWith(job, rows);
    expect(mockCsvExport).not.toHaveBeenCalled();
  });

  it('throws when both --csv and --json are selected', () => {
    expect(() => exportCsv(undefined, { csv: true, json: true })).toThrow(
      'Please choose only one format flag: --csv or --json.'
    );
  });

  it('filters by latest run when --last-run is selected', () => {
    const job = makeJob('job-1', 'alpha');
    const rows = [makeRow('row-1')];
    mockJobsList.mockReturnValue([job]);
    mockRunsListByJob.mockReturnValue([{ id: 'run-latest' }]);
    mockScanListQualifiedByJobRun.mockReturnValue(rows);
    mockCsvExport.mockReturnValue({ outputPath: '/tmp/a.csv', rowCount: 1 });

    exportCsv(undefined, { lastRun: true });

    expect(mockRunsListByJob).toHaveBeenCalledWith('job-1', 1);
    expect(mockScanListQualifiedByJobRun).toHaveBeenCalledWith('job-1', 'run-latest', 100);
    expect(mockScanListQualifiedByJob).not.toHaveBeenCalled();
    expect(mockCsvExport).toHaveBeenCalledWith(job, rows);
  });

  it('passes default limit of 100 to repository queries', () => {
    const job = makeJob('job-1', 'alpha');
    mockJobsList.mockReturnValue([job]);
    mockScanListQualifiedByJob.mockReturnValue([]);

    exportCsv(undefined, {});

    expect(mockScanListQualifiedByJob).toHaveBeenCalledWith('job-1', 100);
  });

  it('passes explicit --limit to repository queries', () => {
    const job = makeJob('job-1', 'alpha');
    const rows = [makeRow('row-1')];
    mockJobsList.mockReturnValue([job]);
    mockRunsListByJob.mockReturnValue([{ id: 'run-latest' }]);
    mockScanListQualifiedByJobRun.mockReturnValue(rows);
    mockCsvExport.mockReturnValue({ outputPath: '/tmp/a.csv', rowCount: 1 });

    exportCsv(undefined, { lastRun: true, limit: 25 });

    expect(mockScanListQualifiedByJobRun).toHaveBeenCalledWith('job-1', 'run-latest', 25);
  });

  it('skips jobs that have no runs when --last-run is selected', () => {
    const job = makeJob('job-1', 'alpha');
    mockJobsList.mockReturnValue([job]);
    mockRunsListByJob.mockReturnValue([]);

    exportCsv(undefined, { lastRun: true });

    expect(mockPrintWarning).toHaveBeenCalledWith('Skipping Job alpha (alpha): no runs found.');
    expect(mockScanListQualifiedByJobRun).not.toHaveBeenCalled();
    expect(mockCsvExport).not.toHaveBeenCalled();
    expect(mockPrintSuccess).toHaveBeenCalledWith('Exported 0 file(s), 0 row(s).');
  });
});

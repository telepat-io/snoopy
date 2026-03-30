import {
  buildDetailLines,
  computeColumnWidths,
  computeScrollWindow,
  formatHeaderRow,
  formatTableRow
} from '../../src/ui/components/runsTableModel.js';
import type { RunRow } from '../../src/services/db/repositories/runsRepo.js';

function makeRun(overrides: Partial<RunRow> = {}): RunRow {
  return {
    id: 'run-1',
    jobId: 'job-1',
    jobName: 'My Job',
    jobSlug: 'my-job',
    status: 'completed',
    message: null,
    startedAt: '2026-03-30 10:00:00',
    finishedAt: '2026-03-30 10:00:45',
    createdAt: '2026-03-30 10:00:00',
    itemsDiscovered: 100,
    itemsNew: 20,
    itemsQualified: 5,
    promptTokens: 1000,
    completionTokens: 200,
    estimatedCostUsd: 0.001234,
    logFilePath: '/tmp/run.log',
    ...overrides
  };
}

describe('computeScrollWindow', () => {
  it('returns scrollTop=0 when cursor is within the first window', () => {
    const result = computeScrollWindow(3, 0, 20, 10);
    expect(result.scrollTop).toBe(0);
    expect(result.visibleStart).toBe(0);
    expect(result.visibleEnd).toBe(10);
  });

  it('advances scrollTop when cursor moves past the bottom edge', () => {
    const result = computeScrollWindow(10, 0, 20, 10);
    expect(result.scrollTop).toBe(1);
    expect(result.visibleStart).toBe(1);
    expect(result.visibleEnd).toBe(11);
  });

  it('retracts scrollTop when cursor moves above the window', () => {
    const result = computeScrollWindow(2, 5, 20, 10);
    expect(result.scrollTop).toBe(2);
    expect(result.visibleStart).toBe(2);
    expect(result.visibleEnd).toBe(12);
  });

  it('clamps scrollTop so visibleEnd never exceeds totalRows', () => {
    const result = computeScrollWindow(19, 0, 20, 10);
    expect(result.scrollTop).toBe(10);
    expect(result.visibleStart).toBe(10);
    expect(result.visibleEnd).toBe(20);
  });

  it('handles totalRows smaller than windowSize', () => {
    const result = computeScrollWindow(2, 0, 5, 10);
    expect(result.scrollTop).toBe(0);
    expect(result.visibleStart).toBe(0);
    expect(result.visibleEnd).toBe(5);
  });

  it('keeps cursor in view when already in a mid-window position', () => {
    const result = computeScrollWindow(7, 3, 20, 10);
    // cursor 7 is within [3, 13), so scrollTop should stay 3
    expect(result.scrollTop).toBe(3);
  });
});

describe('computeColumnWidths', () => {
  it('picks up long job slugs (capped at max)', () => {
    const runs = [makeRun({ jobSlug: 'A'.repeat(40) })];
    const widths = computeColumnWidths(runs);
    expect(widths.jobName).toBe(32); // capped at COL_MAX.jobName
  });

  it('uses minimum widths for very short values', () => {
    const runs = [makeRun({ jobSlug: 'x' })];
    const widths = computeColumnWidths(runs);
    expect(widths.jobName).toBe(8); // min
  });

  it('falls back to jobId when jobSlug and jobName are null', () => {
    const runs = [makeRun({ jobSlug: null, jobName: null, jobId: 'A'.repeat(15) })];
    const widths = computeColumnWidths(runs);
    expect(widths.jobName).toBe(15);
  });

  it('fixed columns are always constant', () => {
    const runs = [makeRun()];
    const widths = computeColumnWidths(runs);
    expect(widths.scanned).toBe(7);
    expect(widths.qualified).toBe(9);
    expect(widths.cost).toBe(9);
    expect(widths.status).toBe(1);
  });
});

describe('formatTableRow', () => {
  it('returns an array of 6 strings', () => {
    const run = makeRun();
    const widths = computeColumnWidths([run]);
    const cells = formatTableRow(run, widths);
    expect(cells).toHaveLength(6);
    // first 5 columns are padded to their width; status column is a fixed icon
    const keys = ['jobName', 'date', 'scanned', 'qualified', 'cost'] as const;
    keys.forEach((key, i) => {
      expect(cells[i].length).toBe(widths[key]);
    });
    expect(cells[5]).toBe('\u2713'); // completed → ✓
  });

  it('shows ✗ icon for failed runs', () => {
    const run = makeRun({ status: 'failed' });
    const widths = computeColumnWidths([run]);
    const cells = formatTableRow(run, widths);
    expect(cells[5]).toBe('\u2717');
  });

  it('shows … icon for running/unknown status', () => {
    const run = makeRun({ status: 'running' });
    const widths = computeColumnWidths([run]);
    const cells = formatTableRow(run, widths);
    expect(cells[5]).toBe('\u2026');
  });

  it('truncates values longer than the column width', () => {
    const run = makeRun({ jobName: 'A'.repeat(40) });
    const widths = computeColumnWidths([run]);
    const cells = formatTableRow(run, widths);
    expect(cells[0].length).toBe(widths.jobName);
  });
});

describe('formatHeaderRow', () => {
  it('returns 5 header cells padded to the given widths', () => {
    const widths = computeColumnWidths([makeRun()]);
    const cells = formatHeaderRow(widths);
    expect(cells).toHaveLength(6);
    expect(cells[0].trimEnd()).toBe('Job Slug');
  });
});

describe('buildDetailLines', () => {
  it('shows a formatted cost when estimatedCostUsd is set', () => {
    const run = makeRun({ estimatedCostUsd: 0.001234 });
    const lines = buildDetailLines(run);
    const cost = lines.find((l) => l.label === 'Cost');
    expect(cost?.value).toBe('$0.001234');
  });

  it('shows dash for null cost', () => {
    const run = makeRun({ estimatedCostUsd: null });
    const lines = buildDetailLines(run);
    const cost = lines.find((l) => l.label === 'Cost');
    expect(cost?.value).toBe('-');
  });

  it('shows dash for null logFilePath', () => {
    const run = makeRun({ logFilePath: null });
    const lines = buildDetailLines(run);
    const log = lines.find((l) => l.label === 'Log');
    expect(log?.value).toBe('-');
  });

  it('shows actual log path when provided', () => {
    const run = makeRun({ logFilePath: '/var/log/snoopy/run.log' });
    const lines = buildDetailLines(run);
    const log = lines.find((l) => l.label === 'Log');
    expect(log?.value).toBe('/var/log/snoopy/run.log');
  });

  it('formats duration from valid timestamps', () => {
    const run = makeRun({
      startedAt: '2026-03-30T10:00:00Z',
      finishedAt: '2026-03-30T10:00:45Z'
    });
    const lines = buildDetailLines(run);
    const dur = lines.find((l) => l.label === 'Duration');
    expect(dur?.value).toBe('45s');
  });

  it('shows dash for null startedAt', () => {
    const run = makeRun({ startedAt: null });
    const lines = buildDetailLines(run);
    const dur = lines.find((l) => l.label === 'Duration');
    expect(dur?.value).toBe('-');
  });

  it('shows dash for null finishedAt', () => {
    const run = makeRun({ finishedAt: null });
    const lines = buildDetailLines(run);
    const dur = lines.find((l) => l.label === 'Duration');
    expect(dur?.value).toBe('-');
  });

  it('includes Message line when message is set', () => {
    const run = makeRun({ message: 'something went wrong' });
    const lines = buildDetailLines(run);
    const msg = lines.find((l) => l.label === 'Message');
    expect(msg?.value).toBe('something went wrong');
  });

  it('omits Message line when message is null', () => {
    const run = makeRun({ message: null });
    const lines = buildDetailLines(run);
    expect(lines.find((l) => l.label === 'Message')).toBeUndefined();
  });
});

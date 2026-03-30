import {
  buildJobDetailLines,
  computeJobColumnWidths,
  formatJobHeaderRow,
  formatJobTableRow
} from '../../src/ui/components/jobsTableModel.js';
import type { JobSummaryRow } from '../../src/services/db/repositories/jobsRepo.js';

function makeJob(overrides: Partial<JobSummaryRow> = {}): JobSummaryRow {
  return {
    jobId: 'job-1',
    jobSlug: 'my-job',
    jobName: 'My Job',
    enabled: 1,
    description: 'Test job description',
    subredditsJson: JSON.stringify(['programming', 'typescript']),
    scheduleCron: '*/30 * * * *',
    lastRunAt: '2026-03-30 10:00:00',
    totalScanned: 50,
    totalQualified: 5,
    totalCostUsd: 0.001234,
    runCount: 3,
    ...overrides
  };
}

describe('computeJobColumnWidths', () => {
  it('uses minimum widths for short slugs', () => {
    const widths = computeJobColumnWidths([makeJob({ jobSlug: 'x' })]);
    expect(widths.slug).toBe(8);
  });

  it('picks up long slugs (capped at max)', () => {
    const widths = computeJobColumnWidths([makeJob({ jobSlug: 'a'.repeat(40) })]);
    expect(widths.slug).toBe(32);
  });

  it('falls back to minimum lastRun for null lastRunAt', () => {
    const widths = computeJobColumnWidths([makeJob({ lastRunAt: null })]);
    expect(widths.lastRun).toBeGreaterThanOrEqual(5); // at least 'never'
  });

  it('has fixed scanned, qualified, and cost widths', () => {
    const widths = computeJobColumnWidths([makeJob()]);
    expect(widths.scanned).toBe(7);
    expect(widths.qualified).toBe(9);
    expect(widths.cost).toBe(9);
  });
});

describe('formatJobTableRow', () => {
  it('returns an array of 5 padded strings', () => {
    const row = makeJob();
    const widths = computeJobColumnWidths([row]);
    const cells = formatJobTableRow(row, widths);
    expect(cells).toHaveLength(5);
    const keys = ['slug', 'lastRun', 'scanned', 'qualified', 'cost'] as const;
    keys.forEach((key, i) => {
      expect(cells[i].length).toBe(widths[key]);
    });
  });

  it('shows "never" for null lastRunAt', () => {
    const row = makeJob({ lastRunAt: null });
    const widths = computeJobColumnWidths([row]);
    const cells = formatJobTableRow(row, widths);
    expect(cells[1].trimEnd()).toBe('never');
  });

  it('shows dash for zero cost', () => {
    const row = makeJob({ totalCostUsd: 0 });
    const widths = computeJobColumnWidths([row]);
    const cells = formatJobTableRow(row, widths);
    expect(cells[4].trimEnd()).toBe('-');
  });

  it('formats non-zero cost with $ prefix', () => {
    const row = makeJob({ totalCostUsd: 0.001234 });
    const widths = computeJobColumnWidths([row]);
    const cells = formatJobTableRow(row, widths);
    expect(cells[4].trimEnd()).toBe('$0.001234');
  });
});

describe('formatJobHeaderRow', () => {
  it('returns 5 header cells', () => {
    const widths = computeJobColumnWidths([makeJob()]);
    const cells = formatJobHeaderRow(widths);
    expect(cells).toHaveLength(5);
    expect(cells[0].trimEnd()).toBe('Job Slug');
    expect(cells[1].trimEnd()).toBe('Last Run');
  });
});

describe('buildJobDetailLines', () => {
  it('parses subredditsJson into r/ prefixed list', () => {
    const row = makeJob({ subredditsJson: JSON.stringify(['programming', 'typescript']) });
    const lines = buildJobDetailLines(row);
    const subs = lines.find((l) => l.label === 'Subreddits');
    expect(subs?.value).toBe('r/programming, r/typescript');
  });

  it('shows "Yes" for enabled=1', () => {
    const lines = buildJobDetailLines(makeJob({ enabled: 1 }));
    expect(lines.find((l) => l.label === 'Enabled')?.value).toBe('Yes');
  });

  it('shows "No" for enabled=0', () => {
    const lines = buildJobDetailLines(makeJob({ enabled: 0 }));
    expect(lines.find((l) => l.label === 'Enabled')?.value).toBe('No');
  });

  it('shows "never" for null lastRunAt', () => {
    const lines = buildJobDetailLines(makeJob({ lastRunAt: null }));
    expect(lines.find((l) => l.label === 'Last Run')?.value).toBe('never');
  });

  it('shows dash for zero totalCostUsd', () => {
    const lines = buildJobDetailLines(makeJob({ totalCostUsd: 0 }));
    expect(lines.find((l) => l.label === 'Cost')?.value).toBe('-');
  });

  it('formats non-zero totalCostUsd', () => {
    const lines = buildJobDetailLines(makeJob({ totalCostUsd: 0.005 }));
    expect(lines.find((l) => l.label === 'Cost')?.value).toBe('$0.005000');
  });

  it('shows run count', () => {
    const lines = buildJobDetailLines(makeJob({ runCount: 7 }));
    expect(lines.find((l) => l.label === 'Runs')?.value).toBe('7');
  });
});

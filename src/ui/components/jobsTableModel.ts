import type { JobSummaryRow } from '../../services/db/repositories/jobsRepo.js';
import { formatLocalTimestamp } from '../../cli/ui/time.js';
import type { DetailLine } from './runsTableModel.js';
export { computeScrollWindow } from './runsTableModel.js';
export type { DetailLine };

// ── Column layout ─────────────────────────────────────────────────────────────

export interface JobColumnWidths {
  slug: number;
  lastRun: number;
  scanned: number;
  qualified: number;
  cost: number;
}

const COL_MIN = { slug: 8, lastRun: 10, scanned: 7, qualified: 9, cost: 9 } as const;
const COL_MAX = { slug: 32, lastRun: 22, scanned: 7, qualified: 9, cost: 12 } as const;

function pad(value: string, width: number): string {
  if (value.length >= width) return value.slice(0, width);
  return value + ' '.repeat(width - value.length);
}

export function computeJobColumnWidths(rows: JobSummaryRow[]): JobColumnWidths {
  const clamp = (v: number, key: keyof JobColumnWidths): number =>
    Math.min(COL_MAX[key], Math.max(COL_MIN[key], v));

  let slug: number = COL_MIN.slug;
  let lastRun: number = COL_MIN.lastRun;

  for (const row of rows) {
    const slugLen = row.jobSlug.length;
    if (slugLen > slug) slug = slugLen;
    const dateLen = row.lastRunAt ? formatLocalTimestamp(row.lastRunAt).length : 5; // 'never'
    if (dateLen > lastRun) lastRun = dateLen;
  }

  return {
    slug: clamp(slug, 'slug'),
    lastRun: clamp(lastRun, 'lastRun'),
    scanned: COL_MIN.scanned,
    qualified: COL_MIN.qualified,
    cost: COL_MIN.cost
  };
}

function formatCost(totalCostUsd: number): string {
  if (totalCostUsd === 0) return '-';
  return `$${totalCostUsd.toFixed(6)}`;
}

export function formatJobTableRow(row: JobSummaryRow, widths: JobColumnWidths): string[] {
  const lastRun = row.lastRunAt ? formatLocalTimestamp(row.lastRunAt) : 'never';
  const cost = formatCost(row.totalCostUsd);

  return [
    pad(row.jobSlug, widths.slug),
    pad(lastRun, widths.lastRun),
    pad(String(row.totalScanned), widths.scanned),
    pad(String(row.totalQualified), widths.qualified),
    pad(cost, widths.cost)
  ];
}

export function formatJobHeaderRow(widths: JobColumnWidths): string[] {
  return [
    pad('Job Slug', widths.slug),
    pad('Last Run', widths.lastRun),
    pad('Scanned', widths.scanned),
    pad('Qualified', widths.qualified),
    pad('Cost', widths.cost)
  ];
}

// ── Detail view ───────────────────────────────────────────────────────────────

export function buildJobDetailLines(row: JobSummaryRow): DetailLine[] {
  let subreddits = '-';
  try {
    const parsed = JSON.parse(row.subredditsJson) as string[];
    subreddits = parsed.map((s) => `r/${s}`).join(', ');
  } catch {
    subreddits = row.subredditsJson;
  }

  return [
    { label: 'Slug', value: row.jobSlug },
    { label: 'Name', value: row.jobName },
    { label: 'Enabled', value: row.enabled !== 0 ? 'Yes' : 'No' },
    { label: 'Description', value: row.description },
    { label: 'Subreddits', value: subreddits },
    { label: 'Schedule', value: row.scheduleCron },
    { label: 'Runs', value: String(row.runCount) },
    { label: 'Last Run', value: row.lastRunAt ? formatLocalTimestamp(row.lastRunAt) : 'never' },
    { label: 'Scanned', value: String(row.totalScanned) },
    { label: 'Qualified', value: String(row.totalQualified) },
    { label: 'Cost', value: formatCost(row.totalCostUsd) }
  ];
}

import type { RunRow } from '../../services/db/repositories/runsRepo.js';
import { formatRunDisplayTimestamp } from '../../cli/ui/time.js';

// ── Column layout ─────────────────────────────────────────────────────────────

export interface ColumnWidths {
  jobName: number;
  date: number;
  scanned: number;
  qualified: number;
  cost: number;
  status: number;
}

const COL_MIN = { jobName: 8, date: 12, scanned: 7, qualified: 9, cost: 9, status: 1 } as const;
const COL_MAX = { jobName: 32, date: 22, scanned: 7, qualified: 9, cost: 12, status: 1 } as const;

export function computeColumnWidths(runs: RunRow[]): ColumnWidths {
  const clamp = (v: number, key: keyof ColumnWidths): number =>
    Math.min(COL_MAX[key], Math.max(COL_MIN[key], v));

  let jobName: number = COL_MIN.jobName;
  let date: number = COL_MIN.date;

  for (const run of runs) {
    const nameLen = (run.jobSlug ?? run.jobName ?? run.jobId).length;
    if (nameLen > jobName) jobName = nameLen;
    const dateLen = formatRunDisplayTimestamp(run).length;
    if (dateLen > date) date = dateLen;
  }

  return {
    jobName: clamp(jobName, 'jobName'),
    date: clamp(date, 'date'),
    scanned: COL_MIN.scanned,
    qualified: COL_MIN.qualified,
    cost: COL_MIN.cost,
    status: COL_MIN.status
  };
}

function pad(value: string, width: number): string {
  if (value.length >= width) return value.slice(0, width);
  return value + ' '.repeat(width - value.length);
}

function statusIcon(status: string): string {
  if (status === 'completed') return '✓';
  if (status === 'failed') return '✗';
  return '…';
}

export function formatTableRow(run: RunRow, widths: ColumnWidths): string[] {
  const name = run.jobSlug ?? run.jobName ?? run.jobId;
  const date = formatRunDisplayTimestamp(run);
  const scanned = String(run.itemsNew);
  const qualified = String(run.itemsQualified);
  const cost = run.estimatedCostUsd === null ? '-' : `$${run.estimatedCostUsd.toFixed(6)}`;

  return [
    pad(name, widths.jobName),
    pad(date, widths.date),
    pad(scanned, widths.scanned),
    pad(qualified, widths.qualified),
    pad(cost, widths.cost),
    statusIcon(run.status)
  ];
}

export function formatHeaderRow(widths: ColumnWidths): string[] {
  return [
    pad('Job Slug', widths.jobName),
    pad('Date', widths.date),
    pad('Scanned', widths.scanned),
    pad('Qualified', widths.qualified),
    pad('Cost', widths.cost),
    'Status'
  ];
}

// ── Scroll window ─────────────────────────────────────────────────────────────

export interface ScrollWindow {
  scrollTop: number;
  visibleStart: number;
  visibleEnd: number;
}

/**
 * Given the current cursor position, the previous scrollTop, total row count,
 * and the visible window size, returns the new scrollTop (and derived slice
 * indices) so the cursor row is always visible.
 */
export function computeScrollWindow(
  cursor: number,
  scrollTop: number,
  totalRows: number,
  windowSize: number
): ScrollWindow {
  const effective = Math.min(windowSize, totalRows);

  let next = scrollTop;
  if (cursor < next) {
    next = cursor;
  } else if (cursor >= next + effective) {
    next = cursor - effective + 1;
  }

  next = Math.max(0, Math.min(next, Math.max(0, totalRows - effective)));

  return {
    scrollTop: next,
    visibleStart: next,
    visibleEnd: next + effective
  };
}

// ── Detail view ───────────────────────────────────────────────────────────────

export interface DetailLine {
  label: string;
  value: string;
}

function formatRunDuration(startedAt: string | null, finishedAt: string | null): string {
  if (!startedAt || !finishedAt) return '-';
  const startMs = Date.parse(startedAt);
  const endMs = Date.parse(finishedAt);
  if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs < startMs) return '-';
  return `${Math.round((endMs - startMs) / 1000)}s`;
}

export function buildDetailLines(run: RunRow): DetailLine[] {
  const cost = run.estimatedCostUsd === null ? '-' : `$${run.estimatedCostUsd.toFixed(6)}`;
  return [
    { label: 'Run ID', value: run.id },
    { label: 'Job', value: run.jobName ?? run.jobId },
    { label: 'Slug', value: run.jobSlug ?? run.jobId },
    { label: 'Status', value: run.status },
    { label: 'Duration', value: formatRunDuration(run.startedAt, run.finishedAt) },
    { label: 'Discovered', value: String(run.itemsDiscovered) },
    { label: 'New', value: String(run.itemsNew) },
    { label: 'Qualified', value: String(run.itemsQualified) },
    { label: 'Tokens', value: `${run.promptTokens}/${run.completionTokens}` },
    { label: 'Cost', value: cost },
    { label: 'Log', value: run.logFilePath ?? '-' },
    ...(run.message ? [{ label: 'Message', value: run.message }] : [])
  ];
}

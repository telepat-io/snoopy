interface RunTimestampInput {
  createdAt: string;
  startedAt?: string | null;
  finishedAt?: string | null;
}

function parseSqliteUtcTimestamp(value: string | null | undefined): Date | null {
  if (!value) {
    return null;
  }

  const normalized = value.includes('T') ? value : value.replace(' ', 'T');
  const withTimezone = /[zZ]|[+-]\d{2}:?\d{2}$/.test(normalized) ? normalized : `${normalized}Z`;
  const date = new Date(withTimezone);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatLocalTimestamp(value: string | null | undefined): string {
  const parsed = parseSqliteUtcTimestamp(value);
  if (!parsed) {
    return value ?? '-';
  }

  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(parsed);
}

export function formatRunDisplayTimestamp(run: RunTimestampInput): string {
  return formatLocalTimestamp(run.finishedAt ?? run.startedAt ?? run.createdAt);
}

export function formatRunDisplayLabel(run: RunTimestampInput): string {
  if (run.finishedAt) {
    return `Completed ${formatLocalTimestamp(run.finishedAt)}`;
  }

  if (run.startedAt) {
    return `Started ${formatLocalTimestamp(run.startedAt)}`;
  }

  return `Created ${formatLocalTimestamp(run.createdAt)}`;
}
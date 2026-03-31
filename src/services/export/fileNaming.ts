function formatDatePart(value: number): string {
  return String(value).padStart(2, '0');
}

export function formatUtcTimestampCompact(date: Date): string {
  return `${date.getUTCFullYear()}${formatDatePart(date.getUTCMonth() + 1)}${formatDatePart(date.getUTCDate())}-${formatDatePart(date.getUTCHours())}${formatDatePart(date.getUTCMinutes())}${formatDatePart(date.getUTCSeconds())}`;
}

export function createExportFileName(jobSlug: string, extension: 'csv' | 'json', exportedAt = new Date()): string {
  return `${formatUtcTimestampCompact(exportedAt)}_${jobSlug}.${extension}`;
}

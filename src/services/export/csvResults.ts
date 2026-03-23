import fs from 'node:fs';
import path from 'node:path';
import type { Job } from '../../types/job.js';
import type { QualifiedScanItemRow } from '../db/repositories/scanItemsRepo.js';
import { getAppPaths } from '../../utils/paths.js';

const CSV_HEADERS = ['URL', 'Title', 'Truncated Content', 'Author', 'Justification', 'Date'] as const;

function truncateContent(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength)}...`;
}

function csvEscape(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}

function toCsvLine(values: string[]): string {
  return values.map(csvEscape).join(',');
}

export interface CsvExportSummary {
  outputPath: string;
  rowCount: number;
}

export class CsvResultsExporter {
  private readonly resultsDir = getAppPaths().resultsDir;

  exportJobResults(job: Job, qualifiedRows: QualifiedScanItemRow[]): CsvExportSummary {
    const outputPath = path.join(this.resultsDir, `${job.slug}.csv`);
    const lines = [toCsvLine([...CSV_HEADERS])];

    for (const row of qualifiedRows) {
      lines.push(
        toCsvLine([
          row.url,
          row.title ?? '',
          truncateContent(row.body, 300),
          row.author,
          row.qualificationReason ?? '',
          row.redditPostedAt
        ])
      );
    }

    fs.writeFileSync(outputPath, `${lines.join('\n')}\n`, 'utf8');

    return {
      outputPath,
      rowCount: qualifiedRows.length
    };
  }
}

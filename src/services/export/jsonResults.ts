import fs from 'node:fs';
import path from 'node:path';
import type { Job } from '../../types/job.js';
import type { QualifiedScanItemRow } from '../db/repositories/scanItemsRepo.js';
import { getAppPaths } from '../../utils/paths.js';
import { createExportFileName } from './fileNaming.js';

export interface JsonExportSummary {
  outputPath: string;
  rowCount: number;
}

export class JsonResultsExporter {
  private readonly resultsDir = getAppPaths().resultsDir;

  exportJobResults(job: Job, qualifiedRows: QualifiedScanItemRow[], exportedAt = new Date()): JsonExportSummary {
    const outputPath = path.join(this.resultsDir, createExportFileName(job.slug, 'json', exportedAt));
    fs.writeFileSync(outputPath, `${JSON.stringify(qualifiedRows, null, 2)}\n`, 'utf8');

    return {
      outputPath,
      rowCount: qualifiedRows.length
    };
  }
}

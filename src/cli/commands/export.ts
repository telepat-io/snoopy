import { JobsRepository } from '../../services/db/repositories/jobsRepo.js';
import { RunsRepository } from '../../services/db/repositories/runsRepo.js';
import { ScanItemsRepository } from '../../services/db/repositories/scanItemsRepo.js';
import { CsvResultsExporter } from '../../services/export/csvResults.js';
import { JsonResultsExporter } from '../../services/export/jsonResults.js';
import { printCommandScreen, printError, printInfo, printKeyValue, printSuccess, printWarning } from '../ui/consoleUi.js';

type ExportFormat = 'csv' | 'json';

interface ExportCommandOptions {
  csv?: boolean;
  json?: boolean;
  lastRun?: boolean;
  limit?: number;
}

function resolveFormat(options: ExportCommandOptions): ExportFormat {
  if (options.csv && options.json) {
    throw new Error('Please choose only one format flag: --csv or --json.');
  }

  if (options.json) {
    return 'json';
  }

  return 'csv';
}

export function exportCsv(jobRef?: string, options: ExportCommandOptions = {}): void {
  const format = resolveFormat(options);
  printCommandScreen('Data exports', format === 'csv' ? 'Export CSV' : 'Export JSON');

  const jobsRepo = new JobsRepository();
  const runsRepo = new RunsRepository();
  const scanItemsRepo = new ScanItemsRepository();
  const csvExporter = new CsvResultsExporter();
  const jsonExporter = new JsonResultsExporter();

  const jobs = jobRef
    ? (() => {
        const job = jobsRepo.getByRef(jobRef);
        if (!job) {
          printError(`Job not found: ${jobRef}`);
          return [];
        }
        return [job];
      })()
    : jobsRepo.list();

  if (jobs.length === 0) {
    if (!jobRef) {
      printWarning('No jobs configured yet.');
    }
    return;
  }

  let failures = 0;
  let totalRows = 0;
  let filesExported = 0;

  jobs.forEach((job) => {
    try {
      const latestRunId = options.lastRun ? runsRepo.listByJob(job.id, 1)[0]?.id ?? null : null;
      if (options.lastRun && !latestRunId) {
        printWarning(`Skipping ${job.name} (${job.slug}): no runs found.`);
        return;
      }

      const limit = options.limit ?? 100;
      const qualifiedRows = latestRunId
        ? scanItemsRepo.listQualifiedByJobRun(job.id, latestRunId, limit)
        : scanItemsRepo.listQualifiedByJob(job.id, limit);

      const result = format === 'csv'
        ? csvExporter.exportJobResults(job, qualifiedRows)
        : jsonExporter.exportJobResults(job, qualifiedRows);

      totalRows += result.rowCount;
      filesExported += 1;

      printInfo(`${job.name} (${job.slug})`);
      printKeyValue('Rows', String(result.rowCount));
      printKeyValue('File', result.outputPath);
    } catch (error) {
      failures += 1;
      const message = error instanceof Error ? error.message : String(error);
      printError(`Failed exporting ${job.name} (${job.slug}): ${message}`);
    }
  });

  if (failures > 0) {
    throw new Error(`Export completed with ${failures} failure(s).`);
  }

  printSuccess(`Exported ${filesExported} file(s), ${totalRows} row(s).`);
}

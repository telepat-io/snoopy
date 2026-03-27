import { JobsRepository } from '../../services/db/repositories/jobsRepo.js';
import { ScanItemsRepository } from '../../services/db/repositories/scanItemsRepo.js';
import { CsvResultsExporter } from '../../services/export/csvResults.js';
import { printCommandScreen, printError, printInfo, printKeyValue, printSuccess, printWarning } from '../ui/consoleUi.js';

export function exportCsv(jobRef?: string): void {
  printCommandScreen('Data exports', 'Export CSV');

  const jobsRepo = new JobsRepository();
  const scanItemsRepo = new ScanItemsRepository();
  const exporter = new CsvResultsExporter();

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

  jobs.forEach((job) => {
    try {
      const qualifiedRows = scanItemsRepo.listQualifiedByJob(job.id);
      const result = exporter.exportJobResults(job, qualifiedRows);
      totalRows += result.rowCount;

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
    throw new Error(`CSV export completed with ${failures} failure(s).`);
  }

  printSuccess(`Exported ${jobs.length} file(s), ${totalRows} row(s).`);
}

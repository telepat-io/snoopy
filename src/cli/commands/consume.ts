import { JobsRepository } from '../../services/db/repositories/jobsRepo.js';
import { ScanItemsRepository, type QualifiedScanItemRow } from '../../services/db/repositories/scanItemsRepo.js';
import {
  printCommandScreen,
  printError,
  printInfo,
  printKeyValue,
  printMuted,
  printSuccess,
  printWarning
} from '../ui/consoleUi.js';

interface ConsumeCommandOptions {
  limit?: number;
  json?: boolean;
  dryRun?: boolean;
}

function truncateContent(content: string, maxLength: number): string {
  if (content.length <= maxLength) {
    return content;
  }

  return `${content.slice(0, maxLength)}...`;
}

function renderResultRow(row: QualifiedScanItemRow, index: number): void {
  printInfo(`#${index + 1}`);
  printKeyValue('Job', row.jobId);
  printKeyValue('Author', row.author);
  if (row.title) {
    printKeyValue('Title', row.title);
  }

  printKeyValue('URL', row.url);
  printKeyValue('Date', row.redditPostedAt);
  if (row.qualificationReason) {
    printKeyValue('Reason', truncateContent(row.qualificationReason, 120));
  }

  printMuted(truncateContent(row.body, 200));
  console.log('');
}

export function consumeResults(jobRef?: string, options: ConsumeCommandOptions = {}): void {
  printCommandScreen('Consume results', 'List and consume unconsumed qualified results');

  const jobsRepo = new JobsRepository();
  const scanItemsRepo = new ScanItemsRepository();

  let jobId: string | undefined;
  if (jobRef) {
    const job = jobsRepo.getByRef(jobRef);
    if (!job) {
      printError(`Job not found: ${jobRef}`);
      return;
    }

    jobId = job.id;
  }

  const rows = scanItemsRepo.listUnconsumedQualified(jobId, options.limit);

  if (rows.length === 0) {
    if (options.json) {
      console.log(JSON.stringify([], null, 2));
      return;
    }

    printWarning('No unconsumed qualified results found.');
    return;
  }

  if (options.json) {
    console.log(JSON.stringify(rows, null, 2));
  } else {
    rows.forEach((row, index) => renderResultRow(row, index));
  }

  if (options.dryRun) {
    printSuccess(`Found ${rows.length} result(s) (dry run — not consumed).`);
    return;
  }

  const consumedCount = scanItemsRepo.markConsumed(rows.map((r) => r.id));
  printSuccess(`Consumed ${consumedCount} result(s).`);
}

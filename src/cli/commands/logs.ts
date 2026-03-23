import { RunsRepository } from '../../services/db/repositories/runsRepo.js';
import { readRunLog } from '../../services/logging/logReader.js';
import { printCliHeader, printError, printInfo, printKeyValue, printSection, printWarning } from '../ui/consoleUi.js';

export function showRunLogs(runId: string): void {
  printCliHeader('Run logs');
  printSection('Logs');

  const runsRepo = new RunsRepository();
  const run = runsRepo.getById(runId);
  if (!run) {
    printError(`Run not found: ${runId}`);
    return;
  }

  const logContent = readRunLog(run.logFilePath);
  printInfo(`${run.createdAt} ${run.jobName ?? run.jobId}`);
  printKeyValue('Run ID', run.id);
  printKeyValue('Status', run.status);
  printKeyValue('Log', run.logFilePath ?? '-');

  if (!run.logFilePath) {
    printWarning('This run does not have an associated log file. It may predate detailed run logging.');
    return;
  }

  if (logContent === null) {
    printWarning(`Log not found: ${run.logFilePath}`);
    return;
  }

  process.stdout.write(`${logContent}${logContent.endsWith('\n') ? '' : '\n'}`);
}

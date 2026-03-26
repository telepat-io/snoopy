import { RunsRepository } from '../../services/db/repositories/runsRepo.js';
import { formatRunLogPretty, readRunLog } from '../../services/logging/logReader.js';
import { printCliHeader, printError, printInfo, printKeyValue, printSection, printWarning } from '../ui/consoleUi.js';

export function showRunLogs(runId: string, options: { raw?: boolean } = {}): void {
  printCliHeader('Run logs');
  printSection(options.raw ? 'Logs (raw)' : 'Logs (pretty)');

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

  const renderedContent = options.raw ? logContent : formatRunLogPretty(logContent);
  process.stdout.write(`${renderedContent}${renderedContent.endsWith('\n') ? '' : '\n'}`);
}

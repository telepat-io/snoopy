import { JobsRepository } from '../../services/db/repositories/jobsRepo.js';
import { RunsRepository } from '../../services/db/repositories/runsRepo.js';
import { formatRunLogPretty, readRunLog } from '../../services/logging/logReader.js';
import { printCliHeader, printError, printInfo, printKeyValue, printSection, printWarning } from '../ui/consoleUi.js';
import { formatRunDisplayTimestamp } from '../ui/time.js';
import { resolveJobFromArgOrPrompt, resolveRunFromArgOrPrompt } from './selection.js';

export async function showRunLogs(runId?: string, options: { raw?: boolean } = {}): Promise<void> {
  printCliHeader('Run logs');
  printSection(options.raw ? 'Logs (raw)' : 'Logs (pretty)');

  const jobsRepo = new JobsRepository();
  const runsRepo = new RunsRepository();

  const run = runId
    ? runsRepo.getById(runId)
    : await (async () => {
        const selectedJob = await resolveJobFromArgOrPrompt(jobsRepo, undefined, {
          requiredForMessage: 'run log inspection'
        });
        if (!selectedJob) {
          return null;
        }

        return resolveRunFromArgOrPrompt(runsRepo, undefined, selectedJob);
      })();

  if (!run) {
    if (runId) {
      printError(`Run not found: ${runId}`);
    }
    return;
  }

  const logContent = readRunLog(run.logFilePath);
  printInfo(`${formatRunDisplayTimestamp(run)} ${run.jobName ?? run.jobId}`);
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

import { JobsRepository } from '../../services/db/repositories/jobsRepo.js';
import { RunsRepository } from '../../services/db/repositories/runsRepo.js';
import { extractErrorEntries, readRunLog } from '../../services/logging/logReader.js';
import { printCommandScreen, printInfo, printKeyValue, printSuccess, printWarning } from '../ui/consoleUi.js';
import { formatRunDisplayTimestamp } from '../ui/time.js';
import { resolveJobFromArgOrPrompt } from './selection.js';

function isWithinHours(createdAt: string, hours: number): boolean {
  const timestamp = Date.parse(createdAt);
  if (Number.isNaN(timestamp)) {
    return false;
  }

  return timestamp >= Date.now() - hours * 60 * 60 * 1000;
}

export async function showJobErrors(jobRef?: string, options: { hours?: number } = {}): Promise<void> {
  const hours = options.hours ?? 24;

  printCommandScreen('Recent errors', 'Errors');

  const jobsRepo = new JobsRepository();
  const runsRepo = new RunsRepository();
  const job = await resolveJobFromArgOrPrompt(jobsRepo, jobRef, { requiredForMessage: 'error inspection' });
  if (!job) {
    return;
  }

  const recentRuns = runsRepo.listByJob(job.id, 100).filter((run) => isWithinHours(run.createdAt, hours));
  const errorRuns = recentRuns
    .map((run) => {
      const logContent = readRunLog(run.logFilePath);
      const errorEntries = extractErrorEntries(logContent ?? '');
      return {
        run,
        errorEntries,
        hasErrors: run.status === 'failed' || errorEntries.length > 0
      };
    })
    .filter((entry) => entry.hasErrors);

  if (errorRuns.length === 0) {
    printSuccess(`No failed or errored runs for ${job.name} in the last ${hours} hour(s).`);
    return;
  }

  printWarning(`Found ${errorRuns.length} failed or errored run(s) for ${job.name} in the last ${hours} hour(s).`);

  errorRuns.forEach(({ run, errorEntries }) => {
    printInfo(`${formatRunDisplayTimestamp(run)} ${run.status}`);
    printKeyValue('Run ID', run.id);
    printKeyValue('Message', run.message ?? '-');
    printKeyValue('Log', run.logFilePath ?? '-');

    if (errorEntries.length > 0) {
      const latestEntry = errorEntries[errorEntries.length - 1]!;
      process.stdout.write(`${latestEntry}${latestEntry.endsWith('\n') ? '' : '\n'}`);
    }
  });
}

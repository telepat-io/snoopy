import fs from 'node:fs';
import { getDb } from '../../services/db/sqlite.js';
import { JobsRepository } from '../../services/db/repositories/jobsRepo.js';
import { RunsRepository } from '../../services/db/repositories/runsRepo.js';
import { extractErrorEntries, readRunLog } from '../../services/logging/logReader.js';
import { getOpenRouterApiKey } from '../../services/security/secretStore.js';
import { getStartupStatus } from '../../services/startup/index.js';
import { ensureAppDirs } from '../../utils/paths.js';
import {
  printCommandScreen,
  printError,
  printInfo,
  printKeyValue,
  printSection,
  printSuccess,
  printWarning
} from '../ui/consoleUi.js';
import { formatRunDisplayTimestamp } from '../ui/time.js';

function getDaemonHealth(): { ok: boolean; details: string } {
  const paths = ensureAppDirs();
  if (!fs.existsSync(paths.pidFilePath)) {
    return { ok: false, details: 'Daemon not running (no pid file)' };
  }

  const pid = Number(fs.readFileSync(paths.pidFilePath, 'utf8'));
  if (!Number.isFinite(pid)) {
    return { ok: false, details: 'Invalid daemon pid file' };
  }

  try {
    process.kill(pid, 0);
    return { ok: true, details: `Daemon running (pid ${pid})` };
  } catch {
    return { ok: false, details: `Stale daemon pid file (pid ${pid})` };
  }
}

function isWithinLast24Hours(createdAt: string): boolean {
  const timestamp = Date.parse(createdAt);
  if (Number.isNaN(timestamp)) {
    return false;
  }

  return timestamp >= Date.now() - 24 * 60 * 60 * 1000;
}

export async function runDoctor(): Promise<void> {
  printCommandScreen('Diagnostics', 'Snoopy Doctor');
  const paths = ensureAppDirs();

  let dbOk = false;
  let dbDetails = `DB file: ${paths.dbPath}`;
  try {
    const db = getDb();
    db.prepare('SELECT 1').get();
    dbOk = true;
    dbDetails = `DB reachable at ${paths.dbPath}`;
  } catch (error) {
    dbDetails = `DB error: ${String(error)}`;
  }

  const jobsRepo = new JobsRepository();
  const runsRepo = new RunsRepository();
  const jobs = jobsRepo.list();
  const enabledJobs = jobs.filter((job) => job.enabled).length;

  const apiKey = await getOpenRouterApiKey();
  const startup = getStartupStatus();
  const daemon = getDaemonHealth();

  printKeyValue('Platform', process.platform);
  printKeyValue('Node', process.version);

  if (dbOk) {
    printSuccess(`Database: ${dbDetails}`);
  } else {
    printError(`Database: ${dbDetails}`);
  }

  if (apiKey) {
    printSuccess('OpenRouter API key: configured');
  } else {
    printWarning('OpenRouter API key: missing');
  }

  printInfo(`Jobs: ${jobs.length} total, ${enabledJobs} enabled`);

  if (daemon.ok) {
    printSuccess(`Daemon: ${daemon.details}`);
  } else {
    printWarning(`Daemon: ${daemon.details}`);
  }

  printInfo(`Startup on reboot: ${startup.enabled ? 'enabled' : 'disabled'} via ${startup.method}`);
  printInfo(`Startup details: ${startup.detail}`);

  printSection('Recent Job Errors');
  const recentProblemRuns = runsRepo
    .latestWithJobNames(20)
    .filter((run) => isWithinLast24Hours(run.createdAt))
    .map((run) => {
      const logContent = readRunLog(run.logFilePath);
      const errorEntries = extractErrorEntries(logContent ?? '');
      return {
        run,
        errorEntries
      };
    })
    .filter(({ run, errorEntries }) => run.status === 'failed' || errorEntries.length > 0);

  if (recentProblemRuns.length === 0) {
    printSuccess('No recent job run failures or logged errors in the last 24 hours.');
    return;
  }

  printWarning(`Found ${recentProblemRuns.length} recent run(s) with failures or logged errors.`);
  recentProblemRuns.forEach(({ run, errorEntries }) => {
    printWarning(`${formatRunDisplayTimestamp(run)} ${run.jobName ?? run.jobId} (${run.status})`);
    printKeyValue('Run ID', run.id);
    printKeyValue('Message', run.message ?? '-');
    if (errorEntries.length > 0) {
      printInfo(errorEntries[errorEntries.length - 1]!.split('\n')[0]!);
    }
  });
}

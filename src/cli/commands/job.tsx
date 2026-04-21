import React from 'react';
import { render } from 'ink';
import { JobAddFlow } from '../flows/jobAddFlow.js';
import { JobsRepository } from '../../services/db/repositories/jobsRepo.js';
import { SettingsRepository } from '../../services/db/repositories/settingsRepo.js';
import { type RunRow, RunsRepository } from '../../services/db/repositories/runsRepo.js';
import {
  deleteOpenRouterApiKey,
  getOpenRouterApiKey,
  isKeytarAvailable,
  setOpenRouterApiKey
} from '../../services/security/secretStore.js';
import { getStartupStatus, installStartup } from '../../services/startup/index.js';
import { ensureDaemonRunning, requestDaemonReload } from '../../services/daemonControl.js';
import { type JobRunProgressEvent, JobRunner } from '../../services/scheduler/jobRunner.js';
import { intervalToCron } from '../../types/settings.js';
import {
  formatCommentScanBlock,
  formatPostScanBlock,
  isRichTty,
  printCommandScreen,
  printError,
  printInfo,
  printKeyValue,
  printSection,
  printSuccess,
  printWarning
} from '../ui/consoleUi.js';
import { formatRunDisplayTimestamp } from '../ui/time.js';
import { RunsTable } from '../../ui/components/RunsTable.js';
import { JobsTable } from '../../ui/components/JobsTable.js';
import { resolveJobFromArgOrPrompt } from './selection.js';

interface JobAddFlowResult {
  apiKey?: string;
  installStartup?: boolean;
  settings: {
    model: string;
    modelSettings: {
      temperature: number;
      maxTokens: number;
      topP: number;
    };
  };
  job: {
    slug: string;
    name: string;
    description: string;
    qualificationPrompt: string;
    subreddits: string[];
    monitorComments: boolean;
  };
}

function getStartupCommandPath(): string {
  return process.argv[1] ?? '';
}

function formatRunDuration(startedAt: string | null, finishedAt: string | null): string {
  if (!startedAt || !finishedAt) {
    return '-';
  }

  const startMs = Date.parse(startedAt);
  const endMs = Date.parse(finishedAt);
  if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs < startMs) {
    return '-';
  }

  return `${Math.round((endMs - startMs) / 1000)}s`;
}

async function runAddFlow(
  hasApiKey: boolean,
  existingApiKey: string | null,
  keytarAvailable: boolean,
  startupAlreadyEnabled: boolean
): Promise<JobAddFlowResult | null> {
  const settingsRepo = new SettingsRepository();
  const initialSettings = settingsRepo.getAppSettings();

  let result: JobAddFlowResult | null = null;
  const app = render(
    <JobAddFlow
      hasApiKey={hasApiKey}
      existingApiKey={existingApiKey}
      canPersistApiKey={keytarAvailable}
      startupAlreadyEnabled={startupAlreadyEnabled}
      initialSettings={initialSettings}
      onApiKeyCaptured={(apiKey) => {
        return setOpenRouterApiKey(apiKey);
      }}
      onAuthFailure={() => {
        return deleteOpenRouterApiKey();
      }}
      onDone={(value) => {
        result = value;
      }}
    />
  );

  await app.waitUntilExit();
  return result;
}

function installInitialRunSignalHandlers(jobId: string, jobsRepo: JobsRepository): () => void {
  let handled = false;

  const cleanup = (): void => {
    process.off('SIGINT', onSignal);
    process.off('SIGTERM', onSignal);
  };

  const onSignal = (signal: NodeJS.Signals): void => {
    if (handled) {
      return;
    }

    handled = true;
    jobsRepo.setEnabled(jobId, true);
    refreshDaemonSchedulesAfterEnable();
    printWarning('Initial run interrupted. Job was enabled before exit so scheduled runs can continue.');
    cleanup();
    process.exit(signal === 'SIGINT' ? 130 : 143);
  };

  process.on('SIGINT', onSignal);
  process.on('SIGTERM', onSignal);

  return cleanup;
}

function refreshDaemonSchedulesAfterEnable(): void {
  const reloadStatus = requestDaemonReload();
  if (!reloadStatus.pid || reloadStatus.reloaded) {
    return;
  }

  printWarning('Job was enabled, but daemon schedules could not be reloaded automatically.');
  printInfo('Run snoopy daemon reload (or restart the daemon) to pick up this job schedule immediately.');
}

interface InitialRunOptions {
  limit?: number;
  installSignalHandlers?: boolean;
  printLifecycleMessages?: boolean;
}

export async function runInitialJobAndEnable(jobRef: string, options: InitialRunOptions = {}): Promise<void> {
  const jobsRepo = new JobsRepository();
  const job = jobsRepo.getByRef(jobRef);
  if (!job) {
    throw new Error(`Job not found: ${jobRef}`);
  }

  const shouldPrintLifecycleMessages = options.printLifecycleMessages ?? true;
  if (shouldPrintLifecycleMessages) {
    printInfo('Running an initial scan now so you can see immediate results.');
    printInfo('Scheduled runs are paused for this job until the initial run attempt finishes.');
  }

  const shouldInstallSignalHandlers = options.installSignalHandlers ?? true;
  const cleanupSignalHandlers = shouldInstallSignalHandlers ? installInitialRunSignalHandlers(job.id, jobsRepo) : () => {};
  try {
    await runJobNow(job.id, { limit: options.limit });
  } finally {
    cleanupSignalHandlers();
    jobsRepo.setEnabled(job.id, true);
    refreshDaemonSchedulesAfterEnable();
  }

  if (shouldPrintLifecycleMessages) {
    printSuccess(`Enabled job ${job.id} (${job.slug}) for scheduled runs.`);
  }
}

export async function addJob(): Promise<void> {
  const jobsRepo = new JobsRepository();
  const settingsRepo = new SettingsRepository();
  const keytarAvailable = await isKeytarAvailable();
  const existingApiKey = await getOpenRouterApiKey();
  const hasApiKey = Boolean(existingApiKey);
  const startupStatus = getStartupStatus();
  const flowResult = await runAddFlow(hasApiKey, existingApiKey, keytarAvailable, startupStatus.enabled);
  if (!flowResult) {
    printWarning('Job creation cancelled.');
    return;
  }

  if (flowResult.apiKey) {
    if (keytarAvailable) {
      await setOpenRouterApiKey(flowResult.apiKey);
    }
  }

  const currentSettings = settingsRepo.getAppSettings();
  settingsRepo.setAppSettings({
    ...currentSettings,
    model: flowResult.settings.model,
    modelSettings: flowResult.settings.modelSettings
  });

  const { cronIntervalMinutes } = settingsRepo.getAppSettings();
  const job = jobsRepo.create({
    slug: flowResult.job.slug,
    name: flowResult.job.name,
    description: flowResult.job.description,
    qualificationPrompt: flowResult.job.qualificationPrompt,
    subreddits: flowResult.job.subreddits,
    scheduleCron: intervalToCron(cronIntervalMinutes),
    enabled: false,
    monitorComments: flowResult.job.monitorComments
  });

  printSuccess(`Created job: ${job.name} (${job.id}, slug: ${job.slug})`);

  if (!startupStatus.enabled && flowResult.installStartup) {
    try {
      const result = installStartup(getStartupCommandPath());
      if (result.success) {
        printSuccess(`Startup configured (opt-in) via ${result.method}: ${result.detail}`);
      } else {
        printWarning(`Startup registration not configured: ${result.detail}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      printWarning(`Startup registration failed: ${message}`);
    }
  }

  const daemonStatus = ensureDaemonRunning();
  if (daemonStatus.started) {
    printSuccess(`Daemon started (pid ${daemonStatus.pid}).`);
  } else {
    printInfo(`Daemon already running${daemonStatus.pid ? ` (pid ${daemonStatus.pid})` : ''}.`);
  }

  await runInitialJobAndEnable(job.id);
}

export async function listJobs(): Promise<void> {
  const jobsRepo = new JobsRepository();
  const rows = jobsRepo.listWithStats();

  if (rows.length === 0) {
    printCommandScreen('Jobs', 'Configured Jobs');
    printWarning('No jobs configured yet.');
    return;
  }

  if (!isRichTty()) {
    printCommandScreen('Jobs', 'Configured Jobs');
    rows.forEach((row) => {
      const state = row.enabled !== 0 ? 'on' : 'off';
      printInfo(`${row.jobName} (${row.jobSlug}) state=${state}`);
      printKeyValue('Scanned', String(row.totalScanned));
      printKeyValue('Qualified', String(row.totalQualified));
    });
    return;
  }

  const app = render(
    <JobsTable
      jobs={rows}
      onExit={() => {
        app.unmount();
      }}
    />
  );
  await app.waitUntilExit();
}

export async function removeJob(jobRef?: string): Promise<void> {
  printCommandScreen('Jobs', 'Delete Job');
  const jobsRepo = new JobsRepository();
  const job = await resolveJobFromArgOrPrompt(jobsRepo, jobRef, { requiredForMessage: 'job deletion' });
  if (!job) {
    return;
  }

  const removed = jobsRepo.removeByRef(job.id);
  if (!removed) {
    printError(`Job not found: ${job.id}`);
    return;
  }

  printSuccess(`Deleted job ${removed.id} (${removed.slug}) with all runs and scan items.`);
}

export async function enableJob(jobRef?: string): Promise<void> {
  printCommandScreen('Jobs', 'Enable Job');
  const jobsRepo = new JobsRepository();
  const job = await resolveJobFromArgOrPrompt(jobsRepo, jobRef, { requiredForMessage: 'job enablement' });
  if (!job) {
    return;
  }

  const updated = jobsRepo.setEnabledByRef(job.id, true);
  if (!updated) {
    printError(`Job not found: ${job.id}`);
    return;
  }

  printSuccess(`Enabled job ${updated.id} (${updated.slug})`);
}

export async function disableJob(jobRef?: string): Promise<void> {
  printCommandScreen('Jobs', 'Disable Job');
  const jobsRepo = new JobsRepository();
  const job = await resolveJobFromArgOrPrompt(jobsRepo, jobRef, { requiredForMessage: 'job disablement' });
  if (!job) {
    return;
  }

  const updated = jobsRepo.setEnabledByRef(job.id, false);
  if (!updated) {
    printError(`Job not found: ${job.id}`);
    return;
  }

  printSuccess(`Disabled job ${updated.id} (${updated.slug})`);
}

export async function runJobNow(jobRef: string | undefined, options: { limit?: number }): Promise<void> {
  printCommandScreen('Manual run', 'Run Job Now');
  const jobsRepo = new JobsRepository();
  const runsRepo = new RunsRepository();
  const job = await resolveJobFromArgOrPrompt(jobsRepo, jobRef, { requiredForMessage: 'manual run' });
  if (!job) {
    return;
  }

  printInfo(`Running ${job.name} (${job.slug})${options.limit ? ` with limit ${options.limit}` : ''}`);

  const runner = new JobRunner();
  const richLogs = isRichTty();
  await runner.run(job, {
    maxNewItems: options.limit,
    onProgress: (event) => {
      if (!richLogs) {
        return;
      }

      logManualRunProgress(event);
    }
  });

  const latestRun = runsRepo.listByJob(job.id, 1)[0];
  const scopeSuffix = options.limit ? ` with limit ${options.limit}` : '';
  if (!latestRun) {
    printWarning(`Manual run finished for ${job.name} (${job.slug})${scopeSuffix}.`);
    return;
  }

  const cost = latestRun.estimatedCostUsd === null ? '-' : `$${latestRun.estimatedCostUsd.toFixed(6)}`;
  printSection(`Manual run ${latestRun.status} for ${job.name} (${job.slug})${scopeSuffix}`);
  printKeyValue('Run ID', latestRun.id);
  printKeyValue('Discovered', String(latestRun.itemsDiscovered));
  printKeyValue('New', String(latestRun.itemsNew));
  printKeyValue('Qualified', String(latestRun.itemsQualified));
  printKeyValue('Duration', formatRunDuration(latestRun.startedAt, latestRun.finishedAt));
  printKeyValue('Tokens', `${latestRun.promptTokens}/${latestRun.completionTokens}`);
  printKeyValue('Cost', cost);
  printKeyValue('Log', latestRun.logFilePath ?? '-');
  if (latestRun.message) {
    printWarning(`Message: ${latestRun.message}`);
  }
}

function printRunsFlatDump(rows: RunRow[]): void {
  rows.forEach((run) => {
    const cost = run.estimatedCostUsd === null ? '-' : `$${run.estimatedCostUsd.toFixed(6)}`;
    printInfo(`${formatRunDisplayTimestamp(run)} ${run.jobName ?? run.jobId} [${run.id}] ${run.status}`);
    printKeyValue('Run ID', run.id);
    printKeyValue('Duration', formatRunDuration(run.startedAt, run.finishedAt));
    printKeyValue('Discovered', String(run.itemsDiscovered));
    printKeyValue('New', String(run.itemsNew));
    printKeyValue('Qualified', String(run.itemsQualified));
    printKeyValue('Tokens', `${run.promptTokens}/${run.completionTokens}`);
    printKeyValue('Cost', cost);
    printKeyValue('Log', run.logFilePath ?? '-');
  });
}

const MAX_RUN_CACHE = 256;
const FLAT_RUN_LIMIT = 50;

function setBoundedMapValue<K, V>(map: Map<K, V>, key: K, value: V, maxSize: number): void {
  if (map.has(key)) {
    map.delete(key);
  }

  map.set(key, value);
  if (map.size <= maxSize) {
    return;
  }

  const oldestKey = map.keys().next().value as K | undefined;
  if (oldestKey !== undefined) {
    map.delete(oldestKey);
  }
}

export async function listJobRuns(jobRef?: string): Promise<void> {
  const jobsRepo = new JobsRepository();
  const runsRepo = new RunsRepository();

  const selectedJob = jobRef
    ? (() => {
        const job = jobsRepo.getByRef(jobRef);
        if (!job) {
          printError(`Job not found: ${jobRef}`);
          return null;
        }
        return job;
      })()
    : undefined;

  if (selectedJob === null) {
    return;
  }

  const totalRuns = selectedJob ? runsRepo.countByJob(selectedJob.id) : runsRepo.countAll();

  if (totalRuns === 0) {
    printCommandScreen('Run history', 'Job Runs');
    printWarning('No run history yet.');
    return;
  }

  const runCache = new Map<number, RunRow>();
  const getRunAt = (index: number): RunRow | null => {
    if (index < 0 || index >= totalRuns) {
      return null;
    }

    const cached = runCache.get(index);
    if (cached) {
      setBoundedMapValue(runCache, index, cached, MAX_RUN_CACHE);
      return cached;
    }

    const fetched = selectedJob ? runsRepo.getByJobIndex(selectedJob.id, index) : runsRepo.getLatestWithJobNamesByIndex(index);
    if (!fetched) {
      return null;
    }

    setBoundedMapValue(runCache, index, fetched, MAX_RUN_CACHE);
    return fetched;
  };

  if (!isRichTty()) {
    printCommandScreen('Run history', 'Job Runs');
    const rows = selectedJob
      ? runsRepo.listByJobPage(selectedJob.id, FLAT_RUN_LIMIT, 0)
      : runsRepo.latestWithJobNamesPage(FLAT_RUN_LIMIT, 0);
    printRunsFlatDump(rows);
    if (totalRuns > rows.length) {
      printInfo(`Showing first ${rows.length} of ${totalRuns} run(s). Use a rich TTY to browse all runs.`);
    }
    return;
  }

  const app = render(
    <RunsTable
      totalRuns={totalRuns}
      getRunAt={getRunAt}
      onExit={() => {
        app.unmount();
      }}
    />
  );
  await app.waitUntilExit();
}

function logManualRunProgress(event: JobRunProgressEvent): void {
  switch (event.type) {
    case 'run_start': {
      printInfo(
        `Starting scan across ${event.subredditCount} subreddit(s)${event.maxNewItems ? ` (limit ${event.maxNewItems})` : ''}.`
      );
      return;
    }
    case 'subreddit_fetched': {
      printInfo(`Fetched r/${event.subreddit}: ${event.postCount} posts`);
      return;
    }
    case 'post_scanned': {
      if (event.status === 'existing') {
        printInfo(`Post ${event.postId}: already scanned`);
        return;
      }

      printInfo(
        formatPostScanBlock({
          postId: event.postId,
          title: event.title,
          bodySnippet: event.bodySnippet,
          qualified: event.qualified,
          qualificationReason: event.qualificationReason,
          postUrl: event.postUrl,
          itemsNew: event.itemsNew,
          itemsQualified: event.itemsQualified
        })
      );
      return;
    }
    case 'comments_loaded': {
      printInfo(`Comments on ${event.postId}: ${event.authors} author(s), ${event.threads} thread(s)`);
      return;
    }
    case 'comment_scanned': {
      if (event.status === 'existing') {
        printInfo(`Comment ${event.commentId}: already scanned`);
        return;
      }

      printInfo(
        formatCommentScanBlock({
          postId: event.postId,
          commentId: event.commentId,
          author: event.author,
          commentSnippet: event.commentSnippet,
          qualified: event.qualified,
          qualificationReason: event.qualificationReason,
          postUrl: event.postUrl,
          commentUrl: event.commentUrl,
          itemsNew: event.itemsNew,
          itemsQualified: event.itemsQualified
        })
      );
      return;
    }
    case 'limit_reached': {
      printWarning(`Reached maxNewItems=${event.maxNewItems}. Stopping early.`);
      return;
    }
    case 'run_skipped': {
      printWarning(event.message);
      return;
    }
    case 'run_complete': {
      printSuccess(
        `Scan complete. discovered=${event.itemsDiscovered}, new=${event.itemsNew}, qualified=${event.itemsQualified}`
      );
      return;
    }
    case 'run_failed': {
      printError(`Run failed: ${event.message}`);
      return;
    }
    default:
      return;
  }
}


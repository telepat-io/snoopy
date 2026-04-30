import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { getDb } from '../services/db/sqlite.js';
import { JobsRepository } from '../services/db/repositories/jobsRepo.js';
import { RunsRepository } from '../services/db/repositories/runsRepo.js';
import { ScanItemsRepository } from '../services/db/repositories/scanItemsRepo.js';
import { SettingsRepository } from '../services/db/repositories/settingsRepo.js';
import { AnalyticsService } from '../services/analytics/analyticsService.js';
import { extractErrorEntries, readRunLog } from '../services/logging/logReader.js';
import { getOpenRouterApiKey, isKeytarAvailable } from '../services/security/secretStore.js';
import { getStartupStatus } from '../services/startup/index.js';
import { isDaemonRunning, ensureDaemonRunning, requestDaemonReload } from '../services/daemonControl.js';
import { ensureAppDirs } from '../utils/paths.js';

const require = createRequire(import.meta.url);

export function getSnoopyVersion(): string {
  for (const rel of ['../../../package.json', '../../package.json']) {
    try {
      const pkg = require(rel) as { name?: string; version?: string };
      if (pkg.name === '@telepat/snoopy') return pkg.version ?? '0.0.0';
    } catch { /* try next depth */ }
  }
  return '0.0.0';
}

function formatToolError(error: unknown): { content: { type: 'text'; text: string }[]; isError: true } {
  const message = error instanceof Error ? error.message : String(error ?? 'Unknown error');
  return {
    content: [{ type: 'text', text: message }],
    isError: true,
  };
}

function formatToolResult(data: unknown): { content: { type: 'text'; text: string }[]; structuredContent: Record<string, unknown> } {
  return {
    content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
    structuredContent: data as Record<string, unknown>,
  };
}

export { formatToolError, formatToolResult };

export async function buildDoctorReport(): Promise<Record<string, unknown>> {
  const paths = ensureAppDirs();
  const db = getDb();

  let dbOk = false;
  let dbDetails = `DB file: ${paths.dbPath}`;
  try {
    db.prepare('SELECT 1').get();
    dbOk = true;
    dbDetails = `DB reachable at ${paths.dbPath}`;
  } catch (error) {
    dbDetails = `DB error: ${String(error)}`;
  }

  const jobsRepo = new JobsRepository();
  const runsRepo = new RunsRepository();
  const jobs = jobsRepo.list();
  const enabledJobs = jobs.filter((j) => j.enabled).length;

  const apiKey = await getOpenRouterApiKey();
  const keytarAvailable = await isKeytarAvailable();
  const startup = getStartupStatus();
  const daemon = isDaemonRunning();

  const recentProblemRuns = runsRepo
    .latestWithJobNames(20)
    .filter((run) => {
      const timestamp = Date.parse(run.createdAt);
      return !Number.isNaN(timestamp) && timestamp >= Date.now() - 24 * 60 * 60 * 1000;
    })
    .map((run) => {
      const logContent = readRunLog(run.logFilePath);
      const errorEntries = extractErrorEntries(logContent ?? '');
      return { run, errorEntries };
    })
    .filter(({ run, errorEntries }) => run.status === 'failed' || errorEntries.length > 0);

  return {
    platform: process.platform,
    nodeVersion: process.version,
    database: { ok: dbOk, details: dbDetails },
    openRouterApiKey: { configured: Boolean(apiKey), keytarAvailable },
    jobs: { total: jobs.length, enabled: enabledJobs },
    daemon: { running: daemon.running, pid: daemon.pid },
    startup: { enabled: startup.enabled, method: startup.method, detail: startup.detail },
    recentErrors: recentProblemRuns.map(({ run, errorEntries }) => ({
      runId: run.id,
      jobName: run.jobName ?? run.jobId,
      status: run.status,
      message: run.message,
      errorCount: errorEntries.length,
      latestError: errorEntries.length > 0 ? errorEntries[errorEntries.length - 1]?.split('\n')[0] : null,
    })),
  };
}

export function buildDaemonStatusReport(): Record<string, unknown> {
  const status = isDaemonRunning();
  return {
    running: status.running,
    pid: status.pid,
  };
}

export function startDaemonReport(): Record<string, unknown> {
  const result = ensureDaemonRunning();
  return {
    started: result.started,
    pid: result.pid,
  };
}

export function stopDaemonReport(): Record<string, unknown> {
  const status = isDaemonRunning();
  if (!status.running || !status.pid) {
    return { stopped: false, message: 'Daemon is not running' };
  }

  try {
    process.kill(status.pid, 'SIGTERM');
    return { stopped: true, pid: status.pid };
  } catch (error) {
    return { stopped: false, pid: status.pid, error: String(error) };
  }
}

export function reloadDaemonReport(): Record<string, unknown> {
  const result = requestDaemonReload();
  return {
    reloaded: result.reloaded,
    pid: result.pid,
  };
}

export function listJobsReport(): Record<string, unknown> {
  const jobsRepo = new JobsRepository();
  const jobs = jobsRepo.list();
  return {
    count: jobs.length,
    jobs: jobs.map((j) => ({
      id: j.id,
      slug: j.slug,
      name: j.name,
      enabled: j.enabled,
      subreddits: j.subreddits,
      scheduleCron: j.scheduleCron,
      monitorComments: j.monitorComments,
    })),
  };
}

export function listJobRunsReport(jobRef?: string, limit?: number): Record<string, unknown> {
  const runsRepo = new RunsRepository();
  const boundedLimit = limit ?? 20;

  if (jobRef) {
    const jobsRepo = new JobsRepository();
    const job = jobsRepo.getByRef(jobRef);
    if (!job) {
      throw new Error(`Job not found: ${jobRef}`);
    }
    const runs = runsRepo.listByJob(job.id, boundedLimit);
    return {
      job: { id: job.id, slug: job.slug, name: job.name },
      count: runs.length,
      runs: runs.map((r) => ({
        id: r.id,
        status: r.status,
        message: r.message,
        startedAt: r.startedAt,
        finishedAt: r.finishedAt,
        itemsDiscovered: r.itemsDiscovered,
        itemsNew: r.itemsNew,
        itemsQualified: r.itemsQualified,
        promptTokens: r.promptTokens,
        completionTokens: r.completionTokens,
        estimatedCostUsd: r.estimatedCostUsd,
      })),
    };
  }

  const runs = runsRepo.latestWithJobNames(boundedLimit);
  return {
    count: runs.length,
    runs: runs.map((r) => ({
      id: r.id,
      jobId: r.jobId,
      jobName: r.jobName,
      status: r.status,
      message: r.message,
      createdAt: r.createdAt,
      itemsDiscovered: r.itemsDiscovered,
      itemsNew: r.itemsNew,
      itemsQualified: r.itemsQualified,
    })),
  };
}

export function addJobReport(input: {
  name: string;
  description?: string;
  subreddits: string[];
  qualificationPrompt: string;
  scheduleCron?: string;
  enabled?: boolean;
  monitorComments?: boolean;
}): Record<string, unknown> {
  const jobsRepo = new JobsRepository();
  const job = jobsRepo.create({
    name: input.name,
    description: input.description ?? '',
    subreddits: input.subreddits,
    qualificationPrompt: input.qualificationPrompt,
    scheduleCron: input.scheduleCron,
    enabled: input.enabled,
    monitorComments: input.monitorComments,
  });
  return {
    id: job.id,
    slug: job.slug,
    name: job.name,
    enabled: job.enabled,
    subreddits: job.subreddits,
    scheduleCron: job.scheduleCron,
  };
}

export function deleteJobReport(jobRef: string): Record<string, unknown> {
  const jobsRepo = new JobsRepository();
  const job = jobsRepo.removeByRef(jobRef);
  if (!job) {
    throw new Error(`Job not found: ${jobRef}`);
  }
  return { deleted: true, id: job.id, slug: job.slug, name: job.name };
}

export function enableJobReport(jobRef: string): Record<string, unknown> {
  const jobsRepo = new JobsRepository();
  const job = jobsRepo.setEnabledByRef(jobRef, true);
  if (!job) {
    throw new Error(`Job not found: ${jobRef}`);
  }
  return { id: job.id, slug: job.slug, name: job.name, enabled: job.enabled };
}

export function disableJobReport(jobRef: string): Record<string, unknown> {
  const jobsRepo = new JobsRepository();
  const job = jobsRepo.setEnabledByRef(jobRef, false);
  if (!job) {
    throw new Error(`Job not found: ${jobRef}`);
  }
  return { id: job.id, slug: job.slug, name: job.name, enabled: job.enabled };
}

export function runJobReport(jobRef: string, limit?: number): Record<string, unknown> {
  const jobsRepo = new JobsRepository();
  const job = jobsRepo.getByRef(jobRef);
  if (!job) {
    throw new Error(`Job not found: ${jobRef}`);
  }

  const args = ['job', 'run', jobRef];
  if (limit) {
    args.push('--limit', String(limit));
  }

  const result = spawnSync(process.execPath, [process.argv[1]!, ...args], {
    encoding: 'utf8',
    timeout: 120_000,
  });

  return {
    job: { id: job.id, slug: job.slug, name: job.name },
    exitCode: result.status,
    stdout: result.stdout?.slice(0, 4000) ?? '',
    stderr: result.stderr?.slice(0, 2000) ?? '',
  };
}

export function analyticsReport(jobRef?: string, days?: number): Record<string, unknown> {
  const analyticsService = new AnalyticsService();
  const boundedDays = days ?? 30;

  if (jobRef) {
    const jobsRepo = new JobsRepository();
    const job = jobsRepo.getByRef(jobRef);
    if (!job) {
      throw new Error(`Job not found: ${jobRef}`);
    }
    return analyticsService.getJobAnalytics(job.id, { days: boundedDays }) as unknown as Record<string, unknown>;
  }

  return analyticsService.getGlobalAnalytics({ days: boundedDays }) as unknown as Record<string, unknown>;
}

export function exportReport(jobRef?: string, format?: string, lastRun?: boolean, limit?: number): Record<string, unknown> {
  const jobsRepo = new JobsRepository();
  const scanItemsRepo = new ScanItemsRepository();
  const runsRepo = new RunsRepository();
  const boundedLimit = limit ?? 100;

  const jobs = jobRef
    ? (() => {
        const job = jobsRepo.getByRef(jobRef);
        if (!job) throw new Error(`Job not found: ${jobRef}`);
        return [job];
      })()
    : jobsRepo.list();

  const results: Array<{ jobId: string; jobSlug: string; jobName: string; rowCount: number; items: unknown[] }> = [];

  for (const job of jobs) {
    const latestRunId = lastRun ? runsRepo.listByJob(job.id, 1)[0]?.id ?? null : null;
    if (lastRun && !latestRunId) continue;

    const items = latestRunId
      ? scanItemsRepo.listQualifiedByJobRun(job.id, latestRunId, boundedLimit)
      : scanItemsRepo.listQualifiedByJob(job.id, boundedLimit);

    results.push({
      jobId: job.id,
      jobSlug: job.slug,
      jobName: job.name,
      rowCount: items.length,
      items,
    });
  }

  return { format: format ?? 'json', jobs: results, totalRows: results.reduce((s, r) => s + r.rowCount, 0) };
}

export function consumeReport(jobRef?: string, limit?: number, dryRun?: boolean): Record<string, unknown> {
  const jobsRepo = new JobsRepository();
  const scanItemsRepo = new ScanItemsRepository();

  let jobId: string | undefined;
  if (jobRef) {
    const job = jobsRepo.getByRef(jobRef);
    if (!job) throw new Error(`Job not found: ${jobRef}`);
    jobId = job.id;
  }

  const rows = scanItemsRepo.listUnconsumedQualified(jobId, limit);

  if (dryRun) {
    return { dryRun: true, count: rows.length, items: rows };
  }

  const consumedCount = scanItemsRepo.markConsumed(rows.map((r) => r.id));
  return { consumed: consumedCount, items: rows };
}

export function errorsReport(jobRef: string, hours?: number): Record<string, unknown> {
  const jobsRepo = new JobsRepository();
  const runsRepo = new RunsRepository();
  const boundedHours = hours ?? 24;

  const job = jobsRepo.getByRef(jobRef);
  if (!job) {
    throw new Error(`Job not found: ${jobRef}`);
  }

  const cutoff = Date.now() - boundedHours * 60 * 60 * 1000;
  const recentRuns = runsRepo.listByJob(job.id, 100).filter((run) => {
    const ts = Date.parse(run.createdAt);
    return !Number.isNaN(ts) && ts >= cutoff;
  });

  const errorRuns = recentRuns
    .map((run) => {
      const logContent = readRunLog(run.logFilePath);
      const errorEntries = extractErrorEntries(logContent ?? '');
      return { run, errorEntries, hasErrors: run.status === 'failed' || errorEntries.length > 0 };
    })
    .filter((entry) => entry.hasErrors);

  return {
    job: { id: job.id, slug: job.slug, name: job.name },
    hours: boundedHours,
    errorCount: errorRuns.length,
    errors: errorRuns.map(({ run, errorEntries }) => ({
      runId: run.id,
      status: run.status,
      message: run.message,
      createdAt: run.createdAt,
      errorEntries: errorEntries.map((e) => e.split('\n')[0]),
    })),
  };
}

export function logsReport(runId: string): Record<string, unknown> {
  const runsRepo = new RunsRepository();
  const run = runsRepo.getById(runId);
  if (!run) {
    throw new Error(`Run not found: ${runId}`);
  }

  const logContent = readRunLog(run.logFilePath);
  return {
    runId: run.id,
    jobId: run.jobId,
    jobName: run.jobName,
    status: run.status,
    logPath: run.logFilePath,
    logLength: logContent?.length ?? 0,
    log: logContent?.slice(0, 10_000) ?? null,
  };
}

export async function settingsGetReport(): Promise<Record<string, unknown>> {
  const settingsRepo = new SettingsRepository();
  const appSettings = settingsRepo.getAppSettings();
  const apiKey = await getOpenRouterApiKey();
  const redditState = await settingsRepo.getRedditCredentialState();

  return {
    model: appSettings.model,
    temperature: appSettings.modelSettings.temperature,
    maxTokens: appSettings.modelSettings.maxTokens,
    topP: appSettings.modelSettings.topP,
    cronIntervalMinutes: appSettings.cronIntervalMinutes,
    jobTimeoutMs: appSettings.jobTimeoutMs,
    notificationsEnabled: appSettings.notificationsEnabled,
    openRouterApiKeyConfigured: Boolean(apiKey),
    reddit: {
      appName: redditState.appName,
      clientId: redditState.clientId,
      hasClientSecret: redditState.hasClientSecret,
    },
  };
}

export function settingsSetReport(key: string, value: string): Record<string, unknown> {
  const settingsRepo = new SettingsRepository();
  const appSettings = settingsRepo.getAppSettings();

  switch (key) {
    case 'model':
      appSettings.model = value;
      break;
    case 'temperature': {
      const parsed = Number(value);
      if (Number.isNaN(parsed) || parsed < 0 || parsed > 2) throw new Error('temperature must be 0.0-2.0');
      appSettings.modelSettings.temperature = parsed;
      break;
    }
    case 'maxTokens': {
      const parsed = Number(value);
      if (!Number.isInteger(parsed) || parsed < 1) throw new Error('maxTokens must be a positive integer');
      appSettings.modelSettings.maxTokens = parsed;
      break;
    }
    case 'topP': {
      const parsed = Number(value);
      if (Number.isNaN(parsed) || parsed < 0 || parsed > 1) throw new Error('topP must be 0.0-1.0');
      appSettings.modelSettings.topP = parsed;
      break;
    }
    case 'cronIntervalMinutes': {
      const parsed = Number(value);
      if (!Number.isInteger(parsed) || parsed < 1) throw new Error('cronIntervalMinutes must be a positive integer');
      appSettings.cronIntervalMinutes = parsed;
      break;
    }
    case 'jobTimeoutMs': {
      const parsed = Number(value);
      if (!Number.isInteger(parsed) || parsed < 0) throw new Error('jobTimeoutMs must be a non-negative integer');
      appSettings.jobTimeoutMs = parsed;
      break;
    }
    case 'notificationsEnabled':
      appSettings.notificationsEnabled = value === 'true';
      break;
    default:
      throw new Error(`Unknown setting: ${key}`);
  }

  settingsRepo.setAppSettings(appSettings);
  return { updated: key, value, settings: appSettings };
}

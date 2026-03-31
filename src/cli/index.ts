#!/usr/bin/env node
import { createRequire } from 'module';
import { Command } from 'commander';
import { addJob, disableJob, enableJob, listJobRuns, listJobs, removeJob, runJobNow } from './commands/job.js';
import { openSettings } from './commands/settings.js';
import { daemonReload, daemonRun, daemonStart, daemonStatus, daemonStop } from './commands/daemon.js';
import { showRunLogs } from './commands/logs.js';
import { showJobErrors } from './commands/errors.js';
import { exportCsv } from './commands/export.js';
import { showAnalytics } from './commands/analytics.js';
import { showResults } from './commands/results.js';
import {
  disableStartupCommand,
  enableStartupCommand,
  installStartupCommand,
  startupStatusCommand,
  uninstallStartupCommand
} from './commands/startup.js';
import { runDoctor } from './commands/doctor.js';
import { ensureAppDirs } from '../utils/paths.js';

ensureAppDirs();

// Resolve the package version from package.json at runtime so the CLI always
// reports the version that release-please stamped into package.json.
// Two depths are tried because the source file lives at src/cli/ (2 up) while
// the compiled output lives at dist/src/cli/ (3 up).
const _require = createRequire(import.meta.url);
function readVersion(): string {
  for (const rel of ['../../../package.json', '../../package.json']) {
    try {
      const pkg = _require(rel) as { name?: string; version?: string };
      if (pkg.name === 'snoopy-cli') return pkg.version ?? '0.0.0';
    } catch { /* try next depth */ }
  }
  return '0.0.0';
}

function parsePositiveInteger(value: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Expected a positive integer, received: ${value}`);
  }

  return parsed;
}

const program = new Command();
program.name('snoopy').description('Monitor Reddit conversations with natural language job definitions.').version(readVersion());

const job = program.command('job').description('Manage monitoring jobs');
job.command('add').description('Add a monitoring job').action(async () => {
  await addJob();
});
job.command('list').description('List monitoring jobs').action(listJobs);
job.command('remove').argument('[jobRef]', 'Job ID or slug').description('Remove a job').action(removeJob);
job.command('delete').argument('[jobRef]', 'Job ID or slug').description('Delete a job').action(removeJob);
job.command('enable').argument('[jobRef]', 'Job ID or slug').description('Enable a job').action(enableJob);
job.command('disable').argument('[jobRef]', 'Job ID or slug').description('Disable a job').action(disableJob);
job
  .command('run')
  .argument('[jobRef]', 'Job ID or slug')
  .description('Run a job immediately')
  .option('-l, --limit <count>', 'Maximum number of new post/comment items to qualify', parsePositiveInteger)
  .action(async (jobRef: string | undefined, options: { limit?: number }) => {
    await runJobNow(jobRef, options);
  });
job.command('runs').argument('[jobRef]', 'Optional job ID or slug').description('List recent run history').action(listJobRuns);

const jobs = program.command('jobs').description('Alias for job commands');
jobs.command('list').description('List monitoring jobs').action(listJobs);
jobs.command('enable').argument('[jobRef]', 'Job ID or slug').description('Enable a job').action(enableJob);
jobs.command('disable').argument('[jobRef]', 'Job ID or slug').description('Disable a job').action(disableJob);
jobs.command('remove').argument('[jobRef]', 'Job ID or slug').description('Remove a job').action(removeJob);
jobs.command('delete').argument('[jobRef]', 'Job ID or slug').description('Delete a job').action(removeJob);
jobs
  .command('run')
  .argument('[jobRef]', 'Job ID or slug')
  .description('Run a job immediately')
  .option('-l, --limit <count>', 'Maximum number of new post/comment items to qualify', parsePositiveInteger)
  .action(async (jobRef: string | undefined, options: { limit?: number }) => {
    await runJobNow(jobRef, options);
  });
jobs.command('runs').argument('[jobRef]', 'Optional job ID or slug').description('List recent run history').action(listJobRuns);

program.command('add').description('Alias for job add').action(async () => {
  await addJob();
});
program.command('list').description('Alias for jobs list').action(listJobs);
program.command('delete').argument('[jobRef]', 'Job ID or slug').description('Alias for job delete').action(removeJob);

program.command('start').argument('[jobRef]', 'Job ID or slug').description('Enable a job').action(enableJob);
program.command('stop').argument('[jobRef]', 'Job ID or slug').description('Disable a job').action(disableJob);

program.command('settings').description('Update API key/model/model settings').action(async () => {
  await openSettings();
});

const daemon = program.command('daemon').description('Manage Snoopy daemon');
daemon.command('start').description('Start daemon in background').action(daemonStart);
daemon.command('stop').description('Stop daemon').action(daemonStop);
daemon.command('status').description('Show daemon status').action(daemonStatus);
daemon.command('reload').description('Reload daemon schedules').action(daemonReload);
daemon.command('run').description('Run daemon in foreground').action(daemonRun);

const startup = program.command('startup').description('Manage OS startup registration');
startup.command('install').description('Install startup registration').action(installStartupCommand);
startup.command('uninstall').description('Remove startup registration').action(uninstallStartupCommand);
startup.command('enable').description('Enable startup on reboot/login').action(enableStartupCommand);
startup.command('disable').description('Disable startup on reboot/login').action(disableStartupCommand);
startup.command('status').description('Show startup on reboot status').action(startupStatusCommand);

const reboot = program.command('reboot').description('Manage run-on-reboot behavior');
reboot.command('enable').description('Enable run on reboot/login').action(enableStartupCommand);
reboot.command('disable').description('Disable run on reboot/login').action(disableStartupCommand);
reboot.command('status').description('Show run-on-reboot status').action(startupStatusCommand);

program.command('doctor').description('Run health checks').action(async () => {
  await runDoctor();
});

program
  .command('logs')
  .argument('[runId]', 'Run ID')
  .description('Show pretty logs for a specific run')
  .option('--raw', 'Show raw log file content without pretty formatting')
  .action(async (runId: string | undefined, options: { raw?: boolean }) => {
    await showRunLogs(runId, options);
  });

program
  .command('errors')
  .argument('[jobRef]', 'Job ID or slug')
  .description('Show recent errors for a specific job')
  .option('--hours <count>', 'Look back this many hours', parsePositiveInteger)
  .action(async (jobRef: string | undefined, options: { hours?: number }) => {
    await showJobErrors(jobRef, options);
  });

program
  .command('analytics')
  .argument('[jobRef]', 'Optional job ID or slug')
  .description('Show analytics for all jobs or a single job')
  .option('-d, --days <count>', 'Look back this many days', parsePositiveInteger)
  .action((jobRef: string | undefined, options: { days?: number }) => {
    showAnalytics(jobRef, options);
  });

program
  .command('results')
  .argument('[jobRef]', 'Optional job ID or slug')
  .description('Browse job results in an interactive viewer')
  .action(async (jobRef: string | undefined) => {
    await showResults(jobRef);
  });

program
  .command('export')
  .argument('[jobRef]', 'Optional job ID or slug')
  .description('Export qualified results for one job or all jobs')
  .option('--csv', 'Export as CSV (default)')
  .option('--json', 'Export as JSON')
  .option('--last-run', 'Export only items from each job\'s latest run')
  .option('--limit <count>', 'Maximum rows per job file (default: 100)', parsePositiveInteger, 100)
  .action((jobRef: string | undefined, options: { csv?: boolean; json?: boolean; lastRun?: boolean; limit: number }) => {
    exportCsv(jobRef, options);
  });

program.parseAsync(process.argv).catch((error: unknown) => {
  console.error(`Error: ${String(error)}`);
  process.exit(1);
});

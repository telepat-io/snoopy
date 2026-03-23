#!/usr/bin/env node
import { Command } from 'commander';
import { addJob, disableJob, enableJob, listJobRuns, listJobs, removeJob, runJobNow } from './commands/job.js';
import { openSettings } from './commands/settings.js';
import { daemonRun, daemonStart, daemonStatus, daemonStop } from './commands/daemon.js';
import { showRunLogs } from './commands/logs.js';
import { showJobErrors } from './commands/errors.js';
import { exportCsv } from './commands/export.js';
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

function parsePositiveInteger(value: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Expected a positive integer, received: ${value}`);
  }

  return parsed;
}

const program = new Command();
program.name('snoopy').description('Monitor Reddit conversations with natural language job definitions.').version('0.1.0');

const job = program.command('job').description('Manage monitoring jobs');
job.command('add').description('Add a monitoring job').action(async () => {
  await addJob();
});
job.command('list').description('List monitoring jobs').action(listJobs);
job.command('remove').argument('<jobRef>', 'Job ID or slug').description('Remove a job').action(removeJob);
job.command('delete').argument('<jobRef>', 'Job ID or slug').description('Delete a job').action(removeJob);
job.command('enable').argument('<jobRef>', 'Job ID or slug').description('Enable a job').action(enableJob);
job.command('disable').argument('<jobRef>', 'Job ID or slug').description('Disable a job').action(disableJob);
job
  .command('run')
  .argument('<jobRef>', 'Job ID or slug')
  .description('Run a job immediately')
  .option('-l, --limit <count>', 'Maximum number of new post/comment items to qualify', parsePositiveInteger)
  .action(async (jobRef: string, options: { limit?: number }) => {
    await runJobNow(jobRef, options);
  });
job.command('runs').argument('[jobRef]', 'Optional job ID or slug').description('List recent run history').action(listJobRuns);

const jobs = program.command('jobs').description('Alias for job commands');
jobs.command('list').description('List monitoring jobs').action(listJobs);
jobs.command('enable').argument('<jobRef>', 'Job ID or slug').description('Enable a job').action(enableJob);
jobs.command('disable').argument('<jobRef>', 'Job ID or slug').description('Disable a job').action(disableJob);
jobs.command('remove').argument('<jobRef>', 'Job ID or slug').description('Remove a job').action(removeJob);
jobs.command('delete').argument('<jobRef>', 'Job ID or slug').description('Delete a job').action(removeJob);
jobs
  .command('run')
  .argument('<jobRef>', 'Job ID or slug')
  .description('Run a job immediately')
  .option('-l, --limit <count>', 'Maximum number of new post/comment items to qualify', parsePositiveInteger)
  .action(async (jobRef: string, options: { limit?: number }) => {
    await runJobNow(jobRef, options);
  });
jobs.command('runs').argument('[jobRef]', 'Optional job ID or slug').description('List recent run history').action(listJobRuns);

program.command('add').description('Alias for job add').action(async () => {
  await addJob();
});
program.command('list').description('Alias for jobs list').action(listJobs);
program.command('delete').argument('<jobRef>', 'Job ID or slug').description('Alias for job delete').action(removeJob);

program.command('start').argument('<jobRef>', 'Job ID or slug').description('Enable a job').action(enableJob);
program.command('stop').argument('<jobRef>', 'Job ID or slug').description('Disable a job').action(disableJob);

program.command('settings').description('Update API key/model/model settings').action(async () => {
  await openSettings();
});

const daemon = program.command('daemon').description('Manage Snoopy daemon');
daemon.command('start').description('Start daemon in background').action(daemonStart);
daemon.command('stop').description('Stop daemon').action(daemonStop);
daemon.command('status').description('Show daemon status').action(daemonStatus);
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

program.command('logs').argument('<runId>', 'Run ID').description('Show raw logs for a specific run').action(showRunLogs);

program
  .command('errors')
  .argument('<jobRef>', 'Job ID or slug')
  .description('Show recent errors for a specific job')
  .option('--hours <count>', 'Look back this many hours', parsePositiveInteger)
  .action((jobRef: string, options: { hours?: number }) => {
    showJobErrors(jobRef, options);
  });

const exportCommand = program.command('export').description('Export data artifacts');
exportCommand
  .command('csv')
  .argument('[jobRef]', 'Optional job ID or slug')
  .description('Regenerate CSV qualified results for one job or all jobs')
  .action((jobRef?: string) => {
    exportCsv(jobRef);
  });

program.parseAsync(process.argv).catch((error: unknown) => {
  console.error(`Error: ${String(error)}`);
  process.exit(1);
});

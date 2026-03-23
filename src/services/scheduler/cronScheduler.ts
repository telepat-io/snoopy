import cron, { type ScheduledTask } from 'node-cron';
import { JobsRepository } from '../db/repositories/jobsRepo.js';
import { SettingsRepository } from '../db/repositories/settingsRepo.js';
import { JobRunner } from './jobRunner.js';
import { logger } from '../../utils/logger.js';
import { intervalToCron } from '../../types/settings.js';

export class CronScheduler {
  private readonly jobsRepo = new JobsRepository();
  private readonly settingsRepo = new SettingsRepository();
  private readonly runner = new JobRunner();
  private readonly tasks = new Map<string, ScheduledTask>();
  private readonly running = new Set<string>();

  start(): void {
    const jobs = this.jobsRepo.listEnabled();
    jobs.forEach((job) => this.registerJob(job.id));
    logger.info(`Scheduler started with ${jobs.length} enabled jobs.`);
  }

  stop(): void {
    this.tasks.forEach((task) => task.stop());
    this.tasks.clear();
    logger.info('Scheduler stopped.');
  }

  reload(): void {
    this.stop();
    this.start();
  }

  registerJob(jobId: string): void {
    const job = this.jobsRepo.getById(jobId);
    if (!job || !job.enabled) {
      return;
    }

    const previous = this.tasks.get(jobId);
    if (previous) {
      previous.stop();
    }

    const { cronIntervalMinutes, jobTimeoutMs } = this.settingsRepo.getAppSettings();
    const cronExpression = intervalToCron(cronIntervalMinutes);

    const task = cron.schedule(cronExpression, async () => {
      if (this.running.has(jobId)) {
        logger.warn(`Job ${jobId} is already running, skipping tick.`);
        return;
      }
      this.running.add(jobId);
      try {
        const fresh = this.jobsRepo.getById(jobId);
        if (!fresh || !fresh.enabled) {
          return;
        }
        const runPromise = this.runner.run(fresh);
        if (jobTimeoutMs > 0) {
          let timeoutHandle!: ReturnType<typeof setTimeout>;
          const timeoutPromise = new Promise<never>((_, reject) => {
            timeoutHandle = setTimeout(
              () => reject(new Error(`Job ${jobId} timed out after ${jobTimeoutMs / 1000}s`)),
              jobTimeoutMs
            );
          });
          try {
            await Promise.race([runPromise, timeoutPromise]);
          } finally {
            clearTimeout(timeoutHandle);
          }
        } else {
          await runPromise;
        }
      } catch (error) {
        logger.error(`Scheduler error for job ${jobId}: ${String(error)}`);
      } finally {
        this.running.delete(jobId);
      }
    });

    this.tasks.set(jobId, task);
  }
}

import type { Job } from '../../types/job.js';
import { RunsRepository } from '../db/repositories/runsRepo.js';
import { logger } from '../../utils/logger.js';

export class JobRunnerStub {
  private readonly runsRepo = new RunsRepository();

  async run(job: Job): Promise<void> {
    const message = `Stub execution: job ${job.name} (${job.id}) scheduled. Reddit scanning not implemented yet.`;
    this.runsRepo.addRun(job.id, 'noop', message);
    logger.info(message);
  }
}

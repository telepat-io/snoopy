import { JobsRepository } from '../services/db/repositories/jobsRepo.js';
import { getOpenRouterApiKey } from '../services/security/secretStore.js';
import { removeJob, runJobNow } from '../cli/commands/job.js';

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Invalid positive integer: ${value}`);
  }

  return parsed;
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (!value) {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'y'].includes(normalized)) {
    return true;
  }

  if (['0', 'false', 'no', 'n'].includes(normalized)) {
    return false;
  }

  throw new Error(`Invalid boolean: ${value}`);
}

function parseSubreddits(value: string | undefined): string[] {
  if (!value) {
    return ['startups', 'entrepreneur'];
  }

  const parsed = value
    .split(',')
    .map((item) => item.trim().replace(/^r\//i, ''))
    .filter((item) => item.length > 0);

  if (parsed.length === 0) {
    throw new Error('SNOOPY_E2E_SUBREDDITS must contain at least one subreddit.');
  }

  return parsed;
}

async function main(): Promise<void> {
  const openRouterKey = await getOpenRouterApiKey();

  if (!openRouterKey) {
    throw new Error('Cannot run smoke test: OpenRouter API key is not configured.');
  }

  const jobsRepo = new JobsRepository();
  const runLimit = parsePositiveInt(process.env.SNOOPY_E2E_LIMIT, 5);
  const keepJob = parseBoolean(process.env.SNOOPY_E2E_KEEP_JOB, false);
  const subreddits = parseSubreddits(process.env.SNOOPY_E2E_SUBREDDITS);

  const stamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
  const slug = `e2e-smoke-${stamp}`;

  const job = jobsRepo.create({
    slug,
    name: `E2E Smoke ${stamp}`,
    description: 'Temporary smoke-test job created by src/scripts/e2eSmoke.ts',
    qualificationPrompt:
      'Qualify content when the author is actively building or operating a startup, SaaS, or online business and is asking for concrete help, feedback, users, growth, hiring, product validation, or operations support. Return unqualified for broad news, memes, or non-builder chatter.',
    subreddits,
    scheduleCron: '*/30 * * * *',
    enabled: true,
    monitorComments: false
  });

  let deleted = false;
  console.log(`[e2e-smoke] Created job ${job.slug} (${job.id}) with subreddits: ${subreddits.join(', ')}`);

  try {
    await runJobNow(job.slug, { limit: runLimit });
  } finally {
    if (!keepJob) {
      removeJob(job.slug);
      deleted = true;
    }
  }

  if (deleted) {
    console.log(`[e2e-smoke] Cleanup complete: deleted ${job.slug}`);
  } else {
    console.log(`[e2e-smoke] Preserved job ${job.slug} because SNOOPY_E2E_KEEP_JOB=true`);
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[e2e-smoke] ${message}`);
  process.exit(1);
});

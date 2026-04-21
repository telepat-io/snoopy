import crypto from 'node:crypto';
import { getDb } from '../../src/services/db/sqlite.js';
import { ActiveRunConflictError, RunsRepository } from '../../src/services/db/repositories/runsRepo.js';

describe('RunsRepository', () => {
  it('tracks run lifecycle and analytics fields', () => {
    const db = getDb();
    const runsRepo = new RunsRepository();
    const jobId = crypto.randomUUID();

    db.prepare(
      `INSERT INTO jobs (
        id, slug, name, description, qualification_prompt, subreddits_json,
        schedule_cron, enabled, monitor_comments, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1, datetime('now'), datetime('now'))`
    ).run(jobId, `runs-${Date.now()}`, `runs-${Date.now()}`, 'desc', 'prompt', JSON.stringify(['typescript']), '*/30 * * * *');

    const runId = runsRepo.startRun(jobId, '/tmp/run-log.log');
    runsRepo.completeRun(runId, {
      itemsDiscovered: 12,
      itemsNew: 5,
      itemsQualified: 2,
      promptTokens: 800,
      completionTokens: 120,
      estimatedCostUsd: 0.012345
    });

    const rows = runsRepo.listByJob(jobId, 5);
    expect(rows.length).toBeGreaterThan(0);
    const first = rows[0]!;

    expect(first.id).toBe(runId);
    expect(first.status).toBe('completed');
    expect(first.itemsDiscovered).toBe(12);
    expect(first.itemsNew).toBe(5);
    expect(first.itemsQualified).toBe(2);
    expect(first.promptTokens).toBe(800);
    expect(first.completionTokens).toBe(120);
    expect(first.estimatedCostUsd).toBeCloseTo(0.012345, 6);
    expect(first.logFilePath).toBe('/tmp/run-log.log');
  });

  it('rejects starting a second active run for the same job', () => {
    const db = getDb();
    const runsRepo = new RunsRepository();
    const jobId = crypto.randomUUID();

    db.prepare(
      `INSERT INTO jobs (
        id, slug, name, description, qualification_prompt, subreddits_json,
        schedule_cron, enabled, monitor_comments, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1, datetime('now'), datetime('now'))`
    ).run(jobId, `runs-active-${Date.now()}`, `runs-active-${Date.now()}`, 'desc', 'prompt', JSON.stringify(['node']), '*/15 * * * *');

    const firstRunId = runsRepo.startRun(jobId);

    expect(() => runsRepo.startRun(jobId)).toThrow(ActiveRunConflictError);

    runsRepo.failRun(firstRunId, 'done');
    expect(() => runsRepo.startRun(jobId)).not.toThrow();
  });

  it('supports addRun, failRun, setLogFilePath and lookup helpers', () => {
    const db = getDb();
    const runsRepo = new RunsRepository();
    const jobId = crypto.randomUUID();

    db.prepare(
      `INSERT INTO jobs (
        id, slug, name, description, qualification_prompt, subreddits_json,
        schedule_cron, enabled, monitor_comments, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1, datetime('now'), datetime('now'))`
    ).run(jobId, `runs-alt-${Date.now()}`, `runs-alt-${Date.now()}`, 'desc', 'prompt', JSON.stringify(['node']), '*/15 * * * *');

    runsRepo.addRun(jobId, 'skipped', 'no-key');
    const runId = runsRepo.startRun(jobId);
    runsRepo.setLogFilePath(runId, '/tmp/log-alt.log');
    runsRepo.failRun(runId, 'boom');

    const run = runsRepo.getById(runId);
    expect(run?.status).toBe('failed');
    expect(run?.message).toBe('boom');
    expect(run?.logFilePath).toBe('/tmp/log-alt.log');
    expect(runsRepo.getById('missing')).toBeNull();

    const latest = runsRepo.latest(10);
    expect(latest.some((row) => row.jobId === jobId)).toBe(true);
    expect(runsRepo.latest().length).toBeGreaterThan(0);

    const latestNamed = runsRepo.latestWithJobNames(10);
    const fromJob = latestNamed.find((row) => row.jobId === jobId);
    expect(fromJob?.jobName).toContain('runs-alt-');
    expect(runsRepo.latestWithJobNames().length).toBeGreaterThan(0);

    const totalForJob = runsRepo.countByJob(jobId);
    expect(totalForJob).toBeGreaterThanOrEqual(2);

    const firstPage = runsRepo.listByJobPage(jobId, 1, 0);
    expect(firstPage).toHaveLength(1);

    const firstByIndex = runsRepo.getByJobIndex(jobId, 0);
    expect(firstByIndex).toEqual(firstPage[0]);

    const globalTotal = runsRepo.countAll();
    expect(globalTotal).toBeGreaterThanOrEqual(totalForJob);

    const globalPage = runsRepo.latestWithJobNamesPage(1, 0);
    expect(globalPage).toHaveLength(1);

    const globalByIndex = runsRepo.getLatestWithJobNamesByIndex(0);
    expect(globalByIndex).toEqual(globalPage[0]);
  });

  it('lists run analytics and counts runs within a day window', () => {
    const db = getDb();
    const runsRepo = new RunsRepository();
    const jobId = crypto.randomUUID();

    db.prepare(
      `INSERT INTO jobs (
        id, slug, name, description, qualification_prompt, subreddits_json,
        schedule_cron, enabled, monitor_comments, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1, datetime('now'), datetime('now'))`
    ).run(jobId, `runs-analytics-${Date.now()}`, `runs-analytics-${Date.now()}`, 'desc', 'prompt', JSON.stringify(['node']), '*/15 * * * *');

    const recentRunId = runsRepo.startRun(jobId);
    runsRepo.completeRun(recentRunId, {
      itemsDiscovered: 10,
      itemsNew: 3,
      itemsQualified: 1,
      promptTokens: 300,
      completionTokens: 90,
      estimatedCostUsd: 0.00123
    });

    db.prepare(
      `INSERT INTO scan_items (
        id,
        job_id,
        run_id,
        type,
        reddit_post_id,
        reddit_comment_id,
        subreddit,
        author,
        title,
        body,
        url,
        reddit_posted_at,
        qualified,
        viewed,
        validated,
        processed,
        prompt_tokens,
        completion_tokens,
        estimated_cost_usd,
        qualification_reason,
        created_at
      ) VALUES (?, ?, ?, 'post', ?, NULL, ?, ?, ?, ?, ?, ?, 1, 0, 0, 0, ?, ?, ?, ?, datetime('now'))`
    ).run(
      `run-analytics-post-${Date.now()}`,
      jobId,
      recentRunId,
      'post-analytics-1',
      'node',
      'author',
      'title',
      'body',
      'https://reddit.com/post-analytics-1',
      new Date().toISOString(),
      100,
      20,
      0.00055,
      'match'
    );

    db.prepare(
      `INSERT INTO scan_items (
        id,
        job_id,
        run_id,
        type,
        reddit_post_id,
        reddit_comment_id,
        subreddit,
        author,
        title,
        body,
        url,
        reddit_posted_at,
        qualified,
        viewed,
        validated,
        processed,
        prompt_tokens,
        completion_tokens,
        estimated_cost_usd,
        qualification_reason,
        created_at
      ) VALUES (?, ?, ?, 'comment', ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 0, ?, ?, ?, ?, datetime('now'))`
    ).run(
      `run-analytics-comment-${Date.now()}`,
      jobId,
      recentRunId,
      'post-analytics-1',
      'comment-analytics-1',
      'node',
      'commenter',
      'title',
      'comment body',
      'https://reddit.com/post-analytics-1',
      new Date().toISOString(),
      50,
      10,
      0.0003,
      'no'
    );

    const oldRunId = crypto.randomUUID();
    db.prepare(
      `INSERT INTO job_runs (
        id,
        job_id,
        status,
        started_at,
        finished_at,
        created_at
      ) VALUES (?, ?, 'completed', datetime('now', '-40 days'), datetime('now', '-40 days'), datetime('now', '-40 days'))`
    ).run(oldRunId, jobId);

    const analyticsRuns = runsRepo.listAnalyticsRuns({ jobId, days: 30, limit: 10 });
    expect(analyticsRuns).toHaveLength(1);
    expect(analyticsRuns[0]).toEqual(
      expect.objectContaining({
        id: recentRunId,
        newPosts: 1,
        newComments: 1,
        promptTokens: 300,
        completionTokens: 90
      })
    );

    expect(runsRepo.countRuns({ jobId, days: 30 })).toBe(1);
    expect(runsRepo.countRuns({ jobId, days: 90 })).toBeGreaterThanOrEqual(2);
  });
});

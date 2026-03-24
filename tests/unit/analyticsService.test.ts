import crypto from 'node:crypto';
import { getDb } from '../../src/services/db/sqlite.js';
import { AnalyticsService } from '../../src/services/analytics/analyticsService.js';
import { RunsRepository } from '../../src/services/db/repositories/runsRepo.js';

describe('AnalyticsService', () => {
  it('returns global analytics with totals, derived metrics, and breakdowns', () => {
    const db = getDb();
    const runsRepo = new RunsRepository();

    const jobId = crypto.randomUUID();
    db.prepare(
      `INSERT INTO jobs (
        id, slug, name, description, qualification_prompt, subreddits_json,
        schedule_cron, enabled, monitor_comments, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1, datetime('now'), datetime('now'))`
    ).run(jobId, `analytics-${Date.now()}`, `analytics-${Date.now()}`, 'desc', 'prompt', JSON.stringify(['javascript']), '*/30 * * * *');

    const runId = runsRepo.startRun(jobId);
    runsRepo.completeRun(runId, {
      itemsDiscovered: 7,
      itemsNew: 2,
      itemsQualified: 1,
      promptTokens: 200,
      completionTokens: 40,
      estimatedCostUsd: 0.0011
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
      `analytics-post-${Date.now()}`,
      jobId,
      runId,
      'analytics-post',
      'javascript',
      'author',
      'title',
      'body',
      'https://reddit.com/post',
      new Date().toISOString(),
      120,
      30,
      0.00075,
      'matched'
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
      `analytics-comment-${Date.now()}`,
      jobId,
      runId,
      'analytics-post',
      'analytics-comment',
      'javascript',
      'commenter',
      'title',
      'comment body',
      'https://reddit.com/post',
      new Date().toISOString(),
      80,
      10,
      0.00035,
      'nope'
    );

    const service = new AnalyticsService();
    const global = service.getGlobalAnalytics({ days: 30, runLimit: 5 });

    expect(global.windowDays).toBe(30);
    expect(global.runCount).toBeGreaterThanOrEqual(1);
    expect(global.totals).toEqual(
      expect.objectContaining({
        newPosts: 1,
        newComments: 1,
        promptTokens: 200,
        completionTokens: 40,
        totalTokens: 240,
        estimatedCostUsd: 0.0011,
        tokensPerPost: 240,
        costPerPost: 0.0011
      })
    );

    expect(global.byJob).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          jobId,
          jobSlug: expect.stringContaining('analytics-')
        })
      ])
    );
    expect(global.bySubreddit).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subreddit: 'javascript',
          newPosts: 1,
          newComments: 1
        })
      ])
    );
    expect(global.recentRuns[0]).toEqual(
      expect.objectContaining({
        id: runId,
        newPosts: 1,
        newComments: 1,
        totalTokens: 240
      })
    );
  });

  it('returns job analytics scoped to one job and handles zero-post ratios', () => {
    const db = getDb();
    const runsRepo = new RunsRepository();

    const jobId = crypto.randomUUID();
    db.prepare(
      `INSERT INTO jobs (
        id, slug, name, description, qualification_prompt, subreddits_json,
        schedule_cron, enabled, monitor_comments, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1, datetime('now'), datetime('now'))`
    ).run(jobId, `analytics-job-${Date.now()}`, `analytics-job-${Date.now()}`, 'desc', 'prompt', JSON.stringify(['typescript']), '*/30 * * * *');

    const runId = runsRepo.startRun(jobId);
    runsRepo.completeRun(runId, {
      itemsDiscovered: 3,
      itemsNew: 1,
      itemsQualified: 0,
      promptTokens: 30,
      completionTokens: 5,
      estimatedCostUsd: 0.0002
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
      ) VALUES (?, ?, ?, 'comment', ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 0, ?, ?, ?, ?, datetime('now'))`
    ).run(
      `analytics-only-comment-${Date.now()}`,
      jobId,
      runId,
      'post-id',
      'comment-id',
      'typescript',
      'author',
      'title',
      'body',
      'https://reddit.com/comment',
      new Date().toISOString(),
      30,
      5,
      0.0002,
      'no'
    );

    const service = new AnalyticsService();
    const scoped = service.getJobAnalytics(jobId, { days: 30, runLimit: 5 });

    expect(scoped.totals.newPosts).toBe(0);
    expect(scoped.totals.newComments).toBe(1);
    expect(scoped.totals.tokensPerPost).toBeNull();
    expect(scoped.totals.costPerPost).toBeNull();
    expect(scoped.bySubreddit).toHaveLength(1);
    expect(scoped.recentRuns[0]?.id).toBe(runId);
  });
});

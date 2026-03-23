import crypto from 'node:crypto';
import { getDb } from '../../src/services/db/sqlite.js';
import { ScanItemsRepository } from '../../src/services/db/repositories/scanItemsRepo.js';

describe('ScanItemsRepository', () => {
  it('stores post and comment scan items and deduplicates via lookup helpers', () => {
    const db = getDb();
    const repo = new ScanItemsRepository();

    const jobId = crypto.randomUUID();
    const runId = crypto.randomUUID();

    db.prepare(
      `INSERT INTO jobs (
        id, slug, name, description, qualification_prompt, subreddits_json,
        schedule_cron, enabled, monitor_comments, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1, datetime('now'), datetime('now'))`
    ).run(jobId, `job-${Date.now()}`, `job-${Date.now()}`, 'desc', 'prompt', JSON.stringify(['askreddit']), '*/30 * * * *');

    db.prepare(
      `INSERT INTO job_runs (
        id, job_id, status, started_at, finished_at, created_at
      ) VALUES (?, ?, 'completed', datetime('now'), datetime('now'), datetime('now'))`
    ).run(runId, jobId);

    expect(repo.existsPost(jobId, 'post-1')).toBe(false);
    expect(repo.existsComment(jobId, 'post-1', 'comment-1')).toBe(false);

    repo.create({
      jobId,
      runId,
      type: 'post',
      redditPostId: 'post-1',
      redditCommentId: null,
      subreddit: 'askreddit',
      author: 'author1',
      title: 'title',
      body: 'body',
      url: 'https://reddit.com/post-1',
      redditPostedAt: new Date().toISOString(),
      qualified: true,
      qualificationReason: 'good match'
    });

    repo.create({
      jobId,
      runId,
      type: 'comment',
      redditPostId: 'post-1',
      redditCommentId: 'comment-1',
      subreddit: 'askreddit',
      author: 'author2',
      title: 'title',
      body: 'comment body',
      url: 'https://reddit.com/post-1',
      redditPostedAt: new Date().toISOString(),
      qualified: false,
      qualificationReason: 'not a fit'
    });

    expect(repo.existsPost(jobId, 'post-1')).toBe(true);
    expect(repo.existsComment(jobId, 'post-1', 'comment-1')).toBe(true);
  });
});

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

    const qualified = repo.listQualifiedByJob(jobId);
    expect(qualified).toHaveLength(1);
    expect(qualified[0]).toEqual(
      expect.objectContaining({
        jobId,
        runId,
        author: 'author1',
        title: 'title',
        url: 'https://reddit.com/post-1',
        viewed: false,
        validated: false,
        processed: false,
        qualificationReason: 'good match'
      })
    );
  });

  it('stores thread lineage nodes for comment scan items', () => {
    const db = getDb();
    const repo = new ScanItemsRepository();

    const jobId = crypto.randomUUID();
    const runId = crypto.randomUUID();

    db.prepare(
      `INSERT INTO jobs (
        id, slug, name, description, qualification_prompt, subreddits_json,
        schedule_cron, enabled, monitor_comments, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1, datetime('now'), datetime('now'))`
    ).run(jobId, `job-${Date.now()}-thread`, `job-${Date.now()}-thread`, 'desc', 'prompt', JSON.stringify(['askreddit']), '*/30 * * * *');

    db.prepare(
      `INSERT INTO job_runs (
        id, job_id, status, started_at, finished_at, created_at
      ) VALUES (?, ?, 'completed', datetime('now'), datetime('now'), datetime('now'))`
    ).run(runId, jobId);

    const scanItemId = repo.create({
      jobId,
      runId,
      type: 'comment',
      redditPostId: 'post-thread',
      redditCommentId: 'c3',
      subreddit: 'askreddit',
      author: 'author-target',
      title: 'thread title',
      body: 'target body',
      url: 'https://reddit.com/post-thread/c3',
      redditPostedAt: '2026-03-03T00:00:00.000Z',
      qualified: true,
      qualificationReason: 'match',
      commentThreadNodes: [
        {
          redditCommentId: 'c1',
          parentRedditCommentId: null,
          author: 'author-a',
          body: 'root',
          depth: 0,
          isTarget: false
        },
        {
          redditCommentId: 'c2',
          parentRedditCommentId: 'c1',
          author: 'author-b',
          body: 'middle',
          depth: 1,
          isTarget: false
        },
        {
          redditCommentId: 'c3',
          parentRedditCommentId: 'c2',
          author: 'author-target',
          body: 'target',
          depth: 2,
          isTarget: true
        }
      ]
    });

    const nodes = repo.listCommentThreadNodes(scanItemId);
    expect(nodes).toHaveLength(3);
    expect(nodes.map((node) => node.redditCommentId)).toEqual(['c1', 'c2', 'c3']);
    expect(nodes[2]).toEqual(
      expect.objectContaining({
        parentRedditCommentId: 'c2',
        depth: 2,
        isTarget: true
      })
    );
  });

  it('returns qualified items in newest-first order', () => {
    const db = getDb();
    const repo = new ScanItemsRepository();

    const jobId = crypto.randomUUID();
    const runId = crypto.randomUUID();

    db.prepare(
      `INSERT INTO jobs (
        id, slug, name, description, qualification_prompt, subreddits_json,
        schedule_cron, enabled, monitor_comments, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1, datetime('now'), datetime('now'))`
    ).run(jobId, `job-${Date.now()}-ordering`, `job-${Date.now()}-ordering`, 'desc', 'prompt', JSON.stringify(['askreddit']), '*/30 * * * *');

    db.prepare(
      `INSERT INTO job_runs (
        id, job_id, status, started_at, finished_at, created_at
      ) VALUES (?, ?, 'completed', datetime('now'), datetime('now'), datetime('now'))`
    ).run(runId, jobId);

    repo.create({
      jobId,
      runId,
      type: 'post',
      redditPostId: 'post-old',
      redditCommentId: null,
      subreddit: 'askreddit',
      author: 'author-old',
      title: 'old',
      body: 'old body',
      url: 'https://reddit.com/post-old',
      redditPostedAt: '2026-01-01T00:00:00.000Z',
      qualified: true,
      qualificationReason: 'old'
    });

    repo.create({
      jobId,
      runId,
      type: 'post',
      redditPostId: 'post-new',
      redditCommentId: null,
      subreddit: 'askreddit',
      author: 'author-new',
      title: 'new',
      body: 'new body',
      url: 'https://reddit.com/post-new',
      redditPostedAt: '2026-02-01T00:00:00.000Z',
      qualified: true,
      qualificationReason: 'new'
    });

    const qualified = repo.listQualifiedByJob(jobId);
    expect(qualified).toHaveLength(2);
    expect(qualified[0]?.url).toBe('https://reddit.com/post-new');
    expect(qualified[1]?.url).toBe('https://reddit.com/post-old');
  });

  it('returns all scan items in newest-first order regardless of qualification', () => {
    const db = getDb();
    const repo = new ScanItemsRepository();

    const jobId = crypto.randomUUID();
    const runId = crypto.randomUUID();

    db.prepare(
      `INSERT INTO jobs (
        id, slug, name, description, qualification_prompt, subreddits_json,
        schedule_cron, enabled, monitor_comments, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1, datetime('now'), datetime('now'))`
    ).run(jobId, `job-${Date.now()}-all-items`, `job-${Date.now()}-all-items`, 'desc', 'prompt', JSON.stringify(['askreddit']), '*/30 * * * *');

    db.prepare(
      `INSERT INTO job_runs (
        id, job_id, status, started_at, finished_at, created_at
      ) VALUES (?, ?, 'completed', datetime('now'), datetime('now'), datetime('now'))`
    ).run(runId, jobId);

    repo.create({
      jobId,
      runId,
      type: 'post',
      redditPostId: 'post-older',
      redditCommentId: null,
      subreddit: 'askreddit',
      author: 'author-old',
      title: 'older',
      body: 'older body',
      url: 'https://reddit.com/post-older',
      redditPostedAt: '2026-01-01T00:00:00.000Z',
      qualified: true,
      qualificationReason: 'older match'
    });

    repo.create({
      jobId,
      runId,
      type: 'comment',
      redditPostId: 'post-newer',
      redditCommentId: 'comment-newer',
      subreddit: 'askreddit',
      author: 'author-new',
      title: 'newer',
      body: 'newer body',
      url: 'https://reddit.com/post-newer/comment-newer',
      redditPostedAt: '2026-02-01T00:00:00.000Z',
      qualified: false,
      qualificationReason: 'not a fit'
    });

    const allItems = repo.listByJob(jobId);
    expect(allItems).toHaveLength(2);
    expect(allItems[0]).toEqual(
      expect.objectContaining({
        type: 'comment',
        qualified: false,
        url: 'https://reddit.com/post-newer/comment-newer'
      })
    );
    expect(allItems[1]).toEqual(
      expect.objectContaining({
        type: 'post',
        qualified: true,
        url: 'https://reddit.com/post-older'
      })
    );
  });

  it('stores and returns lifecycle flags for qualified items', () => {
    const db = getDb();
    const repo = new ScanItemsRepository();

    const jobId = crypto.randomUUID();
    const runId = crypto.randomUUID();

    db.prepare(
      `INSERT INTO jobs (
        id, slug, name, description, qualification_prompt, subreddits_json,
        schedule_cron, enabled, monitor_comments, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1, datetime('now'), datetime('now'))`
    ).run(jobId, `job-${Date.now()}-flags`, `job-${Date.now()}-flags`, 'desc', 'prompt', JSON.stringify(['askreddit']), '*/30 * * * *');

    db.prepare(
      `INSERT INTO job_runs (
        id, job_id, status, started_at, finished_at, created_at
      ) VALUES (?, ?, 'completed', datetime('now'), datetime('now'), datetime('now'))`
    ).run(runId, jobId);

    repo.create({
      jobId,
      runId,
      type: 'post',
      redditPostId: 'post-flags',
      redditCommentId: null,
      subreddit: 'askreddit',
      author: 'author-flags',
      title: 'flags',
      body: 'body',
      url: 'https://reddit.com/post-flags',
      redditPostedAt: '2026-03-01T00:00:00.000Z',
      qualified: true,
      viewed: true,
      validated: true,
      processed: true,
      qualificationReason: 'match'
    });

    const qualified = repo.listQualifiedByJob(jobId);
    expect(qualified).toHaveLength(1);
    expect(qualified[0]).toEqual(
      expect.objectContaining({
        viewed: true,
        validated: true,
        processed: true
      })
    );
  });

  it('persists token and cost analytics fields for scan items', () => {
    const db = getDb();
    const repo = new ScanItemsRepository();

    const jobId = crypto.randomUUID();
    const runId = crypto.randomUUID();

    db.prepare(
      `INSERT INTO jobs (
        id, slug, name, description, qualification_prompt, subreddits_json,
        schedule_cron, enabled, monitor_comments, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1, datetime('now'), datetime('now'))`
    ).run(jobId, `job-${Date.now()}-tokens`, `job-${Date.now()}-tokens`, 'desc', 'prompt', JSON.stringify(['askreddit']), '*/30 * * * *');

    db.prepare(
      `INSERT INTO job_runs (
        id, job_id, status, started_at, finished_at, created_at
      ) VALUES (?, ?, 'completed', datetime('now'), datetime('now'), datetime('now'))`
    ).run(runId, jobId);

    repo.create({
      jobId,
      runId,
      type: 'post',
      redditPostId: 'post-tokens',
      redditCommentId: null,
      subreddit: 'askreddit',
      author: 'author',
      title: 'title',
      body: 'body',
      url: 'https://reddit.com/post-tokens',
      redditPostedAt: '2026-03-02T00:00:00.000Z',
      qualified: true,
      promptTokens: 123,
      completionTokens: 45,
      estimatedCostUsd: 0.001234,
      qualificationReason: 'match'
    });

    const row = db
      .prepare(
        `SELECT
           prompt_tokens as promptTokens,
           completion_tokens as completionTokens,
           estimated_cost_usd as estimatedCostUsd
         FROM scan_items
         WHERE run_id = ?
         LIMIT 1`
      )
      .get(runId) as
      | {
          promptTokens: number;
          completionTokens: number;
          estimatedCostUsd: number | null;
        }
      | undefined;

    expect(row).toEqual(
      expect.objectContaining({
        promptTokens: 123,
        completionTokens: 45,
        estimatedCostUsd: 0.001234
      })
    );
  });

  it('aggregates analytics by scope and respects day windows', () => {
    const db = getDb();
    const repo = new ScanItemsRepository();

    const jobId = crypto.randomUUID();
    const runId = crypto.randomUUID();

    db.prepare(
      `INSERT INTO jobs (
        id, slug, name, description, qualification_prompt, subreddits_json,
        schedule_cron, enabled, monitor_comments, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1, datetime('now'), datetime('now'))`
    ).run(jobId, `job-${Date.now()}-agg`, `job-${Date.now()}-agg`, 'desc', 'prompt', JSON.stringify(['askreddit']), '*/30 * * * *');

    db.prepare(
      `INSERT INTO job_runs (
        id, job_id, status, started_at, finished_at, created_at
      ) VALUES (?, ?, 'completed', datetime('now'), datetime('now'), datetime('now'))`
    ).run(runId, jobId);

    repo.create({
      jobId,
      runId,
      type: 'post',
      redditPostId: 'post-agg',
      redditCommentId: null,
      subreddit: 'askreddit',
      author: 'author',
      title: 'title',
      body: 'body',
      url: 'https://reddit.com/post-agg',
      redditPostedAt: '2026-03-02T00:00:00.000Z',
      qualified: true,
      promptTokens: 100,
      completionTokens: 20,
      estimatedCostUsd: 0.0008,
      qualificationReason: 'match'
    });

    repo.create({
      jobId,
      runId,
      type: 'comment',
      redditPostId: 'post-agg',
      redditCommentId: 'comment-agg',
      subreddit: 'typescript',
      author: 'commenter',
      title: 'title',
      body: 'comment body',
      url: 'https://reddit.com/post-agg',
      redditPostedAt: '2026-03-02T00:00:00.000Z',
      qualified: false,
      promptTokens: 50,
      completionTokens: 10,
      estimatedCostUsd: 0.00045,
      qualificationReason: 'no'
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
      ) VALUES (?, ?, ?, 'post', ?, NULL, ?, ?, ?, ?, ?, ?, 0, 0, 0, 0, ?, ?, ?, ?, datetime('now', '-40 days'))`
    ).run(
      `old-item-${Date.now()}`,
      jobId,
      runId,
      'post-old',
      'oldsub',
      'author-old',
      'old',
      'old body',
      'https://reddit.com/old',
      '2026-01-01T00:00:00.000Z',
      999,
      999,
      0.1,
      'old'
    );

    const totals = repo.getAnalyticsTotals({ jobId, days: 30 });
    expect(totals).toEqual({
      newPosts: 1,
      newComments: 1,
      promptTokens: 150,
      completionTokens: 30,
      estimatedCostUsd: 0.00125
    });

    const subredditRows = repo.listAnalyticsBySubreddit({ jobId, days: 30 });
    expect(subredditRows).toHaveLength(2);
    expect(subredditRows.map((row) => row.subreddit)).toEqual(expect.arrayContaining(['askreddit', 'typescript']));

    const byJob = repo.listAnalyticsByJob(30);
    const jobSummary = byJob.find((row) => row.jobId === jobId);
    expect(jobSummary).toEqual(
      expect.objectContaining({
        jobId,
        newPosts: 1,
        newComments: 1,
        promptTokens: 150,
        completionTokens: 30,
        estimatedCostUsd: 0.00125
      })
    );
  });
});

import fs from 'node:fs';
import { JobsRepository } from '../../src/services/db/repositories/jobsRepo.js';
import { SettingsRepository } from '../../src/services/db/repositories/settingsRepo.js';
import { JobRunner } from '../../src/services/scheduler/jobRunner.js';
import { OpenRouterClient } from '../../src/services/openrouter/client.js';
import { getDb } from '../../src/services/db/sqlite.js';
import { RunsRepository } from '../../src/services/db/repositories/runsRepo.js';
import * as redditClient from '../../src/services/reddit/client.js';
import * as secretStore from '../../src/services/security/secretStore.js';
import * as notify from '../../src/utils/notify.js';

describe('JobRunner', () => {
  beforeEach(() => {
    jest.restoreAllMocks();

    const settingsRepo = new SettingsRepository();
    settingsRepo.setAppSettings({
      model: 'moonshotai/kimi-k2.5',
      modelSettings: {
        temperature: 0.2,
        maxTokens: 500,
        topP: 1
      },
      cronIntervalMinutes: 30,
      jobTimeoutMs: 600000,
      notificationsEnabled: true
    });
  });

  it('stops after reaching maxNewItems across posts and comments', async () => {
    const jobsRepo = new JobsRepository();
    const job = jobsRepo.create({
      name: `manual-run-limit-${Date.now()}`,
      description: 'desc',
      qualificationPrompt: 'prompt',
      subreddits: ['askreddit'],
      monitorComments: true
    });

    jest.spyOn(secretStore, 'getOpenRouterApiKey').mockResolvedValue('openrouter-key');
    jest.spyOn(redditClient, 'getRecentSubredditPosts').mockResolvedValue([
      {
        id: 'post-1',
        subreddit: 'askreddit',
        title: 'first',
        body: 'body 1',
        author: 'author-1',
        url: 'https://reddit.com/post-1',
        postedAt: '2026-01-01T00:00:00.000Z'
      },
      {
        id: 'post-2',
        subreddit: 'askreddit',
        title: 'second',
        body: 'body 2',
        author: 'author-2',
        url: 'https://reddit.com/post-2',
        postedAt: '2026-01-01T00:05:00.000Z'
      }
    ]);
    const getCommentsSpy = jest.spyOn(redditClient, 'getRedditPostComments').mockResolvedValue([
      {
        id: 'comment-1',
        author: 'commenter',
        body: 'comment body',
        replies: []
      }
    ]);

    const qualifyPostSpy = jest.spyOn(OpenRouterClient.prototype, 'qualifyPost').mockResolvedValue({
      qualified: true,
      reason: 'matched',
      promptTokens: 100,
      completionTokens: 20
    });
    const qualifyCommentSpy = jest.spyOn(OpenRouterClient.prototype, 'qualifyCommentThread').mockResolvedValue({
      qualified: false,
      reason: 'not matched',
      promptTokens: 50,
      completionTokens: 10
    });

    const runner = new JobRunner();
    await runner.run(job, { maxNewItems: 1 });

    expect(qualifyPostSpy).toHaveBeenCalledTimes(1);
    expect(getCommentsSpy).not.toHaveBeenCalled();
    expect(qualifyCommentSpy).not.toHaveBeenCalled();

    const runRow = getDb()
      .prepare(
        `SELECT items_discovered as itemsDiscovered,
                items_new as itemsNew,
                items_qualified as itemsQualified,
                prompt_tokens as promptTokens,
                completion_tokens as completionTokens,
                status
         FROM job_runs
         WHERE job_id = ?
         ORDER BY created_at DESC
         LIMIT 1`
      )
      .get(job.id) as
      | {
          itemsDiscovered: number;
          itemsNew: number;
          itemsQualified: number;
          promptTokens: number;
          completionTokens: number;
          status: string;
        }
      | undefined;

    expect(runRow).toEqual(
      expect.objectContaining({
        status: 'completed',
        itemsDiscovered: 2,
        itemsNew: 1,
        itemsQualified: 1,
        promptTokens: 100,
        completionTokens: 20
      })
    );

    const latestRun = new RunsRepository().listByJob(job.id, 1)[0];
    expect(latestRun?.logFilePath).toBeTruthy();
    expect(fs.existsSync(latestRun!.logFilePath!)).toBe(true);
    const logContent = fs.readFileSync(latestRun!.logFilePath!, 'utf8');
    expect(logContent).toContain('"event": "run_start"');
    expect(logContent).toContain('"event": "run_complete"');
  });

  it('emits structured progress events during manual run', async () => {
    const jobsRepo = new JobsRepository();
    const job = jobsRepo.create({
      name: `manual-run-progress-${Date.now()}`,
      description: 'desc',
      qualificationPrompt: 'prompt',
      subreddits: ['askreddit'],
      monitorComments: true
    });

    jest.spyOn(secretStore, 'getOpenRouterApiKey').mockResolvedValue('openrouter-key');
    jest.spyOn(redditClient, 'getRecentSubredditPosts').mockResolvedValue([
      {
        id: 'post-progress-1',
        subreddit: 'askreddit',
        title: 'first',
        body: 'body 1',
        author: 'author-1',
        url: 'https://reddit.com/post-progress-1',
        postedAt: '2026-01-01T00:00:00.000Z'
      }
    ]);
    jest.spyOn(redditClient, 'getRedditPostComments').mockResolvedValue([
      {
        id: 'comment-progress-1',
        author: 'commenter',
        body: 'comment body',
        replies: []
      }
    ]);
    jest.spyOn(OpenRouterClient.prototype, 'qualifyPost').mockResolvedValue({
      qualified: true,
      reason: 'matched',
      promptTokens: 42,
      completionTokens: 10
    });
    jest.spyOn(OpenRouterClient.prototype, 'qualifyCommentThread').mockResolvedValue({
      qualified: false,
      reason: 'not matched',
      promptTokens: 30,
      completionTokens: 5
    });

    const events: string[] = [];
    const runner = new JobRunner();
    await runner.run(job, {
      onProgress: (event) => {
        events.push(event.type);
      }
    });

    expect(events).toContain('run_start');
    expect(events).toContain('subreddit_fetched');
    expect(events).toContain('post_scanned');
    expect(events).toContain('comments_loaded');
    expect(events).toContain('comment_scanned');
    expect(events).toContain('run_complete');
  });

  it('skips run when OpenRouter API key is missing', async () => {
    const jobsRepo = new JobsRepository();
    const job = jobsRepo.create({
      name: `missing-key-${Date.now()}`,
      description: 'desc',
      qualificationPrompt: 'prompt',
      subreddits: ['askreddit'],
      monitorComments: true
    });

    jest.spyOn(secretStore, 'getOpenRouterApiKey').mockResolvedValue(null);
    const warnSpy = jest.spyOn(redditClient, 'getRecentSubredditPosts');

    const events: string[] = [];
    const runner = new JobRunner();
    await runner.run(job, {
      onProgress: (event) => events.push(event.type)
    });

    expect(events).toContain('run_skipped');
    expect(warnSpy).not.toHaveBeenCalled();

    const latestRun = new RunsRepository().listByJob(job.id, 1)[0];
    expect(latestRun?.status).toBe('skipped');
  });

  it('skips comment scanning when monitorComments is false', async () => {
    const jobsRepo = new JobsRepository();
    const job = jobsRepo.create({
      name: `no-comments-${Date.now()}`,
      description: 'desc',
      qualificationPrompt: 'prompt',
      subreddits: ['askreddit'],
      monitorComments: false
    });

    jest.spyOn(secretStore, 'getOpenRouterApiKey').mockResolvedValue('openrouter-key');
    jest.spyOn(redditClient, 'getRecentSubredditPosts').mockResolvedValue([
      {
        id: 'post-no-comments',
        subreddit: 'askreddit',
        title: 'first',
        body: 'body 1',
        author: 'author-1',
        url: 'https://reddit.com/post-no-comments',
        postedAt: '2026-01-01T00:00:00.000Z'
      }
    ]);
    const commentsSpy = jest.spyOn(redditClient, 'getRedditPostComments');
    jest.spyOn(OpenRouterClient.prototype, 'qualifyPost').mockResolvedValue({
      qualified: true,
      reason: 'matched',
      promptTokens: 10,
      completionTokens: 5
    });

    const runner = new JobRunner();
    await runner.run(job);

    expect(commentsSpy).not.toHaveBeenCalled();
    const latestRun = new RunsRepository().listByJob(job.id, 1)[0];
    expect(latestRun?.status).toBe('completed');
    expect(latestRun?.estimatedCostUsd).not.toBeNull();
  });

  it('emits existing status for already-scanned posts and comments', async () => {
    const jobsRepo = new JobsRepository();
    const runsRepo = new RunsRepository();
    const job = jobsRepo.create({
      name: `existing-items-${Date.now()}`,
      description: 'desc',
      qualificationPrompt: 'prompt',
      subreddits: ['askreddit'],
      monitorComments: true
    });

    const seedRunId = runsRepo.startRun(job.id);
    getDb()
      .prepare(
        `INSERT INTO scan_items (
          id, job_id, run_id, type, reddit_post_id, reddit_comment_id, subreddit,
          author, title, body, url, reddit_posted_at, qualified, qualification_reason, created_at
        ) VALUES (?, ?, ?, 'post', ?, NULL, ?, ?, ?, ?, ?, ?, 0, ?, datetime('now'))`
      )
      .run(
        `seed-post-${Date.now()}`,
        job.id,
        seedRunId,
        'existing-post',
        'askreddit',
        'author',
        'title',
        'body',
        'https://reddit.com/existing-post',
        new Date().toISOString(),
        'already scanned'
      );
    getDb()
      .prepare(
        `INSERT INTO scan_items (
          id, job_id, run_id, type, reddit_post_id, reddit_comment_id, subreddit,
          author, title, body, url, reddit_posted_at, qualified, qualification_reason, created_at
        ) VALUES (?, ?, ?, 'comment', ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, datetime('now'))`
      )
      .run(
        `seed-comment-${Date.now()}`,
        job.id,
        seedRunId,
        'existing-post',
        'existing-comment',
        'askreddit',
        'commenter',
        'title',
        'body',
        'https://reddit.com/existing-post',
        new Date().toISOString(),
        'already scanned'
      );

    jest.spyOn(secretStore, 'getOpenRouterApiKey').mockResolvedValue('openrouter-key');
    jest.spyOn(redditClient, 'getRecentSubredditPosts').mockResolvedValue([
      {
        id: 'existing-post',
        subreddit: 'askreddit',
        title: 'existing',
        body: 'body',
        author: 'author-1',
        url: 'https://reddit.com/existing-post',
        postedAt: '2026-01-01T00:00:00.000Z'
      }
    ]);
    jest.spyOn(redditClient, 'getRedditPostComments').mockResolvedValue([
      {
        id: 'existing-comment',
        author: 'commenter',
        body: 'already scanned',
        replies: []
      }
    ]);
    const qualifyPostSpy = jest.spyOn(OpenRouterClient.prototype, 'qualifyPost');
    const qualifyCommentSpy = jest.spyOn(OpenRouterClient.prototype, 'qualifyCommentThread');

    const events: Array<{ type: string; status?: string }> = [];
    const runner = new JobRunner();
    await runner.run(job, {
      onProgress: (event) => {
        events.push({
          type: event.type,
          status: 'status' in event ? event.status : undefined
        });
      }
    });

    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'post_scanned', status: 'existing' }),
        expect.objectContaining({ type: 'comment_scanned', status: 'existing' })
      ])
    );
    expect(qualifyPostSpy).not.toHaveBeenCalled();
    expect(qualifyCommentSpy).not.toHaveBeenCalled();
  });

  it('marks run as failed when subreddit fetch throws', async () => {
    const jobsRepo = new JobsRepository();
    const job = jobsRepo.create({
      name: `run-failure-${Date.now()}`,
      description: 'desc',
      qualificationPrompt: 'prompt',
      subreddits: ['askreddit'],
      monitorComments: true
    });

    jest.spyOn(secretStore, 'getOpenRouterApiKey').mockResolvedValue('openrouter-key');
    jest.spyOn(redditClient, 'getRecentSubredditPosts').mockRejectedValue(new Error('reddit failure'));

    const events: string[] = [];
    const runner = new JobRunner();
    await runner.run(job, {
      onProgress: (event) => events.push(event.type)
    });

    expect(events).toContain('run_failed');
    const latestRun = new RunsRepository().listByJob(job.id, 1)[0];
    expect(latestRun?.status).toBe('failed');
    expect(latestRun?.message).toBe('reddit failure');
  });

  it('increments qualified count when a comment qualifies', async () => {
    const jobsRepo = new JobsRepository();
    const job = jobsRepo.create({
      name: `qualified-comment-${Date.now()}`,
      description: 'desc',
      qualificationPrompt: 'prompt',
      subreddits: ['askreddit'],
      monitorComments: true
    });

    jest.spyOn(secretStore, 'getOpenRouterApiKey').mockResolvedValue('openrouter-key');
    jest.spyOn(redditClient, 'getRecentSubredditPosts').mockResolvedValue([
      {
        id: 'post-qualified-comment',
        subreddit: 'askreddit',
        title: 'first',
        body: 'body 1',
        author: 'author-1',
        url: 'https://reddit.com/post-qualified-comment',
        postedAt: '2026-01-01T00:00:00.000Z'
      }
    ]);
    jest.spyOn(redditClient, 'getRedditPostComments').mockResolvedValue([
      {
        id: 'comment-qualified',
        author: 'commenter',
        body: 'please help with GTM',
        replies: []
      }
    ]);
    jest.spyOn(OpenRouterClient.prototype, 'qualifyPost').mockResolvedValue({
      qualified: false,
      reason: 'post not matched',
      promptTokens: 10,
      completionTokens: 2
    });
    jest.spyOn(OpenRouterClient.prototype, 'qualifyCommentThread').mockResolvedValue({
      qualified: true,
      reason: 'comment matched',
      promptTokens: 25,
      completionTokens: 5
    });

    const runner = new JobRunner();
    await runner.run(job);

    const latestRun = new RunsRepository().listByJob(job.id, 1)[0];
    expect(latestRun?.itemsQualified).toBe(1);
  });

  it('emits limit_reached inside comment-thread loop after first new comment', async () => {
    const jobsRepo = new JobsRepository();
    const job = jobsRepo.create({
      name: `comment-loop-limit-${Date.now()}`,
      description: 'desc',
      qualificationPrompt: 'prompt',
      subreddits: ['askreddit'],
      monitorComments: true
    });

    jest.spyOn(secretStore, 'getOpenRouterApiKey').mockResolvedValue('openrouter-key');
    jest.spyOn(redditClient, 'getRecentSubredditPosts').mockResolvedValue([
      {
        id: 'post-limit-comments',
        subreddit: 'askreddit',
        title: 'first',
        body: 'body 1',
        author: 'author-1',
        url: 'https://reddit.com/post-limit-comments',
        postedAt: '2026-01-01T00:00:00.000Z'
      }
    ]);
    jest.spyOn(redditClient, 'getRedditPostComments').mockResolvedValue([
      {
        id: 'a1',
        author: 'same-author',
        body: 'first thread',
        replies: []
      },
      {
        id: 'a2',
        author: 'same-author',
        body: 'second thread',
        replies: []
      }
    ]);
    jest.spyOn(OpenRouterClient.prototype, 'qualifyPost').mockResolvedValue({
      qualified: false,
      reason: 'post not matched',
      promptTokens: 10,
      completionTokens: 2
    });
    jest.spyOn(OpenRouterClient.prototype, 'qualifyCommentThread').mockResolvedValue({
      qualified: false,
      reason: 'not matched',
      promptTokens: 15,
      completionTokens: 3
    });

    const events: string[] = [];
    const runner = new JobRunner();
    await runner.run(job, {
      maxNewItems: 2,
      onProgress: (event) => events.push(event.type)
    });

    expect(events).toContain('limit_reached');
  });

  it('sends a notification when notificationsEnabled is true', async () => {
    const settingsRepo = new SettingsRepository();
    settingsRepo.setAppSettings({
      model: 'moonshotai/kimi-k2.5',
      modelSettings: { temperature: 0.2, maxTokens: 500, topP: 1 },
      cronIntervalMinutes: 30,
      jobTimeoutMs: 600000,
      notificationsEnabled: true
    });

    const jobsRepo = new JobsRepository();
    const job = jobsRepo.create({
      name: `notify-enabled-${Date.now()}`,
      description: 'desc',
      qualificationPrompt: 'prompt',
      subreddits: ['askreddit'],
      monitorComments: false
    });

    jest.spyOn(secretStore, 'getOpenRouterApiKey').mockResolvedValue('openrouter-key');
    jest.spyOn(redditClient, 'getRecentSubredditPosts').mockResolvedValue([
      { id: 'post-n1', subreddit: 'askreddit', title: 'title', body: 'body', author: 'author', url: 'https://reddit.com/n1', postedAt: '2026-01-01T00:00:00.000Z' }
    ]);
    jest.spyOn(OpenRouterClient.prototype, 'qualifyPost').mockResolvedValue({ qualified: true, reason: 'matched', promptTokens: 10, completionTokens: 5 });
    const notifySpy = jest.spyOn(notify, 'sendJobNotification').mockImplementation(() => {});

    const runner = new JobRunner();
    await runner.run(job);

    expect(notifySpy).toHaveBeenCalledTimes(1);
    expect(notifySpy).toHaveBeenCalledWith(expect.objectContaining({
      jobName: job.name,
      qualifiedCount: 1
    }));
  });

  it('does not send a notification when notificationsEnabled is false', async () => {
    const settingsRepo = new SettingsRepository();
    settingsRepo.setAppSettings({
      model: 'moonshotai/kimi-k2.5',
      modelSettings: { temperature: 0.2, maxTokens: 500, topP: 1 },
      cronIntervalMinutes: 30,
      jobTimeoutMs: 600000,
      notificationsEnabled: false
    });

    const jobsRepo = new JobsRepository();
    const job = jobsRepo.create({
      name: `notify-disabled-${Date.now()}`,
      description: 'desc',
      qualificationPrompt: 'prompt',
      subreddits: ['askreddit'],
      monitorComments: false
    });

    jest.spyOn(secretStore, 'getOpenRouterApiKey').mockResolvedValue('openrouter-key');
    jest.spyOn(redditClient, 'getRecentSubredditPosts').mockResolvedValue([
      { id: 'post-n2', subreddit: 'askreddit', title: 'title', body: 'body', author: 'author', url: 'https://reddit.com/n2', postedAt: '2026-01-01T00:00:00.000Z' }
    ]);
    jest.spyOn(OpenRouterClient.prototype, 'qualifyPost').mockResolvedValue({ qualified: true, reason: 'matched', promptTokens: 10, completionTokens: 5 });
    const notifySpy = jest.spyOn(notify, 'sendJobNotification').mockImplementation(() => {});

    const runner = new JobRunner();
    await runner.run(job);

    expect(notifySpy).not.toHaveBeenCalled();
  });
});

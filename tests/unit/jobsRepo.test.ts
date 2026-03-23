import fs from 'node:fs';
import path from 'node:path';
import { JobsRepository } from '../../src/services/db/repositories/jobsRepo.js';
import { getDb } from '../../src/services/db/sqlite.js';
import { RunsRepository } from '../../src/services/db/repositories/runsRepo.js';
import { ScanItemsRepository } from '../../src/services/db/repositories/scanItemsRepo.js';
import { ensureAppDirs } from '../../src/utils/paths.js';

describe('JobsRepository', () => {
  it('creates and lists jobs', () => {
    const repo = new JobsRepository();
    const created = repo.create({
      name: `job-${Date.now()}`,
      description: 'test',
      qualificationPrompt: 'test prompt',
      subreddits: ['askreddit']
    });

    expect(created.id).toBeTruthy();
    expect(created.slug).toBeTruthy();
    expect(repo.list().some((item) => item.id === created.id)).toBe(true);
    expect(repo.getByRef(created.slug)?.id).toBe(created.id);
    expect(repo.getByRef(created.id)?.slug).toBe(created.slug);
  });

  it('creates unique slugs and toggles enabled state by id/ref', () => {
    const repo = new JobsRepository();
    const first = repo.create({
      name: `My Job ${Date.now()}`,
      description: 'test',
      qualificationPrompt: 'prompt',
      subreddits: ['askreddit']
    });
    const second = repo.create({
      name: `Another Job ${Date.now()}`,
      slug: first.slug,
      description: 'test-2',
      qualificationPrompt: 'prompt',
      subreddits: ['typescript']
    });

    expect(second.slug).not.toBe(first.slug);

    repo.setEnabled(first.id, false);
    expect(repo.getById(first.id)?.enabled).toBe(false);
    expect(repo.listEnabled().some((item) => item.id === first.id)).toBe(false);

    const toggled = repo.setEnabledByRef(second.slug, false);
    expect(toggled?.enabled).toBe(false);
    expect(repo.setEnabledByRef('missing-ref', true)).toBeNull();
  });

  it('appends an incrementing index for repeated slug collisions', () => {
    const repo = new JobsRepository();

    const first = repo.create({
      name: `Collision Source ${Date.now()}`,
      slug: '  Fancy Startup Alerts  ',
      description: 'test',
      qualificationPrompt: 'prompt',
      subreddits: ['askreddit']
    });
    const second = repo.create({
      name: `Collision Source ${Date.now()}-2`,
      slug: 'fancy startup alerts',
      description: 'test',
      qualificationPrompt: 'prompt',
      subreddits: ['typescript']
    });
    const third = repo.create({
      name: `Collision Source ${Date.now()}-3`,
      slug: 'Fancy   Startup   Alerts!!!',
      description: 'test',
      qualificationPrompt: 'prompt',
      subreddits: ['node']
    });

    expect(first.slug).toBe('fancy-startup-alerts');
    expect(second.slug).toBe('fancy-startup-alerts-2');
    expect(third.slug).toBe('fancy-startup-alerts-3');
  });

  it('deletes related runs and scan items when a job is removed', () => {
    const db = getDb();
    const jobsRepo = new JobsRepository();
    const runsRepo = new RunsRepository();
    const scanItemsRepo = new ScanItemsRepository();

    const created = jobsRepo.create({
      name: `delete-cascade-${Date.now()}`,
      description: 'test',
      qualificationPrompt: 'test prompt',
      subreddits: ['askreddit']
    });

    const paths = ensureAppDirs();
    const logFilePath = path.join(paths.logsDir, `run-delete-cascade-${Date.now()}.log`);
    fs.writeFileSync(logFilePath, 'test run log');

    const runId = runsRepo.startRun(created.id, logFilePath);
    runsRepo.completeRun(runId, {
      itemsDiscovered: 1,
      itemsNew: 1,
      itemsQualified: 1,
      promptTokens: 10,
      completionTokens: 5,
      estimatedCostUsd: 0.0001
    });

    scanItemsRepo.create({
      jobId: created.id,
      runId,
      type: 'post',
      redditPostId: 'delete-cascade-post',
      redditCommentId: null,
      subreddit: 'askreddit',
      author: 'author',
      title: 'title',
      body: 'body',
      url: 'https://reddit.com/delete-cascade-post',
      redditPostedAt: new Date().toISOString(),
      qualified: true,
      qualificationReason: 'match'
    });

    expect(runsRepo.listByJob(created.id).length).toBeGreaterThan(0);
    expect(scanItemsRepo.existsPost(created.id, 'delete-cascade-post')).toBe(true);

    const removed = jobsRepo.removeByRef(created.slug);
    expect(removed?.id).toBe(created.id);
    expect(jobsRepo.getById(created.id)).toBeNull();
    expect(runsRepo.listByJob(created.id)).toHaveLength(0);
    expect(fs.existsSync(logFilePath)).toBe(false);

    const remainingScanItems = db
      .prepare('SELECT COUNT(*) as count FROM scan_items WHERE job_id = ?')
      .get(created.id) as { count: number };
    expect(remainingScanItems.count).toBe(0);
  });

  it('returns null when removing by unknown ref', () => {
    const repo = new JobsRepository();
    expect(repo.removeByRef('does-not-exist')).toBeNull();
  });
});

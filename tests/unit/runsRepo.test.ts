import crypto from 'node:crypto';
import { getDb } from '../../src/services/db/sqlite.js';
import { RunsRepository } from '../../src/services/db/repositories/runsRepo.js';

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
  });
});

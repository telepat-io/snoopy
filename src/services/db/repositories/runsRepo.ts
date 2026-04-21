import crypto from 'node:crypto';
import { getDb } from '../sqlite.js';

export class ActiveRunConflictError extends Error {
  readonly jobId: string;

  constructor(jobId: string) {
    super(`A run is already active for job ${jobId}.`);
    this.name = 'ActiveRunConflictError';
    this.jobId = jobId;
  }
}

export interface RunStats {
  itemsDiscovered: number;
  itemsNew: number;
  itemsQualified: number;
  promptTokens: number;
  completionTokens: number;
  estimatedCostUsd: number | null;
}

export interface RunRow {
  id: string;
  jobId: string;
  jobName: string | null;
  jobSlug: string | null;
  status: string;
  message: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
  itemsDiscovered: number;
  itemsNew: number;
  itemsQualified: number;
  promptTokens: number;
  completionTokens: number;
  estimatedCostUsd: number | null;
  logFilePath: string | null;
}

export interface RunAnalyticsRow extends RunRow {
  newPosts: number;
  newComments: number;
}

interface RunAnalyticsFilter {
  jobId?: string;
  days: number;
  limit?: number;
}

export class RunsRepository {
  private readonly db = getDb();

  private readonly runSelectWithJob = `SELECT
           jr.id as id,
           jr.job_id as jobId,
           j.name as jobName,
           j.slug as jobSlug,
           jr.status as status,
           jr.message as message,
           jr.started_at as startedAt,
           jr.finished_at as finishedAt,
           jr.created_at as createdAt,
           jr.items_discovered as itemsDiscovered,
           jr.items_new as itemsNew,
           jr.items_qualified as itemsQualified,
           jr.prompt_tokens as promptTokens,
           jr.completion_tokens as completionTokens,
           jr.estimated_cost_usd as estimatedCostUsd,
           jr.log_file_path as logFilePath
         FROM job_runs jr
         LEFT JOIN jobs j ON j.id = jr.job_id`;

  private buildRunFilter(filter: { jobId?: string; days: number }): { clause: string; params: Array<string | number> } {
    const params: Array<string | number> = [`-${filter.days} days`];
    const conditions = ["datetime(jr.created_at) >= datetime('now', ?)"];

    if (filter.jobId) {
      conditions.push('jr.job_id = ?');
      params.push(filter.jobId);
    }

    return {
      clause: `WHERE ${conditions.join(' AND ')}`,
      params
    };
  }

  addRun(jobId: string, status: string, message: string): void {
    this.db
      .prepare(
        `INSERT INTO job_runs (id, job_id, status, message, created_at)
         VALUES (?, ?, ?, ?, datetime('now'))`
      )
      .run(crypto.randomUUID(), jobId, status, message);
  }

  startRun(jobId: string, logFilePath?: string): string {
    const id = crypto.randomUUID();

    try {
      this.db
        .prepare(
          `INSERT INTO job_runs (
            id,
            job_id,
            status,
            started_at,
            created_at,
            log_file_path
          ) VALUES (?, ?, 'running', datetime('now'), datetime('now'), ?)`
        )
        .run(id, jobId, logFilePath ?? null);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('idx_job_runs_active_job') || message.includes('UNIQUE constraint failed: job_runs.job_id')) {
        throw new ActiveRunConflictError(jobId);
      }
      throw error;
    }

    return id;
  }

  completeRun(runId: string, stats: RunStats): void {
    this.db
      .prepare(
        `UPDATE job_runs
         SET status = 'completed',
             finished_at = datetime('now'),
             items_discovered = ?,
             items_new = ?,
             items_qualified = ?,
             prompt_tokens = ?,
             completion_tokens = ?,
             estimated_cost_usd = ?
         WHERE id = ?`
      )
      .run(
        stats.itemsDiscovered,
        stats.itemsNew,
        stats.itemsQualified,
        stats.promptTokens,
        stats.completionTokens,
        stats.estimatedCostUsd,
        runId
      );
  }

  failRun(runId: string, message: string): void {
    this.db
      .prepare(
        `UPDATE job_runs
         SET status = 'failed',
             message = ?,
             finished_at = datetime('now')
         WHERE id = ?`
      )
      .run(message, runId);
  }

  setLogFilePath(runId: string, logFilePath: string): void {
    this.db
      .prepare(
        `UPDATE job_runs
         SET log_file_path = ?
         WHERE id = ?`
      )
      .run(logFilePath, runId);
  }

  getById(runId: string): RunRow | null {
    const row = this.db
      .prepare(
        `${this.runSelectWithJob}
         WHERE jr.id = ?
         LIMIT 1`
      )
      .get(runId) as RunRow | undefined;

    return row ?? null;
  }

  latest(limit = 20): Array<{ jobId: string; status: string; message: string; createdAt: string }> {
    return this.db
      .prepare(
        `SELECT job_id as jobId, status, message, created_at as createdAt
         FROM job_runs
         ORDER BY created_at DESC
         LIMIT ?`
      )
      .all(limit) as Array<{ jobId: string; status: string; message: string; createdAt: string }>;
  }

  listByJob(jobId: string, limit = 20): RunRow[] {
    return this.db
      .prepare(
        `${this.runSelectWithJob}
         WHERE jr.job_id = ?
         ORDER BY jr.created_at DESC
         LIMIT ?`
      )
      .all(jobId, limit) as RunRow[];
  }

  latestWithJobNames(limit = 20): RunRow[] {
    return this.db
      .prepare(
        `${this.runSelectWithJob}
         ORDER BY jr.created_at DESC
         LIMIT ?`
      )
      .all(limit) as RunRow[];
  }

  countByJob(jobId: string): number {
    const row = this.db
      .prepare(
        `SELECT COUNT(*) as count
         FROM job_runs
         WHERE job_id = ?`
      )
      .get(jobId) as { count: number } | undefined;

    return Number(row?.count ?? 0);
  }

  countAll(): number {
    const row = this.db
      .prepare(
        `SELECT COUNT(*) as count
         FROM job_runs`
      )
      .get() as { count: number } | undefined;

    return Number(row?.count ?? 0);
  }

  listByJobPage(jobId: string, limit: number, offset: number): RunRow[] {
    const boundedLimit = Math.max(1, Math.floor(limit));
    const boundedOffset = Math.max(0, Math.floor(offset));

    return this.db
      .prepare(
        `${this.runSelectWithJob}
         WHERE jr.job_id = ?
         ORDER BY jr.created_at DESC
         LIMIT ? OFFSET ?`
      )
      .all(jobId, boundedLimit, boundedOffset) as RunRow[];
  }

  latestWithJobNamesPage(limit: number, offset: number): RunRow[] {
    const boundedLimit = Math.max(1, Math.floor(limit));
    const boundedOffset = Math.max(0, Math.floor(offset));

    return this.db
      .prepare(
        `${this.runSelectWithJob}
         ORDER BY jr.created_at DESC
         LIMIT ? OFFSET ?`
      )
      .all(boundedLimit, boundedOffset) as RunRow[];
  }

  getByJobIndex(jobId: string, index: number): RunRow | null {
    const rows = this.listByJobPage(jobId, 1, index);
    return rows[0] ?? null;
  }

  getLatestWithJobNamesByIndex(index: number): RunRow | null {
    const rows = this.latestWithJobNamesPage(1, index);
    return rows[0] ?? null;
  }

  listAnalyticsRuns(filter: RunAnalyticsFilter): RunAnalyticsRow[] {
    const { clause, params } = this.buildRunFilter(filter);
    const limit = filter.limit ?? 20;

    return this.db
      .prepare(
        `SELECT
           jr.id as id,
           jr.job_id as jobId,
           j.name as jobName,
           jr.status as status,
           jr.message as message,
           jr.started_at as startedAt,
           jr.finished_at as finishedAt,
           jr.created_at as createdAt,
           jr.items_discovered as itemsDiscovered,
           jr.items_new as itemsNew,
           jr.items_qualified as itemsQualified,
           jr.prompt_tokens as promptTokens,
           jr.completion_tokens as completionTokens,
           jr.estimated_cost_usd as estimatedCostUsd,
           jr.log_file_path as logFilePath,
           COALESCE(SUM(CASE WHEN si.type = 'post' THEN 1 ELSE 0 END), 0) as newPosts,
           COALESCE(SUM(CASE WHEN si.type = 'comment' THEN 1 ELSE 0 END), 0) as newComments
         FROM job_runs jr
         LEFT JOIN jobs j ON j.id = jr.job_id
         LEFT JOIN scan_items si ON si.run_id = jr.id
         ${clause}
         GROUP BY jr.id
         ORDER BY datetime(jr.created_at) DESC
         LIMIT ?`
      )
      .all(...params, limit) as RunAnalyticsRow[];
  }

  countRuns(filter: { jobId?: string; days: number }): number {
    const { clause, params } = this.buildRunFilter(filter);
    const row = this.db
      .prepare(
        `SELECT COUNT(*) as runCount
         FROM job_runs jr
         ${clause}`
      )
      .get(...params) as { runCount: number } | undefined;

    return Number(row?.runCount ?? 0);
  }
}

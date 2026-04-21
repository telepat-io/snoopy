import crypto from 'node:crypto';
import fs from 'node:fs';
import { getDb } from '../sqlite.js';
import type { Job, NewJob } from '../../../types/job.js';

function toSlug(value: string): string {
  const cleaned = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return cleaned.slice(0, 40) || 'job';
}

function mapRow(row: Record<string, unknown>): Job {
  return {
    id: String(row.id),
    slug: String(row.slug),
    name: String(row.name),
    description: String(row.description),
    qualificationPrompt: String(row.qualification_prompt),
    subreddits: JSON.parse(String(row.subreddits_json)) as string[],
    scheduleCron: String(row.schedule_cron),
    enabled: Number(row.enabled) === 1,
    monitorComments: row.monitor_comments === undefined ? true : Number(row.monitor_comments) === 1,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at)
  };
}

export interface JobSummaryRow {
  jobId: string;
  jobSlug: string;
  jobName: string;
  enabled: number;
  description: string;
  subredditsJson: string;
  scheduleCron: string;
  lastRunAt: string | null;
  totalScanned: number;
  totalQualified: number;
  totalCostUsd: number;
  runCount: number;
}

export class JobsRepository {
  private readonly db = getDb();
  private readonly removeCascadeStmt = this.db.transaction((jobId: string) => {
    const runLogs = this.db
      .prepare(
        `SELECT log_file_path as logFilePath
         FROM job_runs
         WHERE job_id = ?
           AND log_file_path IS NOT NULL`
      )
      .all(jobId) as Array<{ logFilePath: string | null }>;

    for (const row of runLogs) {
      if (!row.logFilePath) {
        continue;
      }

      try {
        if (fs.existsSync(row.logFilePath)) {
          fs.unlinkSync(row.logFilePath);
        }
      } catch {
        // Ignore filesystem cleanup failures and continue DB cleanup.
      }
    }

    this.db
      .prepare(
        `DELETE FROM comment_thread_nodes
         WHERE scan_item_id IN (
           SELECT id FROM scan_items WHERE job_id = ?
         )`
      )
      .run(jobId);
    this.db.prepare('DELETE FROM scan_items WHERE job_id = ?').run(jobId);
    this.db.prepare('DELETE FROM job_runs WHERE job_id = ?').run(jobId);
    this.db.prepare('DELETE FROM jobs WHERE id = ?').run(jobId);
  });

  constructor() {
    this.backfillMissingSlugs();
  }

  private slugExists(slug: string): boolean {
    const row = this.db
      .prepare('SELECT 1 FROM jobs WHERE slug = ? LIMIT 1')
      .get(slug) as Record<string, unknown> | undefined;
    return Boolean(row);
  }

  private ensureUniqueSlug(base: string): string {
    const normalized = toSlug(base);
    if (!this.slugExists(normalized)) {
      return normalized;
    }

    const basePrefix = normalized.slice(0, 30);
    let counter = 2;
    while (true) {
      const candidate = `${basePrefix}-${counter}`;
      if (!this.slugExists(candidate)) {
        return candidate;
      }
      counter += 1;
    }
  }

  private backfillMissingSlugs(): void {
    const rows = this.db
      .prepare("SELECT id, name FROM jobs WHERE slug IS NULL OR slug = ''")
      .all() as Array<{ id: string; name: string }>;

    rows.forEach((row) => {
      const slug = this.ensureUniqueSlug(row.name);
      this.db.prepare('UPDATE jobs SET slug = ? WHERE id = ?').run(slug, row.id);
    });
  }

  create(input: NewJob): Job {
    const id = crypto.randomUUID();
    const schedule = input.scheduleCron ?? '*/30 * * * *';
    const enabled = input.enabled ?? true;
    const slug = this.ensureUniqueSlug(input.slug ?? input.name);

    const monitorComments = input.monitorComments ?? true;

    this.db
      .prepare(
        `INSERT INTO jobs (
          id, slug, name, description, qualification_prompt, subreddits_json,
          schedule_cron, enabled, monitor_comments, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
      )
      .run(
        id,
        slug,
        input.name,
        input.description,
        input.qualificationPrompt,
        JSON.stringify(input.subreddits),
        schedule,
        enabled ? 1 : 0,
        monitorComments ? 1 : 0
      );

    return this.getById(id)!;
  }

  getById(id: string): Job | null {
    const row = this.db.prepare('SELECT * FROM jobs WHERE id = ?').get(id) as
      | Record<string, unknown>
      | undefined;
    return row ? mapRow(row) : null;
  }

  getBySlug(slug: string): Job | null {
    const row = this.db.prepare('SELECT * FROM jobs WHERE slug = ?').get(slug) as
      | Record<string, unknown>
      | undefined;
    return row ? mapRow(row) : null;
  }

  getByRef(ref: string): Job | null {
    return this.getById(ref) ?? this.getBySlug(ref);
  }

  list(): Job[] {
    const rows = this.db.prepare('SELECT * FROM jobs ORDER BY created_at DESC').all() as Record<string, unknown>[];
    return rows.map(mapRow);
  }

  listEnabled(): Job[] {
    const rows = this.db
      .prepare('SELECT * FROM jobs WHERE enabled = 1 ORDER BY created_at DESC')
      .all() as Record<string, unknown>[];
    return rows.map(mapRow);
  }

  setEnabled(id: string, enabled: boolean): void {
    this.db
      .prepare(
        `UPDATE jobs
         SET enabled = ?, updated_at = datetime('now')
         WHERE id = ?`
      )
      .run(enabled ? 1 : 0, id);
  }

  setEnabledByRef(ref: string, enabled: boolean): Job | null {
    const job = this.getByRef(ref);
    if (!job) {
      return null;
    }

    this.setEnabled(job.id, enabled);
    return this.getById(job.id);
  }

  remove(id: string): void {
    this.removeCascadeStmt(id);
  }

  removeByRef(ref: string): Job | null {
    const job = this.getByRef(ref);
    if (!job) {
      return null;
    }

    this.remove(job.id);
    return job;
  }

    listWithStats(): JobSummaryRow[] {
      return this.db
        .prepare(
          `SELECT
             j.id as jobId,
             j.slug as jobSlug,
             j.name as jobName,
             j.enabled as enabled,
             j.description as description,
             j.subreddits_json as subredditsJson,
             j.schedule_cron as scheduleCron,
             MAX(COALESCE(jr.finished_at, jr.started_at, jr.created_at)) as lastRunAt,
             COALESCE(SUM(jr.items_new), 0) as totalScanned,
             COALESCE(SUM(jr.items_qualified), 0) as totalQualified,
             COALESCE(SUM(jr.estimated_cost_usd), 0) as totalCostUsd,
             COUNT(jr.id) as runCount
           FROM jobs j
           LEFT JOIN job_runs jr ON jr.job_id = j.id
           GROUP BY j.id
           ORDER BY j.name ASC`
        )
        .all() as JobSummaryRow[];
    }
  }

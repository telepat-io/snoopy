import crypto from 'node:crypto';
import { getDb } from '../sqlite.js';

export type ScanItemType = 'post' | 'comment';

export interface NewScanItem {
  jobId: string;
  runId: string;
  type: ScanItemType;
  redditPostId: string;
  redditCommentId: string | null;
  subreddit: string;
  author: string;
  title: string | null;
  body: string;
  url: string;
  redditPostedAt: string;
  qualified: boolean;
  viewed?: boolean;
  validated?: boolean;
  isValid?: boolean;
  isValidReason?: string | null;
  feedbackConsolidated?: boolean;
  processed?: boolean;
  consumed?: boolean;
  promptTokens?: number;
  completionTokens?: number;
  estimatedCostUsd?: number | null;
  qualificationReason: string | null;
  commentThreadNodes?: NewCommentThreadNode[];
}

export interface NewCommentThreadNode {
  redditCommentId: string;
  parentRedditCommentId: string | null;
  author: string;
  body: string;
  depth: number;
  isTarget: boolean;
}

export interface CommentThreadNodeRow extends NewCommentThreadNode {
  id: string;
  scanItemId: string;
  createdAt: string;
}

export interface QualifiedScanItemRow {
  id: string;
  jobId: string;
  runId: string;
  type: ScanItemType;
  subreddit: string;
  author: string;
  title: string | null;
  body: string;
  url: string;
  redditPostedAt: string;
  viewed: boolean;
  validated: boolean;
  isValid: boolean;
  isValidReason: string | null;
  feedbackConsolidated: boolean;
  processed: boolean;
  consumed: boolean;
  qualificationReason: string | null;
  createdAt: string;
}

export interface ScanItemRow {
  id: string;
  jobId: string;
  runId: string;
  type: ScanItemType;
  redditPostId: string;
  redditCommentId: string | null;
  subreddit: string;
  author: string;
  title: string | null;
  body: string;
  url: string;
  redditPostedAt: string;
  qualified: boolean;
  viewed: boolean;
  validated: boolean;
  isValid: boolean;
  isValidReason: string | null;
  feedbackConsolidated: boolean;
  processed: boolean;
  consumed: boolean;
  qualificationReason: string | null;
  promptTokens: number;
  completionTokens: number;
  estimatedCostUsd: number | null;
  createdAt: string;
}

export interface AnalyticsTotalsRow {
  newPosts: number;
  newComments: number;
  promptTokens: number;
  completionTokens: number;
  estimatedCostUsd: number;
}

export interface AnalyticsBySubredditRow extends AnalyticsTotalsRow {
  subreddit: string;
}

export interface AnalyticsByJobRow extends AnalyticsTotalsRow {
  jobId: string;
  jobName: string;
  jobSlug: string;
}

export interface CreateScanItemResult {
  id: string;
  inserted: boolean;
}

interface AnalyticsFilter {
  jobId?: string;
  days: number;
}

export class ScanItemsRepository {
  private readonly db = getDb();

  private isDedupConflict(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error);
    return message.includes('idx_scan_items_dedup');
  }

  private findExistingScanItemId(jobId: string, postId: string, commentId: string | null): string | null {
    const query = commentId === null
      ? `SELECT id
         FROM scan_items
         WHERE job_id = ?
           AND reddit_post_id = ?
           AND reddit_comment_id IS NULL
         LIMIT 1`
      : `SELECT id
         FROM scan_items
         WHERE job_id = ?
           AND reddit_post_id = ?
           AND reddit_comment_id = ?
         LIMIT 1`;

    const row = commentId === null
      ? (this.db.prepare(query).get(jobId, postId) as { id: string } | undefined)
      : (this.db.prepare(query).get(jobId, postId, commentId) as { id: string } | undefined);

    return row?.id ?? null;
  }

  private mapScanItemRows(
    rows: Array<
      Omit<ScanItemRow, 'qualified' | 'viewed' | 'validated' | 'isValid' | 'feedbackConsolidated' | 'processed' | 'consumed'> & {
          qualified: number;
          viewed: number;
          validated: number;
          isValid: number;
          feedbackConsolidated: number;
          processed: number;
          consumed: number;
        }
    >
  ): ScanItemRow[] {
    return rows.map((row) => ({
      ...row,
      qualified: row.qualified === 1,
      viewed: row.viewed === 1,
      validated: row.validated === 1,
      isValid: row.isValid === 1,
      feedbackConsolidated: row.feedbackConsolidated === 1,
      processed: row.processed === 1,
      consumed: row.consumed === 1
    }));
  }

  private buildFilterClause(alias: string, filter: AnalyticsFilter): { clause: string; params: Array<string | number> } {
    const params: Array<string | number> = [`-${filter.days} days`];
    const conditions = [`datetime(${alias}.created_at) >= datetime('now', ?)`];

    if (filter.jobId) {
      conditions.push(`${alias}.job_id = ?`);
      params.push(filter.jobId);
    }

    return {
      clause: `WHERE ${conditions.join(' AND ')}`,
      params
    };
  }

  private toAnalyticsTotalsRow(row: {
    newPosts: number;
    newComments: number;
    promptTokens: number;
    completionTokens: number;
    estimatedCostUsd: number;
  }): AnalyticsTotalsRow {
    return {
      newPosts: Number(row.newPosts ?? 0),
      newComments: Number(row.newComments ?? 0),
      promptTokens: Number(row.promptTokens ?? 0),
      completionTokens: Number(row.completionTokens ?? 0),
      estimatedCostUsd: Number(row.estimatedCostUsd ?? 0)
    };
  }

  listQualifiedByJob(jobId: string, limit = 100): QualifiedScanItemRow[] {
    const boundedLimit = Math.max(1, Math.floor(limit));
    const rows = this.db
      .prepare(
        `SELECT
           id,
           job_id as jobId,
           run_id as runId,
            type,
            subreddit,
           author,
           title,
           body,
           url,
           reddit_posted_at as redditPostedAt,
           viewed,
           validated,
            is_valid as isValid,
            is_valid_reason as isValidReason,
            feedback_consolidated as feedbackConsolidated,
           processed,
           consumed,
           qualification_reason as qualificationReason,
           created_at as createdAt
         FROM scan_items
         WHERE job_id = ?
           AND qualified = 1
         ORDER BY datetime(reddit_posted_at) DESC, datetime(created_at) DESC, id DESC
         LIMIT ?`
      )
      .all(jobId, boundedLimit) as Array<
        Omit<QualifiedScanItemRow, 'viewed' | 'validated' | 'isValid' | 'feedbackConsolidated' | 'processed' | 'consumed'> & {
          viewed: number;
          validated: number;
          isValid: number;
          feedbackConsolidated: number;
          processed: number;
          consumed: number;
        }
    >;

    return rows.map((row) => ({
      ...row,
      viewed: row.viewed === 1,
      validated: row.validated === 1,
      isValid: row.isValid === 1,
      feedbackConsolidated: row.feedbackConsolidated === 1,
      processed: row.processed === 1,
      consumed: row.consumed === 1
    }));
  }

  listQualifiedByJobRun(jobId: string, runId: string, limit = 100): QualifiedScanItemRow[] {
    const boundedLimit = Math.max(1, Math.floor(limit));
    const rows = this.db
      .prepare(
        `SELECT
           id,
           job_id as jobId,
           run_id as runId,
            type,
            subreddit,
           author,
           title,
           body,
           url,
           reddit_posted_at as redditPostedAt,
           viewed,
           validated,
            is_valid as isValid,
            is_valid_reason as isValidReason,
            feedback_consolidated as feedbackConsolidated,
           processed,
           consumed,
           qualification_reason as qualificationReason,
           created_at as createdAt
         FROM scan_items
         WHERE job_id = ?
           AND run_id = ?
           AND qualified = 1
         ORDER BY datetime(reddit_posted_at) DESC, datetime(created_at) DESC, id DESC
         LIMIT ?`
      )
      .all(jobId, runId, boundedLimit) as Array<
        Omit<QualifiedScanItemRow, 'viewed' | 'validated' | 'isValid' | 'feedbackConsolidated' | 'processed' | 'consumed'> & {
          viewed: number;
          validated: number;
          isValid: number;
          feedbackConsolidated: number;
          processed: number;
          consumed: number;
        }
    >;

    return rows.map((row) => ({
      ...row,
      viewed: row.viewed === 1,
      validated: row.validated === 1,
      isValid: row.isValid === 1,
      feedbackConsolidated: row.feedbackConsolidated === 1,
      processed: row.processed === 1,
      consumed: row.consumed === 1
    }));
  }

  listByJob(jobId: string): ScanItemRow[] {
    const rows = this.db
      .prepare(
        `SELECT
           id,
           job_id as jobId,
           run_id as runId,
           type,
           reddit_post_id as redditPostId,
           reddit_comment_id as redditCommentId,
           subreddit,
           author,
           title,
           body,
           url,
           reddit_posted_at as redditPostedAt,
           qualified,
           viewed,
           validated,
           is_valid as isValid,
           is_valid_reason as isValidReason,
           feedback_consolidated as feedbackConsolidated,
           processed,
           consumed,
           qualification_reason as qualificationReason,
           prompt_tokens as promptTokens,
           completion_tokens as completionTokens,
           estimated_cost_usd as estimatedCostUsd,
           created_at as createdAt
         FROM scan_items
         WHERE job_id = ?
         ORDER BY datetime(reddit_posted_at) DESC, datetime(created_at) DESC, id DESC`
      )
      .all(jobId) as Array<
        Omit<ScanItemRow, 'qualified' | 'viewed' | 'validated' | 'isValid' | 'feedbackConsolidated' | 'processed' | 'consumed'> & {
          qualified: number;
          viewed: number;
          validated: number;
          isValid: number;
          feedbackConsolidated: number;
          processed: number;
          consumed: number;
        }
    >;

    return this.mapScanItemRows(rows);
  }

  countByJob(jobId: string): number {
    const row = this.db
      .prepare(
        `SELECT COUNT(*) as count
         FROM scan_items
         WHERE job_id = ?`
      )
      .get(jobId) as { count: number } | undefined;

    return Number(row?.count ?? 0);
  }

  listByJobPage(jobId: string, limit: number, offset: number): ScanItemRow[] {
    const boundedLimit = Math.max(1, Math.floor(limit));
    const boundedOffset = Math.max(0, Math.floor(offset));

    const rows = this.db
      .prepare(
        `SELECT
           id,
           job_id as jobId,
           run_id as runId,
           type,
           reddit_post_id as redditPostId,
           reddit_comment_id as redditCommentId,
           subreddit,
           author,
           title,
           body,
           url,
           reddit_posted_at as redditPostedAt,
           qualified,
           viewed,
           validated,
           is_valid as isValid,
           is_valid_reason as isValidReason,
           feedback_consolidated as feedbackConsolidated,
           processed,
           consumed,
           qualification_reason as qualificationReason,
           prompt_tokens as promptTokens,
           completion_tokens as completionTokens,
           estimated_cost_usd as estimatedCostUsd,
           created_at as createdAt
         FROM scan_items
         WHERE job_id = ?
         ORDER BY datetime(reddit_posted_at) DESC, datetime(created_at) DESC, id DESC
         LIMIT ? OFFSET ?`
      )
      .all(jobId, boundedLimit, boundedOffset) as Array<
        Omit<ScanItemRow, 'qualified' | 'viewed' | 'validated' | 'isValid' | 'feedbackConsolidated' | 'processed' | 'consumed'> & {
          qualified: number;
          viewed: number;
          validated: number;
          isValid: number;
          feedbackConsolidated: number;
          processed: number;
          consumed: number;
        }
    >;

    return this.mapScanItemRows(rows);
  }

  getByJobIndex(jobId: string, index: number): ScanItemRow | null {
    const rows = this.listByJobPage(jobId, 1, index);
    return rows[0] ?? null;
  }

  existsPost(jobId: string, postId: string): boolean {
    const row = this.db
      .prepare(
        `SELECT 1
         FROM scan_items
         WHERE job_id = ?
           AND reddit_post_id = ?
           AND reddit_comment_id IS NULL
         LIMIT 1`
      )
      .get(jobId, postId) as { 1: number } | undefined;

    return Boolean(row);
  }

  getAnalyticsTotals(filter: AnalyticsFilter): AnalyticsTotalsRow {
    const { clause, params } = this.buildFilterClause('si', filter);
    const row = this.db
      .prepare(
        `SELECT
           COALESCE(SUM(CASE WHEN si.type = 'post' THEN 1 ELSE 0 END), 0) as newPosts,
           COALESCE(SUM(CASE WHEN si.type = 'comment' THEN 1 ELSE 0 END), 0) as newComments,
           COALESCE(SUM(si.prompt_tokens), 0) as promptTokens,
           COALESCE(SUM(si.completion_tokens), 0) as completionTokens,
           COALESCE(SUM(COALESCE(si.estimated_cost_usd, 0)), 0) as estimatedCostUsd
         FROM scan_items si
         ${clause}`
      )
      .get(...params) as
      | {
          newPosts: number;
          newComments: number;
          promptTokens: number;
          completionTokens: number;
          estimatedCostUsd: number;
        }
      | undefined;

    if (!row) {
      return {
        newPosts: 0,
        newComments: 0,
        promptTokens: 0,
        completionTokens: 0,
        estimatedCostUsd: 0
      };
    }

    return this.toAnalyticsTotalsRow(row);
  }

  listAnalyticsBySubreddit(filter: AnalyticsFilter): AnalyticsBySubredditRow[] {
    const { clause, params } = this.buildFilterClause('si', filter);
    const rows = this.db
      .prepare(
        `SELECT
           si.subreddit as subreddit,
           COALESCE(SUM(CASE WHEN si.type = 'post' THEN 1 ELSE 0 END), 0) as newPosts,
           COALESCE(SUM(CASE WHEN si.type = 'comment' THEN 1 ELSE 0 END), 0) as newComments,
           COALESCE(SUM(si.prompt_tokens), 0) as promptTokens,
           COALESCE(SUM(si.completion_tokens), 0) as completionTokens,
           COALESCE(SUM(COALESCE(si.estimated_cost_usd, 0)), 0) as estimatedCostUsd
         FROM scan_items si
         ${clause}
         GROUP BY si.subreddit
         ORDER BY (SUM(CASE WHEN si.type = 'post' THEN 1 ELSE 0 END) + SUM(CASE WHEN si.type = 'comment' THEN 1 ELSE 0 END)) DESC,
                  si.subreddit ASC`
      )
      .all(...params) as Array<{
      subreddit: string;
      newPosts: number;
      newComments: number;
      promptTokens: number;
      completionTokens: number;
      estimatedCostUsd: number;
    }>;

    return rows.map((row) => ({
      subreddit: row.subreddit,
      ...this.toAnalyticsTotalsRow(row)
    }));
  }

  listAnalyticsByJob(days: number): AnalyticsByJobRow[] {
    const params: Array<string | number> = [`-${days} days`];
    const rows = this.db
      .prepare(
        `SELECT
           si.job_id as jobId,
           j.name as jobName,
           j.slug as jobSlug,
           COALESCE(SUM(CASE WHEN si.type = 'post' THEN 1 ELSE 0 END), 0) as newPosts,
           COALESCE(SUM(CASE WHEN si.type = 'comment' THEN 1 ELSE 0 END), 0) as newComments,
           COALESCE(SUM(si.prompt_tokens), 0) as promptTokens,
           COALESCE(SUM(si.completion_tokens), 0) as completionTokens,
           COALESCE(SUM(COALESCE(si.estimated_cost_usd, 0)), 0) as estimatedCostUsd
         FROM scan_items si
         INNER JOIN jobs j ON j.id = si.job_id
         WHERE datetime(si.created_at) >= datetime('now', ?)
         GROUP BY si.job_id, j.name, j.slug
         ORDER BY (SUM(CASE WHEN si.type = 'post' THEN 1 ELSE 0 END) + SUM(CASE WHEN si.type = 'comment' THEN 1 ELSE 0 END)) DESC,
                  j.name ASC`
      )
      .all(...params) as Array<{
      jobId: string;
      jobName: string;
      jobSlug: string;
      newPosts: number;
      newComments: number;
      promptTokens: number;
      completionTokens: number;
      estimatedCostUsd: number;
    }>;

    return rows.map((row) => ({
      jobId: row.jobId,
      jobName: row.jobName,
      jobSlug: row.jobSlug,
      ...this.toAnalyticsTotalsRow(row)
    }));
  }

  existsComment(jobId: string, postId: string, commentId: string): boolean {
    const row = this.db
      .prepare(
        `SELECT 1
         FROM scan_items
         WHERE job_id = ?
           AND reddit_post_id = ?
           AND reddit_comment_id = ?
         LIMIT 1`
      )
      .get(jobId, postId, commentId) as { 1: number } | undefined;

    return Boolean(row);
  }

  listUnconsumedQualified(jobId?: string, limit?: number): QualifiedScanItemRow[] {
    const hasJobId = Boolean(jobId);
    const hasLimit = limit !== undefined && limit !== null;
    const boundedLimit = hasLimit ? Math.max(1, Math.floor(limit)) : undefined;

    let query = `SELECT
           id,
           job_id as jobId,
           run_id as runId,
          type,
          subreddit,
           author,
           title,
           body,
           url,
           reddit_posted_at as redditPostedAt,
           viewed,
           validated,
          is_valid as isValid,
          is_valid_reason as isValidReason,
          feedback_consolidated as feedbackConsolidated,
           processed,
           consumed,
           qualification_reason as qualificationReason,
           created_at as createdAt
         FROM scan_items
         WHERE qualified = 1 AND consumed = 0`;

    const params: Array<string | number> = [];

    if (hasJobId) {
      query += ' AND job_id = ?';
      params.push(jobId!);
    }

    query += ' ORDER BY datetime(created_at) DESC, id DESC';

    if (boundedLimit !== undefined) {
      query += ' LIMIT ?';
      params.push(boundedLimit);
    }

    const rows = this.db.prepare(query).all(...params) as Array<
        Omit<QualifiedScanItemRow, 'viewed' | 'validated' | 'isValid' | 'feedbackConsolidated' | 'processed' | 'consumed'> & {
          viewed: number;
          validated: number;
          isValid: number;
          feedbackConsolidated: number;
          processed: number;
          consumed: number;
        }
    >;

    return rows.map((row) => ({
      ...row,
      viewed: row.viewed === 1,
      validated: row.validated === 1,
      isValid: row.isValid === 1,
      feedbackConsolidated: row.feedbackConsolidated === 1,
      processed: row.processed === 1,
      consumed: row.consumed === 1
    }));
  }

  getQualifiedById(id: string): QualifiedScanItemRow | null {
    const rows = this.db
      .prepare(
        `SELECT
           id,
           job_id as jobId,
           run_id as runId,
           type,
           subreddit,
           author,
           title,
           body,
           url,
           reddit_posted_at as redditPostedAt,
           viewed,
           validated,
           is_valid as isValid,
           is_valid_reason as isValidReason,
           feedback_consolidated as feedbackConsolidated,
           processed,
           consumed,
           qualification_reason as qualificationReason,
           created_at as createdAt
         FROM scan_items
         WHERE id = ?
           AND qualified = 1
         LIMIT 1`
      )
      .all(id) as Array<
      Omit<QualifiedScanItemRow, 'viewed' | 'validated' | 'isValid' | 'feedbackConsolidated' | 'processed' | 'consumed'> & {
          viewed: number;
          validated: number;
          isValid: number;
          feedbackConsolidated: number;
          processed: number;
          consumed: number;
        }
    >;

    const row = rows[0];
    if (!row) {
      return null;
    }

    return {
      ...row,
      viewed: row.viewed === 1,
      validated: row.validated === 1,
      isValid: row.isValid === 1,
      feedbackConsolidated: row.feedbackConsolidated === 1,
      processed: row.processed === 1,
      consumed: row.consumed === 1
    };
  }

  listUnvalidatedQualified(jobId?: string, limit = 10): QualifiedScanItemRow[] {
    const boundedLimit = Math.max(1, Math.floor(limit));
    const rows = this.db
      .prepare(
        `SELECT
           id,
           job_id as jobId,
           run_id as runId,
           type,
           subreddit,
           author,
           title,
           body,
           url,
           reddit_posted_at as redditPostedAt,
           viewed,
           validated,
           is_valid as isValid,
           is_valid_reason as isValidReason,
           feedback_consolidated as feedbackConsolidated,
           processed,
           consumed,
           qualification_reason as qualificationReason,
           created_at as createdAt
         FROM scan_items
         WHERE qualified = 1
           AND validated = 0
           ${jobId ? 'AND job_id = ?' : ''}
         ORDER BY datetime(created_at) DESC, id DESC
         LIMIT ?`
      )
      .all(...(jobId ? [jobId, boundedLimit] : [boundedLimit])) as Array<
      Omit<QualifiedScanItemRow, 'viewed' | 'validated' | 'isValid' | 'feedbackConsolidated' | 'processed' | 'consumed'> & {
          viewed: number;
          validated: number;
          isValid: number;
          feedbackConsolidated: number;
          processed: number;
          consumed: number;
        }
    >;

    return rows.map((row) => ({
      ...row,
      viewed: row.viewed === 1,
      validated: row.validated === 1,
      isValid: row.isValid === 1,
      feedbackConsolidated: row.feedbackConsolidated === 1,
      processed: row.processed === 1,
      consumed: row.consumed === 1
    }));
  }

  submitFeedback(resultId: string, isValid: boolean, reason: string | null): boolean {
    const normalizedReason = reason?.trim() ?? null;
    const result = this.db
      .prepare(
        `UPDATE scan_items
         SET validated = 1,
             is_valid = ?,
             is_valid_reason = ?,
             feedback_consolidated = 0
         WHERE id = ?
           AND qualified = 1`
      )
      .run(isValid ? 1 : 0, normalizedReason, resultId);

    return Number(result.changes) > 0;
  }

  listPendingFeedbackConsolidation(jobId?: string, limit?: number): QualifiedScanItemRow[] {
    const hasLimit = limit !== undefined && limit !== null;
    const boundedLimit = hasLimit ? Math.max(1, Math.floor(limit)) : undefined;

    let query = `SELECT
           id,
           job_id as jobId,
           run_id as runId,
           type,
           subreddit,
           author,
           title,
           body,
           url,
           reddit_posted_at as redditPostedAt,
           viewed,
           validated,
           is_valid as isValid,
           is_valid_reason as isValidReason,
           feedback_consolidated as feedbackConsolidated,
           processed,
           consumed,
           qualification_reason as qualificationReason,
           created_at as createdAt
         FROM scan_items
         WHERE qualified = 1
           AND validated = 1
           AND feedback_consolidated = 0`;

    const params: Array<string | number> = [];
    if (jobId) {
      query += ' AND job_id = ?';
      params.push(jobId);
    }

    query += ' ORDER BY datetime(created_at) DESC, id DESC';
    if (boundedLimit !== undefined) {
      query += ' LIMIT ?';
      params.push(boundedLimit);
    }

    const rows = this.db.prepare(query).all(...params) as Array<
      Omit<QualifiedScanItemRow, 'viewed' | 'validated' | 'isValid' | 'feedbackConsolidated' | 'processed' | 'consumed'> & {
          viewed: number;
          validated: number;
          isValid: number;
          feedbackConsolidated: number;
          processed: number;
          consumed: number;
        }
    >;

    return rows.map((row) => ({
      ...row,
      viewed: row.viewed === 1,
      validated: row.validated === 1,
      isValid: row.isValid === 1,
      feedbackConsolidated: row.feedbackConsolidated === 1,
      processed: row.processed === 1,
      consumed: row.consumed === 1
    }));
  }

  countPendingFeedbackConsolidation(jobId?: string): number {
    const row = this.db
      .prepare(
        `SELECT COUNT(*) as count
         FROM scan_items
         WHERE qualified = 1
           AND validated = 1
           AND feedback_consolidated = 0
           ${jobId ? 'AND job_id = ?' : ''}`
      )
      .get(...(jobId ? [jobId] : [])) as { count: number } | undefined;

    return Number(row?.count ?? 0);
  }

  markFeedbackConsolidated(ids: string[]): number {
    if (ids.length === 0) {
      return 0;
    }

    const placeholders = ids.map(() => '?').join(',');
    const result = this.db
      .prepare(`UPDATE scan_items SET feedback_consolidated = 1 WHERE id IN (${placeholders})`)
      .run(...ids);

    return Number(result.changes);
  }

  markConsumed(ids: string[]): number {
    if (ids.length === 0) {
      return 0;
    }

    const placeholders = ids.map(() => '?').join(',');
    const result = this.db
      .prepare(`UPDATE scan_items SET consumed = 1 WHERE id IN (${placeholders})`)
      .run(...ids);

    return Number(result.changes);
  }

  createWithStatus(item: NewScanItem): CreateScanItemResult {
    const id = crypto.randomUUID();

    const createInTransaction = this.db.transaction((newId: string, newItem: NewScanItem): CreateScanItemResult => {
      const insertResult = this.db
        .prepare(
          `INSERT OR IGNORE INTO scan_items (
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
            is_valid,
            is_valid_reason,
            feedback_consolidated,
            processed,
            consumed,
            prompt_tokens,
            completion_tokens,
            estimated_cost_usd,
            qualification_reason,
            created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
        )
        .run(
          newId,
          newItem.jobId,
          newItem.runId,
          newItem.type,
          newItem.redditPostId,
          newItem.redditCommentId,
          newItem.subreddit,
          newItem.author,
          newItem.title,
          newItem.body,
          newItem.url,
          newItem.redditPostedAt,
          newItem.qualified ? 1 : 0,
          newItem.viewed ? 1 : 0,
          newItem.validated ? 1 : 0,
          newItem.isValid ? 1 : 0,
          newItem.isValidReason ?? null,
          newItem.feedbackConsolidated ? 1 : 0,
          newItem.processed ? 1 : 0,
          newItem.consumed ? 1 : 0,
          newItem.promptTokens ?? 0,
          newItem.completionTokens ?? 0,
          newItem.estimatedCostUsd ?? null,
          newItem.qualificationReason
        );

      if (insertResult.changes === 0) {
        const existingId = this.findExistingScanItemId(newItem.jobId, newItem.redditPostId, newItem.redditCommentId);
        return {
          id: existingId ?? newId,
          inserted: false
        };
      }

      for (const node of newItem.commentThreadNodes ?? []) {
        this.db
          .prepare(
            `INSERT INTO comment_thread_nodes (
              id,
              scan_item_id,
              reddit_comment_id,
              parent_reddit_comment_id,
              author,
              body,
              depth,
              is_target,
              created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
          )
          .run(
            crypto.randomUUID(),
            newId,
            node.redditCommentId,
            node.parentRedditCommentId,
            node.author,
            node.body,
            node.depth,
            node.isTarget ? 1 : 0
          );
      }

      return {
        id: newId,
        inserted: true
      };
    });

    try {
      return createInTransaction(id, item);
    } catch (error) {
      if (!this.isDedupConflict(error)) {
        throw error;
      }

      const existingId = this.findExistingScanItemId(item.jobId, item.redditPostId, item.redditCommentId);
      return {
        id: existingId ?? id,
        inserted: false
      };
    }
  }

  create(item: NewScanItem): string {
    return this.createWithStatus(item).id;
  }

  listCommentThreadNodes(scanItemId: string): CommentThreadNodeRow[] {
    const rows = this.db
      .prepare(
        `SELECT
           id,
           scan_item_id as scanItemId,
           reddit_comment_id as redditCommentId,
           parent_reddit_comment_id as parentRedditCommentId,
           author,
           body,
           depth,
           is_target as isTarget,
           created_at as createdAt
         FROM comment_thread_nodes
         WHERE scan_item_id = ?
         ORDER BY depth ASC, created_at ASC, id ASC`
      )
      .all(scanItemId) as Array<
      Omit<CommentThreadNodeRow, 'isTarget'> & {
          isTarget: number;
        }
    >;

    return rows.map((row) => ({
      ...row,
      isTarget: row.isTarget === 1
    }));
  }

  redactNonQualifiedOlderThan(days: number): { redacted: number; threadNodesDeleted: number } {
    const batchSize = 1000;
    let totalRedacted = 0;
    let totalThreadNodesDeleted = 0;

    const redactBatch = this.db.transaction((batchIds: string[]): { redacted: number; threadNodesDeleted: number } => {
      let threadNodesDeleted = 0;

      for (const scanItemId of batchIds) {
        const deleteResult = this.db
          .prepare('DELETE FROM comment_thread_nodes WHERE scan_item_id = ?')
          .run(scanItemId);
        threadNodesDeleted += Number(deleteResult.changes);
      }

      const redactResult = this.db
        .prepare(
          `UPDATE scan_items
           SET body = '[redacted]',
               qualification_reason = '[redacted]'
           WHERE id IN (${batchIds.map(() => '?').join(',')})`
        )
        .run(...batchIds);

      return {
        redacted: Number(redactResult.changes),
        threadNodesDeleted
      };
    });

    let hasMore = true;
    while (hasMore) {
      const ids = this.db
        .prepare(
          `SELECT id
           FROM scan_items
           WHERE qualified = 0
             AND body IS NOT NULL
             AND body != '[redacted]'
             AND datetime(created_at) < datetime('now', ?)
           LIMIT ?`
        )
        .all(`-${days} days`, batchSize) as Array<{ id: string }>;

      if (ids.length === 0) {
        hasMore = false;
        break;
      }

      const batchIds = ids.map((row) => row.id);
      const result = redactBatch(batchIds);
      totalRedacted += result.redacted;
      totalThreadNodesDeleted += result.threadNodesDeleted;

      if (ids.length < batchSize) {
        hasMore = false;
      }
    }

    return {
      redacted: totalRedacted,
      threadNodesDeleted: totalThreadNodesDeleted
    };
  }

  countNonQualifiedOlderThan(days: number): number {
    const row = this.db
      .prepare(
        `SELECT COUNT(*) as count
         FROM scan_items
         WHERE qualified = 0
           AND body IS NOT NULL
           AND body != '[redacted]'
           AND datetime(created_at) < datetime('now', ?)`
      )
      .get(`-${days} days`) as { count: number } | undefined;

    return Number(row?.count ?? 0);
  }
}

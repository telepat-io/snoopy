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
  processed?: boolean;
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
  author: string;
  title: string | null;
  body: string;
  url: string;
  redditPostedAt: string;
  viewed: boolean;
  validated: boolean;
  processed: boolean;
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
  processed: boolean;
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
      Omit<ScanItemRow, 'qualified' | 'viewed' | 'validated' | 'processed'> & {
          qualified: number;
          viewed: number;
          validated: number;
          processed: number;
        }
    >
  ): ScanItemRow[] {
    return rows.map((row) => ({
      ...row,
      qualified: row.qualified === 1,
      viewed: row.viewed === 1,
      validated: row.validated === 1,
      processed: row.processed === 1
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
           author,
           title,
           body,
           url,
           reddit_posted_at as redditPostedAt,
           viewed,
           validated,
           processed,
           qualification_reason as qualificationReason,
           created_at as createdAt
         FROM scan_items
         WHERE job_id = ?
           AND qualified = 1
         ORDER BY datetime(reddit_posted_at) DESC, datetime(created_at) DESC, id DESC
         LIMIT ?`
      )
      .all(jobId, boundedLimit) as Array<
      Omit<QualifiedScanItemRow, 'viewed' | 'validated' | 'processed'> & {
          viewed: number;
          validated: number;
          processed: number;
        }
    >;

    return rows.map((row) => ({
      ...row,
      viewed: row.viewed === 1,
      validated: row.validated === 1,
      processed: row.processed === 1
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
           author,
           title,
           body,
           url,
           reddit_posted_at as redditPostedAt,
           viewed,
           validated,
           processed,
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
      Omit<QualifiedScanItemRow, 'viewed' | 'validated' | 'processed'> & {
          viewed: number;
          validated: number;
          processed: number;
        }
    >;

    return rows.map((row) => ({
      ...row,
      viewed: row.viewed === 1,
      validated: row.validated === 1,
      processed: row.processed === 1
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
           processed,
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
      Omit<ScanItemRow, 'qualified' | 'viewed' | 'validated' | 'processed'> & {
          qualified: number;
          viewed: number;
          validated: number;
          processed: number;
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
           processed,
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
      Omit<ScanItemRow, 'qualified' | 'viewed' | 'validated' | 'processed'> & {
          qualified: number;
          viewed: number;
          validated: number;
          processed: number;
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
            processed,
            prompt_tokens,
            completion_tokens,
            estimated_cost_usd,
            qualification_reason,
            created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
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
          newItem.processed ? 1 : 0,
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
}

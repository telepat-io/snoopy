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

interface AnalyticsFilter {
  jobId?: string;
  days: number;
}

export class ScanItemsRepository {
  private readonly db = getDb();

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

  listQualifiedByJob(jobId: string): QualifiedScanItemRow[] {
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
         ORDER BY datetime(reddit_posted_at) DESC, datetime(created_at) DESC, id DESC`
      )
      .all(jobId) as Array<
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

  create(item: NewScanItem): string {
    const id = crypto.randomUUID();

    this.db
      .prepare(
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
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
      )
      .run(
        id,
        item.jobId,
        item.runId,
        item.type,
        item.redditPostId,
        item.redditCommentId,
        item.subreddit,
        item.author,
        item.title,
        item.body,
        item.url,
        item.redditPostedAt,
        item.qualified ? 1 : 0,
        item.viewed ? 1 : 0,
        item.validated ? 1 : 0,
        item.processed ? 1 : 0,
        item.promptTokens ?? 0,
        item.completionTokens ?? 0,
        item.estimatedCostUsd ?? null,
        item.qualificationReason
      );

    return id;
  }
}

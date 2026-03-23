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
  qualificationReason: string | null;
  createdAt: string;
}

export class ScanItemsRepository {
  private readonly db = getDb();

  listQualifiedByJob(jobId: string): QualifiedScanItemRow[] {
    return this.db
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
           qualification_reason as qualificationReason,
           created_at as createdAt
         FROM scan_items
         WHERE job_id = ?
           AND qualified = 1
         ORDER BY datetime(reddit_posted_at) DESC, datetime(created_at) DESC, id DESC`
      )
      .all(jobId) as QualifiedScanItemRow[];
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
          qualification_reason,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
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
        item.qualificationReason
      );

    return id;
  }
}

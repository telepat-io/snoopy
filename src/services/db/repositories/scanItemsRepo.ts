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

export class ScanItemsRepository {
  private readonly db = getDb();

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

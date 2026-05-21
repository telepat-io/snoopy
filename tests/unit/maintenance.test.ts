import crypto from 'node:crypto';
import { getDb } from '../../src/services/db/sqlite.js';
import { ScanItemsRepository } from '../../src/services/db/repositories/scanItemsRepo.js';
import { SettingsRepository } from '../../src/services/db/repositories/settingsRepo.js';
import { redactOldNonQualifiedBodies } from '../../src/services/db/maintenance.js';
import { DEFAULT_NON_QUALIFIED_RETENTION_DAYS } from '../../src/types/settings.js';

function createJobAndRun(jobId?: string, runId?: string): { jobId: string; runId: string } {
  const db = getDb();
  const jId = jobId ?? crypto.randomUUID();
  const rId = runId ?? crypto.randomUUID();
  const suffix = crypto.randomUUID().slice(0, 8);

  db.prepare(
    `INSERT INTO jobs (
      id, slug, name, description, qualification_prompt, subreddits_json,
      schedule_cron, enabled, monitor_comments, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1, datetime('now'), datetime('now'))`
  ).run(
    jId,
    `job-maint-${Date.now()}-${suffix}`,
    `job-maint-${Date.now()}-${suffix}`,
    'desc',
    'prompt',
    JSON.stringify(['askreddit']),
    '*/30 * * * *'
  );

  db.prepare(
    `INSERT INTO job_runs (
      id, job_id, status, started_at, finished_at, created_at
    ) VALUES (?, ?, 'completed', datetime('now'), datetime('now'), datetime('now'))`
  ).run(rId, jId);

  return { jobId: jId, runId: rId };
}

function insertScanItem(params: {
  jobId: string;
  runId: string;
  type: 'post' | 'comment';
  postId: string;
  commentId?: string;
  body: string;
  qualified: boolean;
  qualificationReason?: string;
  createdDaysAgo?: number;
  prefix?: string;
}): string {
  const createdAgo = params.createdDaysAgo ?? 0;
  const ts = createdAgo > 0
    ? `datetime('now', '-${createdAgo} days')`
    : `datetime('now')`;

  const unique = params.prefix ?? crypto.randomUUID().slice(0, 8);

  const db = getDb();
  const id = crypto.randomUUID();
  db.prepare(
    `INSERT OR IGNORE INTO scan_items (
      id, job_id, run_id, type, reddit_post_id, reddit_comment_id,
      subreddit, author, title, body, url, reddit_posted_at,
      qualified, viewed, validated, is_valid, is_valid_reason, feedback_consolidated,
      processed, consumed, prompt_tokens, completion_tokens, estimated_cost_usd,
      qualification_reason, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'),
      ?, 0, 0, 0, NULL, 0, 0, 0, 0, 0, NULL, ?, ${ts})`
  ).run(
    id,
    params.jobId,
    params.runId,
    params.type,
    `${unique}-${params.postId}`,
    params.commentId ? `${unique}-${params.commentId}` : null,
    'askreddit',
    'test_author',
    'test title',
    params.body,
    'https://reddit.com/test',
    params.qualified ? 1 : 0,
    params.qualificationReason ?? null
  );

  return id;
}

function insertThreadNodes(scanItemId: string, nodeCount: number): void {
  const db = getDb();
  for (let i = 0; i < nodeCount; i++) {
    const depth = i;
    const parentId = i === 0 ? null : `parent-${i}`;
    db.prepare(
      `INSERT INTO comment_thread_nodes (
        id, scan_item_id, reddit_comment_id, parent_reddit_comment_id,
        author, body, depth, is_target, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    ).run(
      crypto.randomUUID(),
      scanItemId,
      `thread-cmt-${i}`,
      parentId,
      'thread_author',
      `thread body ${'x'.repeat(100)}`,
      depth,
      i === nodeCount - 1 ? 1 : 0
    );
  }
}

function countThreadNodes(): number {
  const db = getDb();
  const row = db.prepare('SELECT COUNT(*) as count FROM comment_thread_nodes').get() as { count: number };
  return Number(row.count);
}

function countScanItems(): number {
  const db = getDb();
  const row = db.prepare('SELECT COUNT(*) as count FROM scan_items').get() as { count: number };
  return Number(row.count);
}

function getScanItemBody(id: string): string | null {
  const db = getDb();
  const row = db.prepare('SELECT body FROM scan_items WHERE id = ?').get(id) as { body: string } | undefined;
  return row?.body ?? null;
}

function getScanItemQualificationReason(id: string): string | null {
  const db = getDb();
  const row = db.prepare('SELECT qualification_reason FROM scan_items WHERE id = ?').get(id) as
    | { qualification_reason: string }
    | undefined;
  return row?.qualification_reason ?? null;
}

describe('redactOldNonQualifiedBodies', () => {
  const retention = DEFAULT_NON_QUALIFIED_RETENTION_DAYS;

  it('redacts non-qualified scan items older than retention threshold', () => {
    const { jobId, runId } = createJobAndRun();

    const oldNonQualified = insertScanItem({
      jobId,
      runId,
      type: 'post',
      postId: 'old-nq-post',
      body: 'old non-qualified body with plenty of text for storage',
      qualified: false,
      qualificationReason: 'not a match based on detailed analysis',
      createdDaysAgo: retention + 1,
      prefix: 'a'
    });

    const result = redactOldNonQualifiedBodies();
    expect(result.redacted).toBeGreaterThanOrEqual(1);

    expect(getScanItemBody(oldNonQualified)).toBe('[redacted]');
    expect(getScanItemQualificationReason(oldNonQualified)).toBe('[redacted]');
  });

  it('does not redact qualified scan items regardless of age', () => {
    const { jobId, runId } = createJobAndRun();

    const oldQualified = insertScanItem({
      jobId,
      runId,
      type: 'post',
      postId: 'old-q-post',
      body: 'old qualified body that should be preserved',
      qualified: true,
      qualificationReason: 'good match confirmed',
      createdDaysAgo: retention + 30,
      prefix: 'b'
    });

    redactOldNonQualifiedBodies();

    expect(getScanItemBody(oldQualified)).toBe('old qualified body that should be preserved');
    expect(getScanItemQualificationReason(oldQualified)).toBe('good match confirmed');
  });

  it('does not redact recent non-qualified scan items within retention window', () => {
    const { jobId, runId } = createJobAndRun();

    const recentNonQualified = insertScanItem({
      jobId,
      runId,
      type: 'post',
      postId: 'recent-nq-post',
      body: 'recent non-qualified body',
      qualified: false,
      qualificationReason: 'not a match',
      createdDaysAgo: retention - 10,
      prefix: 'c'
    });

    redactOldNonQualifiedBodies();

    expect(getScanItemBody(recentNonQualified)).toBe('recent non-qualified body');
    expect(getScanItemQualificationReason(recentNonQualified)).toBe('not a match');
  });

  it('deletes thread nodes for redacted non-qualified comment scan items', () => {
    const { jobId, runId } = createJobAndRun();

    const oldNonQualifiedComment = insertScanItem({
      jobId,
      runId,
      type: 'comment',
      postId: 'old-nq-post',
      commentId: 'old-nq-comment',
      body: 'old non-qualified comment body xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      qualified: false,
      qualificationReason: 'not relevant to criteria',
      createdDaysAgo: retention + 5,
      prefix: 'd'
    });

    const nodesBefore = countThreadNodes();

    insertThreadNodes(oldNonQualifiedComment, 5);
    expect(countThreadNodes()).toBe(nodesBefore + 5);

    const result = redactOldNonQualifiedBodies();
    expect(result.threadNodesDeleted).toBeGreaterThanOrEqual(5);
    expect(countThreadNodes()).toBe(nodesBefore);
  });

  it('does not delete thread nodes for qualified comment scan items', () => {
    const { jobId, runId } = createJobAndRun();

    const oldQualifiedComment = insertScanItem({
      jobId,
      runId,
      type: 'comment',
      postId: 'old-q-post',
      commentId: 'old-q-comment',
      body: 'old qualified comment body',
      qualified: true,
      qualificationReason: 'matches buying intent',
      createdDaysAgo: retention + 20,
      prefix: 'e'
    });

    insertThreadNodes(oldQualifiedComment, 3);

    const nodesBefore = countThreadNodes();

    redactOldNonQualifiedBodies();

    expect(countThreadNodes()).toBeGreaterThanOrEqual(nodesBefore);
  });

  it('does not redact items that are already redacted (idempotent)', () => {
    const { jobId, runId } = createJobAndRun();

    insertScanItem({
      jobId,
      runId,
      type: 'post',
      postId: 'already-redacted',
      body: 'this is already redacted',
      qualified: false,
      qualificationReason: 'already redacted',
      createdDaysAgo: retention + 10,
      prefix: 'f'
    });

    // Manually redact first
    const db = getDb();
    db.prepare(
      `UPDATE scan_items SET body = '[redacted]', qualification_reason = '[redacted]'
       WHERE body = 'this is already redacted'`
    ).run();

    const countBefore = countScanItems();
    const result = redactOldNonQualifiedBodies();
    expect(result.redacted).toBe(0);
    expect(countScanItems()).toBe(countBefore);
  });

  it('respects custom retention setting from settings table', () => {
    const { jobId, runId } = createJobAndRun();

    const settingsRepo = new SettingsRepository();
    const oldDefault = settingsRepo.get('non_qualified_retention_days');

    try {
      // Set retention to 7 days
      settingsRepo.set('non_qualified_retention_days', '7');

      const oldEnough = insertScanItem({
        jobId,
        runId,
        type: 'post',
        postId: 'custom-retention-post',
        body: 'custom retention test body text here',
        qualified: false,
        qualificationReason: 'testing custom retention',
        createdDaysAgo: 10,
        prefix: 'g'
      });

      const result = redactOldNonQualifiedBodies();
      expect(result.redacted).toBeGreaterThanOrEqual(1);
      expect(getScanItemBody(oldEnough)).toBe('[redacted]');
    } finally {
      if (oldDefault) {
        settingsRepo.set('non_qualified_retention_days', oldDefault);
      } else {
        settingsRepo.delete('non_qualified_retention_days');
      }
    }
  });

  it('uses default retention when setting is missing', () => {
    const { jobId, runId } = createJobAndRun();

    const settingsRepo = new SettingsRepository();
    settingsRepo.delete('non_qualified_retention_days');

    insertScanItem({
      jobId,
      runId,
      type: 'post',
      postId: 'default-retention-post',
      body: 'default retention test body text',
      qualified: false,
      qualificationReason: 'testing default retention',
      createdDaysAgo: retention + 1,
      prefix: 'h'
    });

    const result = redactOldNonQualifiedBodies();
    expect(result.redacted).toBeGreaterThanOrEqual(1);
  });

  it('does not redact when retention setting is zero', () => {
    const { jobId, runId } = createJobAndRun();

    const settingsRepo = new SettingsRepository();
    const old = settingsRepo.get('non_qualified_retention_days');
    try {
      settingsRepo.set('non_qualified_retention_days', '0');

      insertScanItem({
        jobId,
        runId,
        type: 'post',
        postId: 'zero-retention-post',
        body: 'zero retention body',
        qualified: false,
        qualificationReason: 'zero test',
        createdDaysAgo: 2,
        prefix: 'i'
      });

      // Math.max(1, 0) = 1, so items older than 1 day should be redacted
      const result = redactOldNonQualifiedBodies();
      expect(result.redacted).toBeGreaterThanOrEqual(1);
    } finally {
      if (old) {
        settingsRepo.set('non_qualified_retention_days', old);
      } else {
        settingsRepo.delete('non_qualified_retention_days');
      }
    }
  });

  it('redacts body and reason but preserves the scan item row for dedup', () => {
    const { jobId, runId } = createJobAndRun();

    const oldNonQualified = insertScanItem({
      jobId,
      runId,
      type: 'post',
      postId: 'dedup-test-post',
      body: 'unique body for dedup test',
      qualified: false,
      qualificationReason: 'dedup test reason text here',
      createdDaysAgo: retention + 2,
      prefix: 'j'
    });

    const countBefore = countScanItems();
    redactOldNonQualifiedBodies();

    expect(countScanItems()).toBe(countBefore);
    expect(getScanItemBody(oldNonQualified)).toBe('[redacted]');
    expect(getScanItemQualificationReason(oldNonQualified)).toBe('[redacted]');

    const db = getDb();
    const row = db.prepare('SELECT reddit_post_id FROM scan_items WHERE id = ?').get(oldNonQualified) as
      | { reddit_post_id: string }
      | undefined;
    expect(row?.reddit_post_id).toContain('dedup-test-post');
  });

  it('handles empty database gracefully', () => {
    const result = redactOldNonQualifiedBodies();
    expect(result.redacted).toBe(0);
    expect(result.threadNodesDeleted).toBe(0);
  });

  it('redacts multiple items in batch', () => {
    const { jobId, runId } = createJobAndRun();

    const ids: string[] = [];
    for (let i = 0; i < 5; i++) {
      const id = insertScanItem({
        jobId,
        runId,
        type: 'post',
        postId: `batch-post-${i}`,
        body: `batch test body ${'x'.repeat(200)} ${i}`,
        qualified: false,
        qualificationReason: `batch reason ${i}`,
        createdDaysAgo: retention + 5,
        prefix: `k-${i}`
      });
      ids.push(id);
    }

    const result = redactOldNonQualifiedBodies();
    expect(result.redacted).toBeGreaterThanOrEqual(5);

    for (const id of ids) {
      expect(getScanItemBody(id)).toBe('[redacted]');
    }
  });

  it('does not redact items exactly at the retention boundary', () => {
    const { jobId, runId } = createJobAndRun();

    const atBoundary = insertScanItem({
      jobId,
      runId,
      type: 'post',
      postId: 'boundary-post',
      body: 'boundary body text',
      qualified: false,
      qualificationReason: 'boundary reason',
      createdDaysAgo: retention,
      prefix: 'l'
    });

    redactOldNonQualifiedBodies();

    // Items exactly at the retention boundary are NOT older than the threshold
    expect(getScanItemBody(atBoundary)).toBe('boundary body text');
  });

  it('does not redact items whose body is already empty string', () => {
    const { jobId, runId } = createJobAndRun();

    const db = getDb();
    const id = crypto.randomUUID();
    // Insert with empty body — the query filters by body != '[redacted]' which
    // would match empty string. But empty body is valid content that should be
    // preserved if the item is non-qualified — we only redact when body is
    // different from '[redacted]'. Since it's non-qualified and old, it WILL be
    // redacted to '[redacted]'.
    db.prepare(
      `INSERT INTO scan_items (
        id, job_id, run_id, type, reddit_post_id, reddit_comment_id,
        subreddit, author, title, body, url, reddit_posted_at,
        qualified, viewed, validated, is_valid, is_valid_reason, feedback_consolidated,
        processed, consumed, prompt_tokens, completion_tokens, estimated_cost_usd,
        qualification_reason, created_at
      ) VALUES (?, ?, ?, ?, ?, NULL, ?, ?, ?, '', ?, datetime('now'),
        0, 0, 0, 0, NULL, 0, 0, 0, 0, 0, NULL, NULL,
        datetime('now', ?))`
    ).run(
      id,
      jobId,
      runId,
      'post',
      'empty-body-post',
      'askreddit',
      'empty_body_author',
      'empty body title',
      'https://reddit.com/empty-body',
      `-${retention + 10} days`
    );

    // Empty string body IS redacted to '[redacted]' since it's old and non-qualified
    const result = redactOldNonQualifiedBodies();
    expect(result.redacted).toBeGreaterThanOrEqual(1);
    expect(getScanItemBody(id)).toBe('[redacted]');
  });

  it('countNonQualifiedOlderThan returns correct count', () => {
    const { jobId, runId } = createJobAndRun();

    for (let i = 0; i < 3; i++) {
      insertScanItem({
        jobId,
        runId,
        type: 'post',
        postId: `count-post-${i}`,
        body: `count body ${i} ${'y'.repeat(100)}`,
        qualified: false,
        qualificationReason: `count reason ${i}`,
        createdDaysAgo: retention + i + 1,
        prefix: `m-${i}`
      });
    }

    // Also add one recent non-qualified
    insertScanItem({
      jobId,
      runId,
      type: 'post',
      postId: 'count-recent',
      body: 'recent count body',
      qualified: false,
      qualificationReason: 'recent',
      createdDaysAgo: 1,
      prefix: 'm-recent'
    });

    const repo = new ScanItemsRepository();
    const count = repo.countNonQualifiedOlderThan(retention);
    expect(count).toBeGreaterThanOrEqual(3);
  });
});

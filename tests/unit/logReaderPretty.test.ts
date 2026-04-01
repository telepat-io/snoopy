import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  extractErrorEntries,
  formatRunLogPretty,
  hasErrorEntries,
  readRunLog
} from '../../src/services/logging/logReader.js';

describe('formatRunLogPretty', () => {
  it('renders post/comment qualification timeline with clickable links and reasons', () => {
    const content = [
      '[2026-03-26T10:00:00.000Z] [INFO] {',
      '  "event": "run_start",',
      '  "jobName": "Prospect Scan"',
      '}',
      '[2026-03-26T10:00:01.000Z] [INFO] {',
      '  "event": "post_qualify_start",',
      '  "postId": "post-1",',
      '  "title": "Founder needs automation",',
      '  "body": "We are drowning in repetitive SDR work.",',
      '  "url": "https://www.reddit.com/r/startups/comments/post-1/"',
      '}',
      '[2026-03-26T10:00:02.000Z] [INFO] {',
      '  "event": "post_qualify_result",',
      '  "postId": "post-1",',
      '  "result": {',
      '    "qualified": true,',
      '    "reason": "Good B2B automation fit"',
      '  }',
      '}',
      '[2026-03-26T10:00:03.000Z] [INFO] {',
      '  "event": "comment_qualify_start",',
      '  "postId": "post-1",',
      '  "commentId": "c-1",',
      '  "author": "founder42",',
      '  "postUrl": "https://www.reddit.com/r/startups/comments/post-1/",',
      '  "commentUrl": "https://www.reddit.com/r/startups/comments/post-1/topic/c-1/",',
      '  "commentBody": "This is still too early for us."',
      '}',
      '[2026-03-26T10:00:04.000Z] [INFO] {',
      '  "event": "comment_qualify_result",',
      '  "postId": "post-1",',
      '  "commentId": "c-1",',
      '  "author": "founder42",',
      '  "result": {',
      '    "qualified": false,',
      '    "reason": "No urgency signals"',
      '  }',
      '}'
    ].join('\n');

    const pretty = formatRunLogPretty(content);

    expect(pretty).toContain('Run started for Prospect Scan');
    expect(pretty).toContain('Post "Founder needs automation"');
    expect(pretty).toContain('qualified (reason: Good B2B automation fit)');
    expect(pretty).toContain('post: https://www.reddit.com/r/startups/comments/post-1/');
    expect(pretty).toContain('Comment "This is still too early for us."');
    expect(pretty).toContain('not qualified (reason: No urgency signals)');
    expect(pretty).toContain('comment: https://www.reddit.com/r/startups/comments/post-1/topic/c-1/');
  });

  it('falls back to raw content when no structured events can be parsed', () => {
    const content = '[2026-03-26T10:00:00.000Z] [INFO] plain text entry';
    expect(formatRunLogPretty(content)).toBe(content);
  });

  it('keeps warning and error log entries even when they are not json payloads', () => {
    const content = [
      '[2026-03-26T10:00:00.000Z] [WARN] slow response from reddit',
      '[2026-03-26T10:00:01.000Z] [ERROR] failed to parse model output'
    ].join('\n');

    const pretty = formatRunLogPretty(content);

    expect(pretty).toContain('2026-03-26T10:00:00.000Z [WARN] slow response from reddit');
    expect(pretty).toContain('2026-03-26T10:00:01.000Z [ERROR] failed to parse model output');
  });

  it('falls back to unknown placeholders when run_complete stats are incomplete', () => {
    const content = [
      '[2026-03-26T10:00:00.000Z] [INFO] {"event":"run_complete","stats":{"itemsNew":2}}'
    ].join('\n');

    const pretty = formatRunLogPretty(content);

    expect(pretty).toContain('Scan complete (discovered=?, new=2, qualified=?)');
  });

  it('reads existing log files and returns null for missing paths', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'snoopy-log-reader-'));
    const logPath = path.join(tempDir, 'run.log');
    fs.writeFileSync(logPath, 'hello log', 'utf8');

    expect(readRunLog(logPath)).toBe('hello log');
    expect(readRunLog(path.join(tempDir, 'missing.log'))).toBeNull();
    expect(readRunLog(null)).toBeNull();

    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('extracts multiline error entries and detects their presence', () => {
    const content = [
      '[2026-03-26T10:00:00.000Z] [INFO] run started',
      '[2026-03-26T10:00:01.000Z] [ERROR] first failure',
      'stack line 1',
      'stack line 2',
      '[2026-03-26T10:00:02.000Z] [INFO] recovered',
      '[2026-03-26T10:00:03.000Z] [ERROR] second failure',
      'details here'
    ].join('\n');

    expect(extractErrorEntries(content)).toEqual([
      '[2026-03-26T10:00:01.000Z] [ERROR] first failure\nstack line 1\nstack line 2',
      '[2026-03-26T10:00:03.000Z] [ERROR] second failure\ndetails here'
    ]);
    expect(hasErrorEntries(content)).toBe(true);
    expect(hasErrorEntries('[2026-03-26T10:00:00.000Z] [INFO] all good')).toBe(false);
    expect(hasErrorEntries(null)).toBe(false);
  });

  it('includes subreddit_fetched lines with post count', () => {
    const content = [
      '[2026-03-26T10:00:00.000Z] [INFO] {"event":"subreddit_fetched","subreddit":"startups","postCount":12}'
    ].join('\n');

    const pretty = formatRunLogPretty(content);

    expect(pretty).toContain('Fetched r/startups: 12 posts');
  });

  it('shows ? for missing subreddit and non-numeric postCount in subreddit_fetched', () => {
    const content = ['[2026-03-26T10:00:00.000Z] [INFO] {"event":"subreddit_fetched"}'].join('\n');

    const pretty = formatRunLogPretty(content);

    expect(pretty).toContain('Fetched r/?: ? posts');
  });

  it('includes run_failed message in pretty output', () => {
    const content = ['[2026-03-26T10:00:00.000Z] [INFO] {"event":"run_failed","message":"Network error"}'].join(
      '\n'
    );

    const pretty = formatRunLogPretty(content);

    expect(pretty).toContain('[ERROR] Run failed: Network error');
  });

  it('uses Unknown error fallback when run_failed has no message', () => {
    const content = ['[2026-03-26T10:00:00.000Z] [INFO] {"event":"run_failed"}'].join('\n');

    const pretty = formatRunLogPretty(content);

    expect(pretty).toContain('[ERROR] Run failed: Unknown error');
  });

  it('skips unknown events silently (default switch case)', () => {
    const content = ['[2026-03-26T10:00:00.000Z] [INFO] {"event":"custom_internal_event","data":"whatever"}'].join(
      '\n'
    );

    const pretty = formatRunLogPretty(content);

    expect(pretty).toBe(content);
  });

  it('falls back to jobId and then unknown job in run_start when jobName is absent', () => {
    const withJobId = ['[2026-03-26T10:00:00.000Z] [INFO] {"event":"run_start","jobId":"job-abc"}'].join('\n');
    expect(formatRunLogPretty(withJobId)).toContain('Run started for job-abc');

    const noNames = ['[2026-03-26T10:00:00.000Z] [INFO] {"event":"run_start"}'].join('\n');
    expect(formatRunLogPretty(noNames)).toContain('Run started for unknown job');
  });

  it('skips post_qualify_start when postId is missing', () => {
    const content = [
      '[2026-03-26T10:00:00.000Z] [INFO] {"event":"run_start","jobName":"job"}',
      '[2026-03-26T10:00:01.000Z] [INFO] {"event":"post_qualify_start","title":"No ID post"}'
    ].join('\n');

    const pretty = formatRunLogPretty(content);

    expect(pretty).not.toContain('post_qualify_start');
  });

  it('shows post_qualify_result with undefined result field', () => {
    const content = [
      '[2026-03-26T10:00:00.000Z] [INFO] {"event":"post_qualify_start","postId":"p1","title":"T1"}',
      '[2026-03-26T10:00:01.000Z] [INFO] {"event":"post_qualify_result","postId":"p1"}'
    ].join('\n');

    const pretty = formatRunLogPretty(content);

    expect(pretty).toContain('Post "T1"');
  });

  it('skips comment_qualify_start when commentId is missing', () => {
    const content = ['[2026-03-26T10:00:00.000Z] [INFO] {"event":"comment_qualify_start","postId":"p1","author":"bob"}'].join(
      '\n'
    );

    const pretty = formatRunLogPretty(content);

    expect(pretty).toBe(content);
  });

  it('shows comment_qualify_result using payload author when context is not preloaded', () => {
    const content = [
      '[2026-03-26T10:00:00.000Z] [INFO] {"event":"comment_qualify_result","postId":"p1","commentId":"c99","author":"override","result":{"qualified":false,"reason":"no"}}'
    ].join('\n');

    const pretty = formatRunLogPretty(content);

    expect(pretty).toContain('Comment by override');
  });

  it('shows comment_qualify_result with null result object', () => {
    const content = [
      '[2026-03-26T10:00:00.000Z] [INFO] {"event":"comment_qualify_start","postId":"p1","commentId":"c1","author":"alice","commentBody":"hello"}',
      '[2026-03-26T10:00:01.000Z] [INFO] {"event":"comment_qualify_result","postId":"p1","commentId":"c1"}'
    ].join('\n');

    const pretty = formatRunLogPretty(content);

    expect(pretty).toContain('Comment "hello" | author: alice | qualification pending');
  });

  it('shows run_complete with ? for missing stats fields', () => {
    const content = ['[2026-03-26T10:00:00.000Z] [INFO] {"event":"run_complete"}'].join('\n');

    const pretty = formatRunLogPretty(content);

    expect(pretty).toContain('Scan complete (discovered=?, new=?, qualified=?)');
  });

  it('treats content lines before the first log header as non-matching (no-current path)', () => {
    const content = [
      'preamble text with no header',
      '[2026-03-26T10:00:00.000Z] [INFO] {"event":"run_start","jobName":"myjob"}'
    ].join('\n');

    const pretty = formatRunLogPretty(content);

    expect(pretty).toContain('Run started for myjob');
    expect(pretty).not.toContain('preamble');
  });

  it('handles a continuation line after a header with empty initial message', () => {
    const twoPartContent = [
      '[2026-03-26T10:00:00.000Z] [INFO]',
      '{',
      '  "event": "run_start",',
      '  "jobName": "continuation job"',
      '}'
    ].join('\n');

    const pretty = formatRunLogPretty(twoPartContent);

    expect(pretty).toContain('Run started for continuation job');
  });

  it('skips non-event payloads (json with no event field) without crashing', () => {
    const content = ['[2026-03-26T10:00:00.000Z] [INFO] {"someField":"someValue"}'].join('\n');

    const pretty = formatRunLogPretty(content);

    expect(pretty).toBe(content);
  });

  it('handles parseJsonObject edge cases: array json and invalid json bounded by braces', () => {
    const withArray = ['[2026-03-26T10:00:00.000Z] [INFO] [1,2,3]'].join('\n');
    expect(formatRunLogPretty(withArray)).toBe(withArray);

    const invalidBraced = ['[2026-03-26T10:00:00.000Z] [INFO] {invalid json here}'].join('\n');
    expect(formatRunLogPretty(invalidBraced)).toBe(invalidBraced);
  });
});

import { formatRunLogPretty } from '../../src/services/logging/logReader.js';

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
});

import { formatCommentScanLine, formatPostScanLine, toSnippet } from '../../src/utils/scanLogFormatting.js';

describe('scan log formatting', () => {
  it('normalizes whitespace and truncates snippets around configured length', () => {
    const long = '   first line\nsecond line\twith spaces '.repeat(10);
    const snippet = toSnippet(long, 60);

    expect(snippet).toContain('first line second line with spaces');
    expect(snippet.length).toBeLessThanOrEqual(63);
    expect(snippet.endsWith('...')).toBe(true);
  });

  it('formats post line with title, justification, clickable link, and secondary metadata', () => {
    const line = formatPostScanLine({
      postId: 'post-123',
      title: 'Need GTM help',
      bodySnippet: 'We are a seed-stage startup evaluating AI tooling for outbound.',
      qualified: true,
      qualificationReason: 'Strong match for product-led growth outreach',
      postUrl: 'https://www.reddit.com/r/startups/comments/post-123/',
      itemsNew: 2,
      itemsQualified: 1
    });

    expect(line).toContain('Post "Need GTM help"');
    expect(line).toContain('qualified (reason: Strong match for product-led growth outreach)');
    expect(line).toContain('post: https://www.reddit.com/r/startups/comments/post-123/');
    expect(line).toContain('id: post-123');
    expect(line).toContain('totals new=2, qualified=1');
  });

  it('formats comment line with not-qualified reason and both comment/post links', () => {
    const line = formatCommentScanLine({
      postId: 'post-123',
      commentId: 'comment-9',
      author: 'founder42',
      commentSnippet: 'I am mostly venting and not actively looking for tooling right now.',
      qualified: false,
      qualificationReason: 'No clear buying intent',
      commentUrl: 'https://www.reddit.com/r/startups/comments/post-123/topic/comment-9/',
      postUrl: 'https://www.reddit.com/r/startups/comments/post-123/'
    });

    expect(line).toContain('Comment "I am mostly venting and not actively looking for tooling right now."');
    expect(line).toContain('not qualified (reason: No clear buying intent)');
    expect(line).toContain('comment: https://www.reddit.com/r/startups/comments/post-123/topic/comment-9/');
    expect(line).toContain('post: https://www.reddit.com/r/startups/comments/post-123/');
    expect(line).toContain('ids: comment=comment-9, post=post-123');
  });
});

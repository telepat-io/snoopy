import {
  buildContentLines,
  buildMetadataLines,
  buildScrollableResultLines,
  nextContentScrollTop,
  nextItemIndex,
  type ResultsViewerItem
} from '../../src/ui/components/resultsViewerModel.js';

function buildItem(overrides: Partial<ResultsViewerItem> = {}): ResultsViewerItem {
  return {
    id: 'scan-1',
    jobId: 'job-1',
    runId: 'run-1',
    type: 'post',
    redditPostId: 'post-1',
    redditCommentId: null,
    subreddit: 'askreddit',
    author: 'alice',
    title: 'Post title',
    body: 'Post body text',
    url: 'https://www.reddit.com/r/askreddit/comments/post-1/',
    redditPostedAt: '2026-03-01T12:00:00.000Z',
    qualified: true,
    viewed: false,
    validated: false,
    processed: false,
    consumed: false,
    qualificationReason: 'Good fit',
    promptTokens: 12,
    completionTokens: 7,
    estimatedCostUsd: 0.000123,
    createdAt: '2026-03-01T12:01:00.000Z',
    commentThreadNodes: [],
    ...overrides
  };
}

describe('resultsViewerModel', () => {
  it('moves item cursor left/right within boundaries', () => {
    expect(nextItemIndex(0, 'left', 0)).toBe(0);
    expect(nextItemIndex(0, 'left', 3)).toBe(0);
    expect(nextItemIndex(0, 'right', 3)).toBe(1);
    expect(nextItemIndex(2, 'right', 3)).toBe(2);
  });

  it('moves content scroll up/down within boundaries', () => {
    expect(nextContentScrollTop(0, 'up', 20, 5)).toBe(0);
    expect(nextContentScrollTop(0, 'down', 20, 5)).toBe(1);
    expect(nextContentScrollTop(15, 'down', 20, 5)).toBe(15);
    expect(nextContentScrollTop(0, 'down', 3, 10)).toBe(0);
  });

  it('builds post content lines with title and body', () => {
    const item = buildItem({ type: 'post', title: 'Some title', body: 'Some body' });
    const lines = buildContentLines(item, 40);

    expect(lines).toContain('Post');
    expect(lines).toContain('Title');
    expect(lines).toContain('Body');
    expect(lines.some((line) => line.includes('Some title'))).toBe(true);
    expect(lines.some((line) => line.includes('Some body'))).toBe(true);
  });

  it('builds comment content lines using root-to-target thread order', () => {
    const item = buildItem({
      type: 'comment',
      redditCommentId: 'c3',
      commentThreadNodes: [
        {
          id: 'n1',
          scanItemId: 'scan-1',
          redditCommentId: 'c1',
          parentRedditCommentId: null,
          author: 'rootUser',
          body: 'Root comment',
          depth: 0,
          isTarget: false,
          createdAt: '2026-03-01T12:00:01.000Z'
        },
        {
          id: 'n2',
          scanItemId: 'scan-1',
          redditCommentId: 'c2',
          parentRedditCommentId: 'c1',
          author: 'middleUser',
          body: 'Middle comment',
          depth: 1,
          isTarget: false,
          createdAt: '2026-03-01T12:00:02.000Z'
        },
        {
          id: 'n3',
          scanItemId: 'scan-1',
          redditCommentId: 'c3',
          parentRedditCommentId: 'c2',
          author: 'targetUser',
          body: 'Target comment',
          depth: 2,
          isTarget: true,
          createdAt: '2026-03-01T12:00:03.000Z'
        }
      ]
    });

    const lines = buildContentLines(item, 60);
    const rootIndex = lines.findIndex((line) => line.includes('rootUser'));
    const middleIndex = lines.findIndex((line) => line.includes('middleUser'));
    const targetIndex = lines.findIndex((line) => line.includes('targetUser'));

    expect(rootIndex).toBeGreaterThan(-1);
    expect(middleIndex).toBeGreaterThan(rootIndex);
    expect(targetIndex).toBeGreaterThan(middleIndex);
  });

  it('shows thread unavailable when comment lineage is missing', () => {
    const item = buildItem({
      type: 'comment',
      redditCommentId: 'c1',
      commentThreadNodes: []
    });

    const lines = buildContentLines(item, 60);
    expect(lines).toContain('Thread unavailable for this item.');
  });

  it('builds metadata lines with key links and status values', () => {
    const item = buildItem({ author: 'alice-user' });
    const lines = buildMetadataLines(item);

    expect(lines).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'Type', value: 'post' }),
        expect.objectContaining({ label: 'Qualified', value: 'yes' }),
        expect.objectContaining({ label: 'Author URL', value: 'https://www.reddit.com/user/alice-user/' }),
        expect.objectContaining({ label: 'Content URL', value: item.url })
      ])
    );
  });

  it('formats missing cost and missing post title in scrollable output', () => {
    const item = buildItem({
      estimatedCostUsd: null,
      title: null,
      qualificationReason: null
    });

    const metadataLines = buildMetadataLines(item);
    const contentLines = buildScrollableResultLines(item, 30);

    expect(metadataLines).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'Reason', value: '-' }),
        expect.objectContaining({ label: 'Cost', value: '-' })
      ])
    );
    expect(contentLines).toContain('(no title)');
  });

  it('wraps long metadata values across multiple lines', () => {
    const item = buildItem({
      qualificationReason: 'This is a very long qualification reason that should wrap to the next line cleanly.'
    });

    const lines = buildScrollableResultLines(item, 25);
    const reasonIndex = lines.findIndex((line) => line.startsWith('Reason: '));

    expect(reasonIndex).toBeGreaterThan(-1);
    expect(lines[reasonIndex + 1]?.startsWith('        ')).toBe(true);
  });

  it('builds one scrollable block with content first and metadata below', () => {
    const item = buildItem({
      type: 'post',
      title: 'Visible title',
      body: 'Visible body text',
      qualificationReason: 'Visible reason'
    });

    const lines = buildScrollableResultLines(item, 80);
    const titleIndex = lines.findIndex((line) => line === 'Title');
    const metadataIndex = lines.findIndex((line) => line === 'Metadata');
    const reasonIndex = lines.findIndex((line) => line.includes('Reason:'));

    expect(titleIndex).toBeGreaterThan(-1);
    expect(metadataIndex).toBeGreaterThan(titleIndex);
    expect(reasonIndex).toBeGreaterThan(metadataIndex);
  });
});

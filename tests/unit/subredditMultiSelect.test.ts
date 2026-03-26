import { normalizeSubreddit, resolveCustomSubreddit } from '../../src/ui/components/subredditOptions.js';

describe('SubredditMultiSelect helpers', () => {
  it('normalizes subreddit values by trimming whitespace and removing r/ prefix', () => {
    expect(normalizeSubreddit('  r/AskReddit  ')).toBe('AskReddit');
    expect(normalizeSubreddit('r/Entrepreneur')).toBe('Entrepreneur');
    expect(normalizeSubreddit(' side project ')).toBe('sideproject');
  });

  it('returns null when custom input is empty after normalization', () => {
    const result = resolveCustomSubreddit(['AskReddit'], '   ');

    expect(result.normalized).toBeNull();
    expect(result.nextOptions).toEqual(['AskReddit']);
  });

  it('appends a new custom subreddit to options', () => {
    const result = resolveCustomSubreddit(['AskReddit', 'SideProject'], 'r/indiehackers');

    expect(result.normalized).toBe('indiehackers');
    expect(result.nextOptions).toEqual(['AskReddit', 'SideProject', 'indiehackers']);
  });

  it('does not duplicate an existing subreddit option', () => {
    const result = resolveCustomSubreddit(['AskReddit', 'indiehackers'], 'r/indiehackers');

    expect(result.normalized).toBe('indiehackers');
    expect(result.nextOptions).toEqual(['AskReddit', 'indiehackers']);
  });
});

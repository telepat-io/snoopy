import { formatLocalTimestamp, formatRunDisplayLabel } from '../../src/cli/ui/time.js';

describe('CLI time formatting', () => {
  it('formats sqlite UTC timestamps into local time strings', () => {
    const expected = new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    }).format(new Date('2026-03-27T18:30:00Z'));

    expect(formatLocalTimestamp('2026-03-27 18:30:00')).toBe(expected);
  });

  it('prefers finishedAt in run display labels', () => {
    const expected = `Completed ${formatLocalTimestamp('2026-03-27 18:30:00')}`;

    expect(
      formatRunDisplayLabel({
        createdAt: '2026-03-27 18:00:00',
        startedAt: '2026-03-27 18:05:00',
        finishedAt: '2026-03-27 18:30:00'
      })
    ).toBe(expected);
  });
});

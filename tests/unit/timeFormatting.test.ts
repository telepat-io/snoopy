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

  it('returns placeholders or original input when timestamps cannot be parsed', () => {
    expect(formatLocalTimestamp(undefined)).toBe('-');
    expect(formatLocalTimestamp(null)).toBe('-');
    expect(formatLocalTimestamp('not-a-timestamp')).toBe('not-a-timestamp');
  });

  it('accepts iso timestamps and explicit timezone offsets', () => {
    const isoExpected = new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    }).format(new Date('2026-03-27T18:30:00Z'));

    const offsetExpected = new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    }).format(new Date('2026-03-27T18:30:00+02:00'));

    expect(formatLocalTimestamp('2026-03-27T18:30:00Z')).toBe(isoExpected);
    expect(formatLocalTimestamp('2026-03-27T18:30:00+02:00')).toBe(offsetExpected);
  });

  it('uses startedAt when finishedAt is absent and createdAt when no run has started', () => {
    expect(
      formatRunDisplayLabel({
        createdAt: '2026-03-27 18:00:00',
        startedAt: '2026-03-27 18:05:00',
        finishedAt: null
      })
    ).toBe(`Started ${formatLocalTimestamp('2026-03-27 18:05:00')}`);

    expect(
      formatRunDisplayLabel({
        createdAt: '2026-03-27 18:00:00',
        startedAt: null,
        finishedAt: null
      })
    ).toBe(`Created ${formatLocalTimestamp('2026-03-27 18:00:00')}`);
  });
});

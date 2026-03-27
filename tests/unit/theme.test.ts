import { detectColorSupportLevel, shouldUseCompactLayout, uiTheme } from '../../src/ui/theme.js';

describe('uiTheme helpers', () => {
  test('detectColorSupportLevel prefers truecolor when COLORTERM indicates support', () => {
    expect(detectColorSupportLevel({ COLORTERM: 'truecolor' })).toBe('truecolor');
    expect(detectColorSupportLevel({ COLORTERM: '24bit' })).toBe('truecolor');
  });

  test('detectColorSupportLevel falls back to ansi256 with matching TERM', () => {
    expect(detectColorSupportLevel({ TERM: 'xterm-256color' })).toBe('ansi256');
  });

  test('detectColorSupportLevel falls back to ansi16 when no indicators are set', () => {
    expect(detectColorSupportLevel({})).toBe('ansi16');
  });

  test('shouldUseCompactLayout applies compact breakpoint', () => {
    expect(shouldUseCompactLayout(uiTheme.compactBreakpoint - 1)).toBe(true);
    expect(shouldUseCompactLayout(uiTheme.compactBreakpoint)).toBe(false);
    expect(shouldUseCompactLayout(uiTheme.compactBreakpoint + 20)).toBe(false);
  });
});

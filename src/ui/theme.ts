export type ColorSupportLevel = 'ansi16' | 'ansi256' | 'truecolor';

export interface UiTheme {
  readonly compactBreakpoint: number;
  readonly preferredLineLength: number;
  readonly wrapWarningLength: number;
  readonly ink: {
    readonly accent: 'cyan';
    readonly accentStrong: 'cyanBright';
    readonly focus: 'yellow';
    readonly textPrimary: 'white';
    readonly textMuted: 'gray';
    readonly info: 'blue';
    readonly success: 'green';
    readonly warning: 'yellow';
    readonly danger: 'red';
  };
  readonly symbols: {
    readonly sentimentPositive: '+';
    readonly sentimentNeutral: 'o';
    readonly sentimentNegative: '-';
    readonly sentimentInfo: 'i';
  };
}

export const uiTheme: UiTheme = {
  compactBreakpoint: 80,
  preferredLineLength: 66,
  wrapWarningLength: 75,
  ink: {
    accent: 'cyan',
    accentStrong: 'cyanBright',
    focus: 'yellow',
    textPrimary: 'white',
    textMuted: 'gray',
    info: 'blue',
    success: 'green',
    warning: 'yellow',
    danger: 'red'
  },
  symbols: {
    sentimentPositive: '+',
    sentimentNeutral: 'o',
    sentimentNegative: '-',
    sentimentInfo: 'i'
  }
};

export function detectColorSupportLevel(env: NodeJS.ProcessEnv = process.env): ColorSupportLevel {
  const colorterm = (env.COLORTERM ?? '').toLowerCase();
  if (colorterm.includes('truecolor') || colorterm.includes('24bit')) {
    return 'truecolor';
  }

  const term = (env.TERM ?? '').toLowerCase();
  if (term.includes('256color')) {
    return 'ansi256';
  }

  return 'ansi16';
}

export function shouldUseCompactLayout(columns: number, breakpoint = uiTheme.compactBreakpoint): boolean {
  return columns < breakpoint;
}

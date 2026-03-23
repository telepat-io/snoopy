import { SNOOPY_WORDMARK } from '../../ui/components/CliHeader.js';

const ANSI = {
  reset: '\u001b[0m',
  bold: '\u001b[1m',
  cyan: '\u001b[36m',
  blue: '\u001b[34m',
  green: '\u001b[32m',
  yellow: '\u001b[33m',
  red: '\u001b[31m',
  gray: '\u001b[90m'
} as const;

let headerPrinted = false;

export function isRichTty(): boolean {
  return Boolean(process.stdout.isTTY && process.stdin.isTTY);
}

function colorize(value: string, color: keyof typeof ANSI): string {
  if (!isRichTty()) {
    return value;
  }

  return `${ANSI[color]}${value}${ANSI.reset}`;
}

function bold(value: string): string {
  if (!isRichTty()) {
    return value;
  }

  return `${ANSI.bold}${value}${ANSI.reset}`;
}

export function printCliHeader(subtitle = 'Reddit conversation scanner'): void {
  if (!isRichTty() || headerPrinted) {
    return;
  }

  headerPrinted = true;
  console.log('');
  console.log(colorize(bold(SNOOPY_WORDMARK), 'cyan'));
  console.log(colorize(subtitle, 'blue'));
  console.log('');
}

export function printSection(title: string): void {
  if (isRichTty()) {
    console.log(colorize(bold(title), 'cyan'));
    return;
  }

  console.log(title);
}

export function printMuted(text: string): void {
  console.log(colorize(text, 'gray'));
}

export function printSuccess(text: string): void {
  const prefix = isRichTty() ? colorize('✓', 'green') : '[ok]';
  console.log(`${prefix} ${text}`);
}

export function printWarning(text: string): void {
  const prefix = isRichTty() ? colorize('!', 'yellow') : '[warn]';
  console.log(`${prefix} ${text}`);
}

export function printError(text: string): void {
  const prefix = isRichTty() ? colorize('✗', 'red') : '[error]';
  console.log(`${prefix} ${text}`);
}

export function printInfo(text: string): void {
  const prefix = isRichTty() ? colorize('•', 'blue') : '-';
  console.log(`${prefix} ${text}`);
}

export function printKeyValue(key: string, value: string): void {
  if (isRichTty()) {
    console.log(`${colorize(`${key}:`, 'blue')} ${value}`);
    return;
  }

  console.log(`${key}: ${value}`);
}

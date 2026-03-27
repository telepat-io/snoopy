import { SNOOPY_WORDMARK } from '../../ui/components/CliHeader.js';
import { uiTheme } from '../../ui/theme.js';
import { toSnippet, type CommentScanLineInput, type PostScanLineInput } from '../../utils/scanLogFormatting.js';

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

function normalizeWhitespace(value: string | null | undefined): string {
  if (!value) {
    return '';
  }

  return value.replace(/\s+/g, ' ').trim();
}

function formatQualifiedStatus(qualified: boolean | undefined): string {
  if (qualified === undefined) {
    return colorize('pending', 'yellow');
  }

  return qualified ? colorize('qualified', 'green') : colorize('not qualified', 'red');
}

function formatLabel(label: string): string {
  return colorize(`${label}:`, uiTheme.ink.info);
}

function formatScanDetailLine(label: string, value: string): string {
  return `  ${formatLabel(label)} ${value}`;
}

function terminalColumns(): number {
  return process.stdout.columns ?? 120;
}

function padLabel(label: string): string {
  const maxWidth = Math.max(10, Math.min(24, Math.floor(terminalColumns() / 4)));
  return label.length >= maxWidth ? label : `${label}${' '.repeat(maxWidth - label.length)}`;
}

function formatQualificationReason(
  qualified: boolean | undefined,
  qualificationReason: string | null | undefined
): string | null {
  const normalizedReason = normalizeWhitespace(qualificationReason);
  if (qualified === undefined && !normalizedReason) {
    return null;
  }

  return normalizedReason || 'No justification provided.';
}

export function formatPostScanBlock(input: PostScanLineInput): string {
  const title = toSnippet(input.title, 80);
  const snippet = toSnippet(input.bodySnippet);
  const reason = formatQualificationReason(input.qualified, input.qualificationReason);
  const lines = ['Post'];

  lines.push(formatScanDetailLine('ID', input.postId));
  if (title) {
    lines.push(formatScanDetailLine('Title', title));
  }

  if (snippet) {
    lines.push(formatScanDetailLine('Snippet', snippet));
  }

  lines.push(formatScanDetailLine('Status', formatQualifiedStatus(input.qualified)));
  if (reason) {
    lines.push(formatScanDetailLine('Reason', reason));
  }

  if (input.postUrl) {
    lines.push(formatScanDetailLine('Post', input.postUrl));
  }

  if (typeof input.itemsNew === 'number' && typeof input.itemsQualified === 'number') {
    lines.push(formatScanDetailLine('Totals', `new=${input.itemsNew}, qualified=${input.itemsQualified}`));
  }

  return lines.join('\n');
}

export function formatCommentScanBlock(input: CommentScanLineInput): string {
  const snippet = toSnippet(input.commentSnippet);
  const reason = formatQualificationReason(input.qualified, input.qualificationReason);
  const lines = ['Comment'];

  lines.push(formatScanDetailLine('Comment ID', input.commentId));
  lines.push(formatScanDetailLine('Post ID', input.postId));
  lines.push(formatScanDetailLine('Author', input.author));
  if (snippet) {
    lines.push(formatScanDetailLine('Snippet', snippet));
  }

  lines.push(formatScanDetailLine('Status', formatQualifiedStatus(input.qualified)));
  if (reason) {
    lines.push(formatScanDetailLine('Reason', reason));
  }

  if (input.commentUrl) {
    lines.push(formatScanDetailLine('Comment', input.commentUrl));
  }

  if (input.postUrl) {
    lines.push(formatScanDetailLine('Post', input.postUrl));
  }

  if (typeof input.itemsNew === 'number' && typeof input.itemsQualified === 'number') {
    lines.push(formatScanDetailLine('Totals', `new=${input.itemsNew}, qualified=${input.itemsQualified}`));
  }

  return lines.join('\n');
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

export function printCommandScreen(title: string, section?: string): void {
  printCliHeader(title);
  if (section) {
    printSection(section);
  }
  if (isRichTty()) {
    printMuted('Tab-friendly controls: arrows navigate selectors, Enter confirms, Esc cancels.');
  }
}

export function printSection(title: string): void {
  if (isRichTty()) {
    console.log(colorize(bold(title), 'cyan'));
    console.log(colorize('─'.repeat(Math.max(8, Math.min(36, title.length + 4))), 'gray'));
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
  const prefix = isRichTty() ? colorize(uiTheme.symbols.sentimentInfo, 'blue') : '-';
  console.log(`${prefix} ${text}`);
}

export function printKeyValue(key: string, value: string): void {
  const label = `${padLabel(key)}:`;
  if (isRichTty()) {
    console.log(`${colorize(label, 'blue')} ${value}`);
    return;
  }

  console.log(`${label} ${value}`);
}

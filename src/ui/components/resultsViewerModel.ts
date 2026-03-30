import type { CommentThreadNodeRow, ScanItemRow } from '../../services/db/repositories/scanItemsRepo.js';
import { formatLocalTimestamp } from '../../cli/ui/time.js';

export interface ResultsViewerItem extends ScanItemRow {
  commentThreadNodes: CommentThreadNodeRow[];
}

export interface DetailLine {
  label: string;
  value: string;
}

function wrapLine(line: string, width: number): string[] {
  const safeWidth = Math.max(10, width);
  if (line.length <= safeWidth) {
    return [line];
  }

  const wrapped: string[] = [];
  let remaining = line;
  while (remaining.length > safeWidth) {
    const slice = remaining.slice(0, safeWidth);
    const splitAt = slice.lastIndexOf(' ');
    const index = splitAt > Math.floor(safeWidth * 0.5) ? splitAt : safeWidth;
    wrapped.push(remaining.slice(0, index).trimEnd());
    remaining = remaining.slice(index).trimStart();
  }

  if (remaining.length > 0) {
    wrapped.push(remaining);
  }

  return wrapped;
}

export function wrapTextBlock(value: string, width: number): string[] {
  const normalized = value.replace(/\r\n/g, '\n');
  const lines = normalized.split('\n');
  const wrapped = lines.flatMap((line) => wrapLine(line.trimEnd(), width));
  if (wrapped.length === 0) {
    return [''];
  }

  return wrapped;
}

function formatCost(value: number | null): string {
  if (value === null) {
    return '-';
  }

  return `$${value.toFixed(6)}`;
}

export function buildMetadataLines(item: ResultsViewerItem): DetailLine[] {
  const authorUrl = `https://www.reddit.com/user/${encodeURIComponent(item.author)}/`;
  return [
    { label: 'Type', value: item.type },
    { label: 'Qualified', value: item.qualified ? 'yes' : 'no' },
    { label: 'Reason', value: item.qualificationReason ?? '-' },
    { label: 'Subreddit', value: `r/${item.subreddit}` },
    { label: 'Author', value: item.author },
    { label: 'Author URL', value: authorUrl },
    { label: 'Content URL', value: item.url },
    { label: 'Posted', value: formatLocalTimestamp(item.redditPostedAt) },
    { label: 'Run ID', value: item.runId },
    { label: 'Item ID', value: item.id },
    { label: 'Tokens', value: `${item.promptTokens}/${item.completionTokens}` },
    { label: 'Cost', value: formatCost(item.estimatedCostUsd) },
    { label: 'Flags', value: `viewed=${item.viewed} validated=${item.validated} processed=${item.processed}` }
  ];
}

export function buildContentLines(item: ResultsViewerItem, width: number): string[] {
  const lines: string[] = [];
  if (item.type === 'post') {
    lines.push('Post');
    lines.push('');
    lines.push('Title');
    lines.push(...wrapTextBlock(item.title ?? '(no title)', width));
    lines.push('');
    lines.push('Body');
    lines.push(...wrapTextBlock(item.body, width));
    return lines;
  }

  lines.push('Comment');
  lines.push('');
  lines.push('Thread (root -> target)');
  if (item.commentThreadNodes.length === 0) {
    lines.push('Thread unavailable for this item.');
  } else {
    item.commentThreadNodes.forEach((node, index) => {
      const marker = node.isTarget ? 'target' : `depth ${node.depth}`;
      const header = `${index + 1}. ${node.author} (${marker})`;
      lines.push(header);
      for (const wrapped of wrapTextBlock(node.body, Math.max(10, width - 2))) {
        lines.push(`  ${wrapped}`);
      }
      lines.push('');
    });
  }

  lines.push('Target Comment Body');
  lines.push(...wrapTextBlock(item.body, width));

  return lines;
}

export function buildScrollableResultLines(item: ResultsViewerItem, width: number): string[] {
  const lines: string[] = [];

  lines.push(...buildContentLines(item, width));
  lines.push('');
  lines.push('Metadata');

  for (const detail of buildMetadataLines(item)) {
    const prefix = `${detail.label}: `;
    const wrapped = wrapTextBlock(detail.value, Math.max(10, width - prefix.length));
    if (wrapped.length === 0) {
      lines.push(prefix);
      continue;
    }

    lines.push(`${prefix}${wrapped[0]}`);
    for (const line of wrapped.slice(1)) {
      lines.push(`${' '.repeat(prefix.length)}${line}`);
    }
  }

  return lines;
}

export function nextItemIndex(current: number, direction: 'left' | 'right', total: number): number {
  if (total <= 0) {
    return 0;
  }

  if (direction === 'left') {
    return Math.max(0, current - 1);
  }

  return Math.min(total - 1, current + 1);
}

export function nextContentScrollTop(
  current: number,
  direction: 'up' | 'down',
  totalLines: number,
  windowSize: number
): number {
  const maxTop = Math.max(0, totalLines - Math.max(1, windowSize));
  if (direction === 'up') {
    return Math.max(0, current - 1);
  }

  return Math.min(maxTop, current + 1);
}

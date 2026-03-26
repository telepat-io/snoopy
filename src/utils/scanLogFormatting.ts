export const DEFAULT_SCAN_SNIPPET_LENGTH = 120;

function normalizeWhitespace(value: string | null | undefined): string {
  if (!value) {
    return '';
  }

  return value.replace(/\s+/g, ' ').trim();
}

export function toSnippet(value: string | null | undefined, maxLength = DEFAULT_SCAN_SNIPPET_LENGTH): string {
  const normalized = normalizeWhitespace(value);
  if (!normalized) {
    return '';
  }

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, Math.max(0, maxLength - 1)).trimEnd()}...`;
}

function formatReason(reason: string | null | undefined): string {
  const normalized = normalizeWhitespace(reason);
  return normalized || 'No justification provided.';
}

function formatOutcome(qualified: boolean | undefined, reason: string | null | undefined): string {
  if (qualified === undefined) {
    return 'qualification pending';
  }

  return `${qualified ? 'qualified' : 'not qualified'} (reason: ${formatReason(reason)})`;
}

function maybePush(parts: string[], value: string | null | undefined): void {
  if (!value) {
    return;
  }

  parts.push(value);
}

export interface PostScanLineInput {
  postId: string;
  title?: string;
  bodySnippet?: string;
  qualified?: boolean;
  qualificationReason?: string;
  postUrl?: string;
  itemsNew?: number;
  itemsQualified?: number;
}

export interface CommentScanLineInput {
  postId: string;
  commentId: string;
  author: string;
  commentSnippet?: string;
  qualified?: boolean;
  qualificationReason?: string;
  postUrl?: string;
  commentUrl?: string;
  itemsNew?: number;
  itemsQualified?: number;
}

export function formatPostScanLine(input: PostScanLineInput): string {
  const title = toSnippet(input.title, 80);
  const snippet = toSnippet(input.bodySnippet);
  const parts = [title ? `Post "${title}"` : 'Post'];

  maybePush(parts, snippet ? `snippet: ${snippet}` : undefined);
  parts.push(formatOutcome(input.qualified, input.qualificationReason));
  maybePush(parts, input.postUrl ? `post: ${input.postUrl}` : undefined);
  parts.push(`id: ${input.postId}`);

  if (typeof input.itemsNew === 'number' && typeof input.itemsQualified === 'number') {
    parts.push(`totals new=${input.itemsNew}, qualified=${input.itemsQualified}`);
  }

  return parts.join(' | ');
}

export function formatCommentScanLine(input: CommentScanLineInput): string {
  const snippet = toSnippet(input.commentSnippet);
  const parts = [snippet ? `Comment "${snippet}"` : `Comment by ${input.author}`];

  parts.push(`author: ${input.author}`);
  parts.push(formatOutcome(input.qualified, input.qualificationReason));
  maybePush(parts, input.commentUrl ? `comment: ${input.commentUrl}` : undefined);
  maybePush(parts, input.postUrl ? `post: ${input.postUrl}` : undefined);
  parts.push(`ids: comment=${input.commentId}, post=${input.postId}`);

  if (typeof input.itemsNew === 'number' && typeof input.itemsQualified === 'number') {
    parts.push(`totals new=${input.itemsNew}, qualified=${input.itemsQualified}`);
  }

  return parts.join(' | ');
}

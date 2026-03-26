import fs from 'node:fs';
import { formatCommentScanLine, formatPostScanLine, toSnippet } from '../../utils/scanLogFormatting.js';

const LOG_ENTRY_START = /^\[[^\]]+\] \[[^\]]+\]/;
const ERROR_ENTRY_START = /^\[[^\]]+\] \[ERROR\]/;
const LOG_HEADER_PATTERN = /^\[([^\]]+)\] \[([^\]]+)\]\s?(.*)$/;

interface ParsedLogEntry {
  timestamp: string;
  level: string;
  message: string;
}

interface PostContext {
  title?: string;
  bodySnippet?: string;
  postUrl?: string;
}

interface CommentContext {
  postId: string;
  commentId: string;
  author: string;
  commentSnippet?: string;
  postUrl?: string;
  commentUrl?: string;
}

function parseLogEntries(logContent: string): ParsedLogEntry[] {
  const entries: ParsedLogEntry[] = [];
  let current: ParsedLogEntry | null = null;

  for (const line of logContent.split('\n')) {
    const match = line.match(LOG_HEADER_PATTERN);
    if (match) {
      if (current) {
        entries.push(current);
      }

      current = {
        timestamp: match[1] ?? '',
        level: match[2] ?? 'INFO',
        message: match[3] ?? ''
      };
      continue;
    }

    if (!current) {
      continue;
    }

    current.message = current.message ? `${current.message}\n${line}` : line;
  }

  if (current) {
    entries.push(current);
  }

  return entries;
}

function parseJsonObject(message: string): Record<string, unknown> | null {
  const trimmed = message.trim();
  if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) {
    return null;
  }

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null;
    }

    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

function toRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function getStringField(input: Record<string, unknown>, key: string): string | undefined {
  const value = input[key];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function getBooleanField(input: Record<string, unknown>, key: string): boolean | undefined {
  const value = input[key];
  return typeof value === 'boolean' ? value : undefined;
}

function buildCommentKey(postId: string, commentId: string): string {
  return `${postId}::${commentId}`;
}

export function formatRunLogPretty(logContent: string): string {
  const entries = parseLogEntries(logContent);
  if (entries.length === 0) {
    return logContent;
  }

  const lines: string[] = [];
  const postContexts = new Map<string, PostContext>();
  const commentContexts = new Map<string, CommentContext>();

  for (const entry of entries) {
    const payload = parseJsonObject(entry.message);
    if (!payload) {
      if (entry.level === 'ERROR' || entry.level === 'WARN') {
        lines.push(`${entry.timestamp} [${entry.level}] ${entry.message.trim()}`);
      }
      continue;
    }

    const eventName = getStringField(payload, 'event');
    if (!eventName) {
      continue;
    }

    switch (eventName) {
      case 'run_start': {
        const jobName = getStringField(payload, 'jobName') ?? getStringField(payload, 'jobId') ?? 'unknown job';
        lines.push(`${entry.timestamp} Run started for ${jobName}`);
        break;
      }
      case 'subreddit_fetched': {
        const subreddit = getStringField(payload, 'subreddit') ?? '?';
        const postCount = payload.postCount;
        const count = typeof postCount === 'number' ? postCount : '?';
        lines.push(`${entry.timestamp} Fetched r/${subreddit}: ${count} posts`);
        break;
      }
      case 'post_qualify_start': {
        const postId = getStringField(payload, 'postId');
        if (!postId) {
          break;
        }

        postContexts.set(postId, {
          title: getStringField(payload, 'title'),
          bodySnippet: toSnippet(getStringField(payload, 'body')),
          postUrl: getStringField(payload, 'url')
        });
        break;
      }
      case 'post_qualify_result': {
        const postId = getStringField(payload, 'postId');
        if (!postId) {
          break;
        }

        const result = toRecord(payload.result);
        const context = postContexts.get(postId);
        lines.push(
          `${entry.timestamp} ${formatPostScanLine({
            postId,
            title: context?.title,
            bodySnippet: context?.bodySnippet,
            qualified: result ? getBooleanField(result, 'qualified') : undefined,
            qualificationReason: result ? getStringField(result, 'reason') : undefined,
            postUrl: context?.postUrl
          })}`
        );
        break;
      }
      case 'comment_qualify_start': {
        const postId = getStringField(payload, 'postId');
        const commentId = getStringField(payload, 'commentId');
        const author = getStringField(payload, 'author') ?? '[unknown]';
        if (!postId || !commentId) {
          break;
        }

        commentContexts.set(buildCommentKey(postId, commentId), {
          postId,
          commentId,
          author,
          commentSnippet: toSnippet(getStringField(payload, 'commentBody')),
          postUrl: getStringField(payload, 'postUrl'),
          commentUrl: getStringField(payload, 'commentUrl')
        });
        break;
      }
      case 'comment_qualify_result': {
        const postId = getStringField(payload, 'postId');
        const commentId = getStringField(payload, 'commentId');
        const fallbackAuthor = getStringField(payload, 'author') ?? '[unknown]';
        if (!postId || !commentId) {
          break;
        }

        const result = toRecord(payload.result);
        const context = commentContexts.get(buildCommentKey(postId, commentId));
        lines.push(
          `${entry.timestamp} ${formatCommentScanLine({
            postId,
            commentId,
            author: context?.author ?? fallbackAuthor,
            commentSnippet: context?.commentSnippet,
            qualified: result ? getBooleanField(result, 'qualified') : undefined,
            qualificationReason: result ? getStringField(result, 'reason') : undefined,
            postUrl: context?.postUrl,
            commentUrl: context?.commentUrl
          })}`
        );
        break;
      }
      case 'run_complete': {
        const stats = toRecord(payload.stats);
        const discovered = stats?.itemsDiscovered;
        const fresh = stats?.itemsNew;
        const qualified = stats?.itemsQualified;
        lines.push(
          `${entry.timestamp} Scan complete (discovered=${String(discovered ?? '?')}, new=${String(
            fresh ?? '?'
          )}, qualified=${String(qualified ?? '?')})`
        );
        break;
      }
      case 'run_failed': {
        const message = getStringField(payload, 'message') ?? 'Unknown error';
        lines.push(`${entry.timestamp} [ERROR] Run failed: ${message}`);
        break;
      }
      default:
        break;
    }
  }

  if (lines.length === 0) {
    return logContent;
  }

  return `${lines.join('\n')}\n`;
}

export function readRunLog(logFilePath: string | null | undefined): string | null {
  if (!logFilePath || !fs.existsSync(logFilePath)) {
    return null;
  }

  return fs.readFileSync(logFilePath, 'utf8');
}

export function extractErrorEntries(logContent: string): string[] {
  const lines = logContent.split('\n');
  const entries: string[] = [];
  let current: string[] = [];
  let inErrorEntry = false;

  for (const line of lines) {
    if (ERROR_ENTRY_START.test(line)) {
      if (current.length > 0) {
        entries.push(current.join('\n').trimEnd());
      }
      current = [line];
      inErrorEntry = true;
      continue;
    }

    if (LOG_ENTRY_START.test(line)) {
      if (current.length > 0) {
        entries.push(current.join('\n').trimEnd());
      }
      current = [];
      inErrorEntry = false;
      continue;
    }

    if (inErrorEntry) {
      current.push(line);
    }
  }

  if (current.length > 0) {
    entries.push(current.join('\n').trimEnd());
  }

  return entries.filter((entry) => entry.length > 0);
}

export function hasErrorEntries(logContent: string | null): boolean {
  if (!logContent) {
    return false;
  }

  return extractErrorEntries(logContent).length > 0;
}

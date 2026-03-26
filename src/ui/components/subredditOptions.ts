export function normalizeSubreddit(value: string): string {
  return value.trim().replace(/^r\//i, '').replace(/\s+/g, '');
}

export function resolveCustomSubreddit(
  options: string[],
  rawInput: string
): { normalized: string | null; nextOptions: string[] } {
  const normalized = normalizeSubreddit(rawInput);
  if (!normalized) {
    return { normalized: null, nextOptions: options };
  }

  if (options.includes(normalized)) {
    return { normalized, nextOptions: options };
  }

  return { normalized, nextOptions: [...options, normalized] };
}
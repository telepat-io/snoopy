---
title: E2E Smoke Testing
sidebar_position: 6
---

# E2E Smoke Testing Guide

Use this guide to verify the core path:

1. create a job
2. run qualification on 5 new items
3. delete job and related analytics

## One-Command Smoke Test

```bash
npm run e2e:smoke
```

The script:

- validates required OpenRouter credentials exist
- creates a temporary job
- runs manual execution with item limit
- deletes the job in cleanup

Implementation path:

- `src/scripts/e2eSmoke.ts`

## Prerequisites

Before running smoke test:

- `snoopy settings` has valid OpenRouter API key
- optional: configure Reddit OAuth fallback credentials for environments where unauthenticated Reddit JSON access is blocked

Check quickly:

```bash
npm run dev -- doctor
```

## Optional Environment Variables

- `SNOOPY_E2E_LIMIT` default `5`
- `SNOOPY_E2E_SUBREDDITS` default `startups,entrepreneur`
- `SNOOPY_E2E_KEEP_JOB` default `false`

Example:

```bash
SNOOPY_E2E_LIMIT=5 SNOOPY_E2E_SUBREDDITS=startups,entrepreneur npm run e2e:smoke
```

Keep job for inspection:

```bash
SNOOPY_E2E_KEEP_JOB=true npm run e2e:smoke
```

## Manual Equivalent Flow

If you need full manual control:

1. Create job:

```bash
npm run dev -- job add
```

2. Run 5-item test:

```bash
npm run dev -- job run <jobRef> --limit 5
```

3. Inspect history:

```bash
npm run dev -- job runs <jobRef>
```

4. Delete and cascade cleanup:

```bash
npm run dev -- delete <jobRef>
```

## What Good Output Looks Like

- Run completes without errors.
- Exactly 5 new items are processed when `--limit 5` is used.
- Qualification reasons are concise and aligned with job prompt.
- No repeated fallback reason such as `Model output invalid; marked unqualified`.

## Troubleshooting

If smoke test fails:

1. Run `npm run dev -- doctor`.
2. Verify OpenRouter API key in `settings`.
3. If Reddit access is denied in your environment, configure Reddit OAuth fallback credentials in `settings`.
4. Check daemon state if relevant (`daemon status`).
5. Review logs at `<root>/logs/snoopy.log`.
6. Re-run with `SNOOPY_E2E_KEEP_JOB=true` to inspect persisted data.

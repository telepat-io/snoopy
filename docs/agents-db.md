---
title: Agent DB Operations
sidebar_position: 7
---

# Agent DB Operations

This guide is for AI agents and automation scripts that need a non-interactive control path.

Snoopy has interactive CLI flows for:

- `snoopy job add`
- `snoopy settings`

For deterministic automation, use direct SQLite access for job/result data and use non-interactive CLI commands for daemon/startup control.

## Prerequisites

- Build once: `npm run build`
- Know DB path pattern: `<rootDir>/snoopy.db`
- Default root directory is `<home>/.snoopy` on all supported OSs
  - macOS example: `~/.snoopy/snoopy.db`
  - Linux example: `~/.snoopy/snoopy.db`
  - Windows example: `C:\Users\<you>\.snoopy\snoopy.db`
- Optional override root: `SNOOPY_ROOT_DIR` (DB path becomes `<SNOOPY_ROOT_DIR>/snoopy.db`)

Open DB with sqlite3:

```bash
sqlite3 ~/.snoopy/snoopy.db
```

## Quick Capability Map

Use direct DB for:

- listing jobs
- inserting/updating/deleting jobs
- reading runs and scan results
- updating result lifecycle flags (`viewed`, `validated`, `processed`)

Use CLI for:

- daemon process lifecycle (`daemon start|stop|status|reload`)
- startup registration (`startup enable|disable|status`, or `reboot` aliases)
- health checks (`doctor`)
- running a job (`job run <jobRef> --limit N`)

## 1) List Jobs Directly

```sql
SELECT
  id,
  slug,
  name,
  enabled,
  monitor_comments,
  schedule_cron,
  created_at,
  updated_at
FROM jobs
ORDER BY datetime(created_at) DESC;
```

- `enabled = 1` means scheduler can run it.
- `monitor_comments = 1` means comment qualification is enabled.

## 2) Add an Existing Job Directly (Non-Interactive)

If interactive `job add` is not suitable, insert directly.

```sql
INSERT INTO jobs (
  id,
  slug,
  name,
  description,
  qualification_prompt,
  subreddits_json,
  schedule_cron,
  enabled,
  monitor_comments,
  created_at,
  updated_at
) VALUES (
  lower(hex(randomblob(16))),
  'lead-monitor-saas',
  'Lead Monitor SaaS',
  'Track high-intent SaaS buying questions',
  'Qualify only if the user is actively seeking SaaS recommendations or alternatives.',
  '["startups","entrepreneur","SaaS"]',
  '*/30 * * * *',
  1,
  1,
  datetime('now'),
  datetime('now')
);
```

Verification:

```sql
SELECT id, slug, name, enabled, monitor_comments
FROM jobs
WHERE slug = 'lead-monitor-saas';
```

Notes:

- Keep `slug` unique (`idx_jobs_slug`).
- `subreddits_json` must be valid JSON array text.
- Use `BEGIN TRANSACTION; ... COMMIT;` for multi-statement writes.

## 3) Verify Daemon and Startup State

Check daemon state:

```bash
npm run dev -- daemon status
```

Check startup registration:

```bash
npm run dev -- startup status
```

Run comprehensive health checks:

```bash
npm run dev -- doctor
```

If needed, remediate:

```bash
npm run dev -- daemon start
npm run dev -- startup enable
```

Alias group is equivalent for startup controls:

```bash
npm run dev -- reboot enable
npm run dev -- reboot status
```

## 4) Run a Job Non-Interactively

```bash
npm run dev -- job run <jobRef> --limit 5
```

- `<jobRef>` can be job ID or slug.
- Use `--limit` during validation/smoke workflows.

## 5) Read Runs and Results Directly

Latest runs for one job:

```sql
SELECT
  id,
  status,
  message,
  started_at,
  finished_at,
  items_discovered,
  items_new,
  items_qualified,
  prompt_tokens,
  completion_tokens,
  estimated_cost_usd,
  created_at
FROM job_runs
WHERE job_id = ?
ORDER BY datetime(created_at) DESC
LIMIT 20;
```

Latest qualified results for one job:

```sql
SELECT
  id,
  run_id,
  subreddit,
  author,
  title,
  url,
  qualified,
  viewed,
  validated,
  processed,
  qualification_reason,
  reddit_posted_at,
  created_at
FROM scan_items
WHERE job_id = ?
  AND qualified = 1
ORDER BY datetime(reddit_posted_at) DESC, datetime(created_at) DESC;
```

## 6) Update Result Lifecycle Flags

Mark one item reviewed and validated:

```sql
UPDATE scan_items
SET viewed = 1,
    validated = 1
WHERE id = ?;
```

Mark all qualified items from a run as processed:

```sql
UPDATE scan_items
SET processed = 1
WHERE run_id = ?
  AND qualified = 1;
```

Count backlog:

```sql
SELECT COUNT(*) AS unprocessed_qualified
FROM scan_items
WHERE job_id = ?
  AND qualified = 1
  AND processed = 0;
```

## 7) Minimal Agent Runbook

1. Confirm DB connectivity.
2. Ensure target job exists (`jobs` query) or insert it.
3. Check `daemon status` and `startup status`.
4. If missing, run `daemon start` and `startup enable` (or `reboot enable`).
5. Trigger `job run <jobRef> --limit 5` for verification.
6. Query `job_runs` and `scan_items` to validate outcomes.
7. Update `viewed`, `validated`, and `processed` flags as workflow advances.

## Schema Detail

Use [Database Schema](database-schema.md) as the canonical source for table definitions, defaults, and indexes.

---
title: Database Schema
sidebar_position: 3
---

# Database Schema

Snoopy uses a local SQLite database.

## Storage Location

Default path:

- `~/.snoopy/snoopy.db`

Override root directory:

- Set `SNOOPY_ROOT_DIR`

Then DB path becomes:

- `<SNOOPY_ROOT_DIR>/snoopy.db`

## Schema Sources

- Migration SQL files in `src/services/db/migrations/`
- Runtime bootstrap in `src/services/db/sqlite.ts` for backward-compatible column additions

## Tables

### settings

Purpose:

- stores key-value app settings and credentials metadata

Columns:

- `key TEXT PRIMARY KEY`
- `value TEXT NOT NULL`
- `updated_at TEXT NOT NULL DEFAULT datetime('now')`

Common keys:

- `model`
- `model_settings_json`
- `reddit_app_name`
- `reddit_client_id`

### jobs

Purpose:

- defines monitoring jobs

Columns:

- `id TEXT PRIMARY KEY`
- `slug TEXT UNIQUE`
- `name TEXT NOT NULL UNIQUE`
- `description TEXT NOT NULL`
- `qualification_prompt TEXT NOT NULL`
- `subreddits_json TEXT NOT NULL`
- `schedule_cron TEXT NOT NULL DEFAULT '*/30 * * * *'`
- `enabled INTEGER NOT NULL DEFAULT 1`
- `monitor_comments INTEGER NOT NULL DEFAULT 1`
- `created_at TEXT NOT NULL DEFAULT datetime('now')`
- `updated_at TEXT NOT NULL DEFAULT datetime('now')`

Indexes:

- `idx_jobs_slug` unique index on `slug`

Notes:

- Commands accept job ID or slug.
- Slugs are generated and made unique in repository logic.

### job_runs

Purpose:

- stores each scheduled/manual execution attempt

Columns in active runtime schema:

- `id TEXT PRIMARY KEY`
- `job_id TEXT NOT NULL` (FK to `jobs.id`)
- `status TEXT NOT NULL` (`running`, `completed`, `failed`, `skipped`)
- `message TEXT`
- `started_at TEXT`
- `finished_at TEXT`
- `items_discovered INTEGER NOT NULL DEFAULT 0`
- `items_new INTEGER NOT NULL DEFAULT 0`
- `items_qualified INTEGER NOT NULL DEFAULT 0`
- `prompt_tokens INTEGER NOT NULL DEFAULT 0`
- `completion_tokens INTEGER NOT NULL DEFAULT 0`
- `estimated_cost_usd REAL`
- `log_file_path TEXT`
- `created_at TEXT NOT NULL DEFAULT datetime('now')`

Notes:

- Migration 001 initializes a minimal version.
- Runtime bootstrap upgrades older local DBs by adding newer analytics columns.
- `log_file_path` points to the per-run log file under `~/.snoopy/logs/` when detailed logging is available.

### scan_items

Purpose:

- deduplicated store of scanned posts/comments and qualification outcome

Columns:

- `id TEXT PRIMARY KEY`
- `job_id TEXT NOT NULL` (FK to `jobs.id`)
- `run_id TEXT NOT NULL` (FK to `job_runs.id`)
- `type TEXT NOT NULL CHECK(type IN ('post','comment'))`
- `reddit_post_id TEXT NOT NULL`
- `reddit_comment_id TEXT`
- `subreddit TEXT NOT NULL`
- `author TEXT NOT NULL`
- `title TEXT`
- `body TEXT NOT NULL`
- `url TEXT NOT NULL`
- `reddit_posted_at TEXT NOT NULL`
- `qualified INTEGER NOT NULL DEFAULT 0`
- `qualification_reason TEXT`
- `created_at TEXT NOT NULL DEFAULT datetime('now')`

Indexes:

- `idx_scan_items_dedup` unique index on `(job_id, reddit_post_id, COALESCE(reddit_comment_id,''))`

Behavior:

- prevents re-processing same post/comment per job
- stores final qualification reason for auditability

### daemon_state

Purpose:

- reserved runtime state table for daemon lifecycle

Columns:

- `id INTEGER PRIMARY KEY CHECK (id = 1)`
- `is_running INTEGER NOT NULL`
- `updated_at TEXT NOT NULL DEFAULT datetime('now')`

## Deletion and Data Lifecycle

Deleting a job via CLI/repository removes:

1. `scan_items` rows for the job
2. `job_runs` rows for the job
3. associated run log files referenced by `job_runs.log_file_path` (when present)
4. `jobs` row itself

This deletion is executed in a DB transaction in repository logic.

## Query Examples

Latest runs for one job:

```sql
SELECT *
FROM job_runs
WHERE job_id = ?
ORDER BY created_at DESC
LIMIT 20;
```

Latest qualified items for one run:

```sql
SELECT reddit_post_id, reddit_comment_id, qualified, qualification_reason
FROM scan_items
WHERE run_id = ?
ORDER BY created_at DESC;
```

---
title: Database Schema
sidebar_position: 3
---

# Database Schema

Snoopy uses a local SQLite database.

## Storage Location

Path pattern:

- `<rootDir>/snoopy.db`

Default root directory is `<home>/.snoopy` on all supported OSs:

- macOS example: `~/.snoopy/snoopy.db`
- Linux example: `~/.snoopy/snoopy.db`
- Windows example: `C:\Users\<you>\.snoopy\snoopy.db`

Default path (macOS/Linux):

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
- `idx_job_runs_active_job` enforces at most one `running` row per `job_id` to prevent overlapping runs.

### scan_items

Purpose:

- deduplicated store of scanned posts/comments and qualification outcome
- supports lightweight result lifecycle tracking for downstream automation

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
- `viewed INTEGER NOT NULL DEFAULT 0`
- `validated INTEGER NOT NULL DEFAULT 0`
- `processed INTEGER NOT NULL DEFAULT 0`
- `qualification_reason TEXT`
- `created_at TEXT NOT NULL DEFAULT datetime('now')`

Indexes:

- `idx_scan_items_dedup` unique index on `(job_id, reddit_post_id, COALESCE(reddit_comment_id,''))`

Behavior:

- prevents re-processing same post/comment per job
- stores final qualification reason for auditability
- lifecycle flag semantics:
	- `viewed = 1` result has been reviewed by an operator or agent
	- `validated = 1` result has been quality-checked/accepted
	- `processed = 1` result has been handed off to downstream workflow

Notes:

- SQLite stores booleans as integers (`0` false, `1` true).
- Newer runtime versions backfill missing lifecycle columns with `ALTER TABLE` during startup for older local DBs.

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

Unprocessed qualified items for one job:

```sql
SELECT
	id,
	url,
	author,
	title,
	qualification_reason,
	viewed,
	validated,
	processed,
	reddit_posted_at
FROM scan_items
WHERE job_id = ?
	AND qualified = 1
	AND processed = 0
ORDER BY datetime(reddit_posted_at) DESC;
```

Mark one result as viewed + validated:

```sql
UPDATE scan_items
SET viewed = 1,
		validated = 1
WHERE id = ?;
```

Bulk mark qualified results as processed for one run:

```sql
UPDATE scan_items
SET processed = 1
WHERE run_id = ?
	AND qualified = 1;
```

## Agent Workflow Reference

For end-to-end direct DB workflows (list jobs, insert jobs, verify daemon/startup state, run jobs, read/update results), see [Agent Operations](../guides/agent-operations.md).

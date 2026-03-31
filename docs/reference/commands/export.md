---
title: export
sidebar_position: 8
---

# `export`

Use `export` to regenerate data artifacts from the local database.

## `export [jobRef]`

Regenerates per-job export files containing qualified results.

```bash
snoopy export
snoopy export <jobRef>
snoopy export --csv
snoopy export --json
snoopy export <jobRef> --json --last-run
```

Arguments:

- `[jobRef]`: optional job ID or slug

Options:

- `--csv`: export in CSV format (default)
- `--json`: export in raw JSON format
- `--last-run`: export only rows from each job's latest run
- `--limit <count>`: maximum rows written per job file (default: `100`)

Behavior:

- without `jobRef`, exports all jobs
- with `jobRef`, exports only one job
- each job writes to `~/.snoopy/results/<timestamp>_<job-slug>.<ext>`
- timestamp format is UTC compact: `YYYYMMDD-HHmmss`
- files are fully regenerated from database truth on every command run
- row order is newest first (most recently posted first)
- `--last-run` scopes rows to the latest run per selected job
- `--limit` caps rows per file; increase it when a job has many qualified results

CSV columns:

- `URL`
- `Title`
- `Truncated Content` (300 chars + `...` when longer)
- `Author`
- `Justification`
- `Date`

JSON shape:

- array of qualified row objects from `scan_items`
- includes fields such as `id`, `jobId`, `runId`, `author`, `title`, `body`, `url`, `redditPostedAt`, `qualificationReason`, `createdAt`

Notes:

- this command is manual; job runs do not auto-write export files
- deleting a job does not retroactively remove previously exported timestamped files

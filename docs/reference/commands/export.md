---
title: export
sidebar_position: 8
---

# `export`

Use `export` to regenerate data artifacts from the local database.

## `export csv [jobRef]`

Regenerates per-job CSV files containing qualified results.

```bash
snoopy export csv
snoopy export csv <jobRef>
```

Arguments:

- `[jobRef]`: optional job ID or slug

Behavior:

- without `jobRef`, exports all jobs
- with `jobRef`, exports only one job
- each job writes to `~/.snoopy/results/<job-slug>.csv`
- files are fully regenerated from database truth on every command run
- row order is newest first

Columns:

- `URL`
- `Title`
- `Truncated Content` (300 chars + `...` when longer)
- `Author`
- `Justification`
- `Date`

Notes:

- this command is manual; job runs do not auto-write CSV files
- deleting a job also deletes its corresponding CSV file

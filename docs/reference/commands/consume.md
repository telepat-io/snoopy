---
title: consume
sidebar_position: 9
---

# `consume`

Use `consume` to list unconsumed qualified results and mark them as consumed so they are not returned again.

## `consume [jobRef]`

Lists the most recent unconsumed qualified results, then marks them consumed.

```bash
snoopy consume
snoopy consume <jobRef>
snoopy consume --limit 10
snoopy consume <jobRef> --json
snoopy consume --json --dry-run
```

Arguments:

- `[jobRef]`: optional job ID or slug

Options:

- `--limit <count>`: maximum number of results to return (default: all unconsumed)
- `--json`: output raw JSON array to stdout instead of a human-readable list
- `--dry-run`: preview results without marking them consumed

Behavior:

- without `jobRef`, returns unconsumed results across all jobs
- with `jobRef`, returns unconsumed results for only that job
- results are ordered newest first (most recently created first)
- after displaying, returned rows are marked `consumed = 1` in the database
- subsequent calls will skip already-consumed results
- when `--json` is used with no results, an empty array `[]` is printed

JSON shape:

- array of qualified row objects from `scan_items`
- includes fields such as `id`, `jobId`, `runId`, `author`, `title`, `body`, `url`, `redditPostedAt`, `qualificationReason`, `createdAt`, `consumed`

Notes:

- this command is the read-once counterpart to `export`; use `export` for on-demand file generation
- `--dry-run` is useful for agents or scripts that want to preview before consuming
- the `consumed` flag is separate from `viewed`, `validated`, and `processed`

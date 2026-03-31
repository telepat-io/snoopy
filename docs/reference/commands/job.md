---
title: job
sidebar_position: 2
---

# `job`

Use `job` to create, inspect, run, enable, disable, and delete monitoring jobs.

The plural `jobs` group is an alias for the same operational commands.

## Aliases

These commands behave the same as their `job` counterparts:

- `jobs list`
- `jobs enable [jobRef]`
- `jobs disable [jobRef]`
- `jobs remove [jobRef]`
- `jobs delete [jobRef]`
- `jobs run [jobRef] [--limit N]`
- `jobs runs [jobRef]`

Examples:

```bash
snoopy jobs list
snoopy jobs run my-job --limit 5
snoopy jobs delete my-job
```

## Subcommands

### `job add`

Starts the interactive job creation flow.

```bash
snoopy job add
```

What it does:

- collects natural-language monitoring intent
- asks follow-up questions
- generates name, slug, description, and qualification prompt
- prompts for missing credentials/settings when needed
- asks whether to register OS startup on reboot/login (defaults to Yes)
- saves the job locally
- runs an immediate first scan with the same progress and summary output as `job run`
- keeps the job unscheduled while that first run is in progress, then enables scheduled runs when the attempt ends

If you interrupt the initial run with Ctrl+C, Snoopy enables the job before exit so cron scheduling can continue.

### `job list`

Lists all configured jobs.

```bash
snoopy job list
```

### `job remove [jobRef]`
### `job delete [jobRef]`

Deletes a job and cascades cleanup of related runs, scan items, run log files, and exported CSV files.

```bash
snoopy job delete
snoopy job delete <jobRef>
```

If `jobRef` is omitted, Snoopy shows all jobs and lets you choose one with up/down arrows and Enter.

When detailed run logging is enabled, deleting a job also removes the corresponding `run-<runId>.log` files under `~/.snoopy/logs/`.

Deleting a job also removes its results file under `~/.snoopy/results/<job-slug>.csv` when present.

### `job enable [jobRef]`
### `job disable [jobRef]`

Enables or disables scheduled execution.

```bash
snoopy job enable
snoopy job enable <jobRef>
snoopy job disable
snoopy job disable <jobRef>
```

If `jobRef` is omitted, Snoopy shows all jobs and lets you choose one with up/down arrows and Enter.

### `job run [jobRef] [--limit N]`

Runs one job immediately.

Arguments:

- `[jobRef]`: optional job ID or slug

Options:

- `-l, --limit <count>`: maximum number of new post/comment items to qualify during the run

```bash
snoopy job run
snoopy job run <jobRef>
snoopy job run <jobRef> --limit 5
```

If `jobRef` is omitted, Snoopy shows all jobs and lets you choose one with up/down arrows and Enter.

Output notes:

- Rich TTY runs render post/comment scan updates as compact multi-line blocks with indented fields.
- Labels are colorized for readability.
- Qualification status is color-coded: `qualified` (green), `not qualified` (red), `pending` (yellow).

### `job runs [jobRef]`

Lists recent run history.

If `jobRef` is omitted, this command returns recent runs across jobs.

```bash
snoopy job runs
snoopy job runs <jobRef>
```

`job runs` only shows run history. To regenerate per-job result files, run:

```bash
snoopy export
snoopy export <jobRef> --json --last-run
```

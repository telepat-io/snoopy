```text
⠀⠀⠀⠀⠀⠀⠰⡊⣿⣷⣂⠄⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⣀⣴⢶⠀⠀⠈⣉⣽⣯⠃⠀⠀⠀⠀⠀⠀⠀⠀
⢀⢴⡿⡷⠁⣠⠊⠉⠂⠀⠀⠙⠒⠒⠒⠒⠢⢀⠀⠀
⡜⣿⣿⣵⣶⡃⠀⠀⢀⡤⠂⠈⠉⠀⣀⡀⠀⠀⢆⠀
⠙⠾⠿⠃⢹⠀⠀⠀⠀⠀⠀⠀⠀⠈⠋⠀⡀⠀⡞⠀
⠀⠀⠀⠀⠘⢆⠀⠀⠀⠣⣀⠀⠀⠀⢀⡴⠵⠊⠀⠀
⠀⠀⠀⠀⠀⠀⠑⣆⡤⠤⢬⠙⠉⡽⠋⢐⡲⢲⠀⠀
⠀⠀⠀⠀⠀⢰⡓⠃⠷⠤⠴⠗⠈⠉⠈⠁⣀⢰⠃⠀
⠀⠀⠀⠀⠀⠀⠥⣆⠖⠒⠢⡀⠀⠀⠈⢏⠈⠁⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⢗⣤⠁⠀⠀⠀⠀⠃⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⢠⠊⢢⣇⠀⠀⠀⣀⢐⠗⡲⡰⢢
⠀⠀⠀⠀⠀⠀⠀⠘⡆⠀⠉⠠⢏⡁⢸⢇⠄⢆⠔⡸
⠀⠀⠀⠀⠀⠀⠀⠀⠈⠳⢤⣆⣂⡹⠸⣀⣃⡫⠞⠁
```

# Snoopy

[![Build](https://img.shields.io/github/actions/workflow/status/cozymantis/snoopy/ci.yml?branch=main&label=build)](https://github.com/cozymantis/snoopy/actions/workflows/ci.yml)
[![Coverage](https://img.shields.io/badge/coverage-94.6%25-brightgreen)](#development)
[![npm](https://img.shields.io/npm/v/snoopy-cli)](https://www.npmjs.com/package/snoopy-cli)

Snoopy helps you monitor Reddit for high-intent conversations that match your business goals.

Define what you care about in plain language, let Snoopy create a monitoring job, and continuously scan and qualify posts/comments so you can focus on response and outreach.

## Why Use Snoopy

- Turn broad Reddit traffic into a focused stream of opportunities.
- Define qualification logic once, then run continuously.
- Trigger manual runs when you want quick validation.
- Track run analytics (discovered/new/qualified items, token usage, cost estimate).
- Run cross-platform with startup-on-reboot support.

## What It Does

- Interactive job creation flow from natural-language criteria.
- AI-assisted clarification and job spec generation.
- Qualification against your prompt for posts (and comments when enabled).
- Local SQLite persistence for jobs, runs, and scan items.
- Built-in daemon for scheduled scanning (cron expressions).
- On-demand CSV export of qualified results per job.
- Startup registration for macOS, Linux, and Windows.
- Health checks via the doctor command.

## Install

Requirements:
- Node.js 20+
- npm 10+

From npm:

```bash
npm install -g snoopy-cli
snoopy --help
```

From source:

```bash
npm install
npm run build
npm link
```

Run the CLI:

```bash
snoopy --help
```

## Development

Core validation commands:

```bash
npm run lint
npm run build
npm test
```

To refresh coverage locally:

```bash
npm test -- --coverage
```

## Quick Start

Note:
- Snoopy uses Reddit public JSON endpoints by default.
- Optional Reddit OAuth fallback credentials can be configured in `snoopy settings` for environments where unauthenticated access is blocked.
- `snoopy settings` shows a full settings menu so you can jump directly to any setting and save once.

1. Start interactive setup and create your first job:

```bash
snoopy job add
```

`job add` now runs an immediate first scan after saving the job so you can validate results right away.
Snoopy pauses scheduled scans for that new job during this first run attempt, then enables scheduling when it ends (including interruption/failure cases).

2. List jobs:

```bash
snoopy jobs list
```

3. Run one job immediately (limit to 5 new items while testing):

```bash
snoopy job run <jobRef> --limit 5
```

4. View run history:

```bash
snoopy job runs <jobRef>
```

5. Regenerate results CSV files (all jobs or one job):

```bash
snoopy export csv
snoopy export csv <jobRef>
```

6. Inspect one run's detailed log output:

```bash
snoopy logs <runId>
```

7. Show recent errors for one job:

```bash
snoopy errors <jobRef>
```

8. Enable daemon mode:

```bash
snoopy daemon start
snoopy daemon reload
```

For local development without linking the package globally:

```bash
npm run dev -- --help
```

## Most Used Commands

- `job add`
- `job list`
- `job run <jobRef> --limit <N>`
- `job runs [jobRef]`
- `export csv [jobRef]`
- `logs <runId>`
- `errors <jobRef> --hours <N>`
- `start <jobRef>` / `stop <jobRef>`
- `delete <jobRef>`
- `daemon start|stop|status`
- `daemon reload`
- `startup status`
- `doctor`

## Run Logs

- Each job run writes a dedicated log file under `~/.snoopy/logs/`.
- Files are named `run-<runId>.log`.
- Logs include full JSON request/response payloads for Reddit and OpenRouter calls, plus run lifecycle events and errors.
- Run logs older than 5 days are deleted automatically on daemon startup and after each job run.
- Deleting a job also deletes all associated per-run log files for that job.

## Results CSV Exports

- Export files are generated on demand with `export csv`.
- Files are written under `~/.snoopy/results/`.
- Each job gets one file named `<job-slug>.csv`.
- CSV files are regenerated from database truth on each export command.
- Deleting a job also deletes that job's CSV file.

## Live E2E Smoke Test

Use the built-in smoke harness to verify create -> run(5) -> delete:

```bash
npm run e2e:smoke
```

Optional env vars:
- `SNOOPY_E2E_LIMIT` (default `5`)
- `SNOOPY_E2E_SUBREDDITS` (default `startups,entrepreneur`)
- `SNOOPY_E2E_KEEP_JOB=true` to skip cleanup for debugging

## Full Documentation

- [Documentation Index](docs/README.md)
- [Command Reference](docs/commands/index.md)
- [Database Schema](docs/database-schema.md)
- [Agent DB Operations](docs/agents-db.md)
- [Scheduling, Cron, Daemon, and Startup](docs/scheduling-and-startup.md)
- [Security and Secret Storage](docs/security.md)
- [E2E Smoke Testing Guide](docs/e2e-testing.md)

## Docs Site

Serve the Docusaurus docs site locally:

```bash
npm run docs:start
```

Build and preview the static docs site:

```bash
npm run docs:build
npm run docs:serve
```

Deploy to GitHub Pages:

```bash
GITHUB_OWNER=cozymantis GITHUB_REPO=snoopy npm run docs:deploy
```

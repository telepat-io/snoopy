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

From source:

```bash
npm install
npm run build
```

Run with dev entrypoint:

```bash
npm run dev -- --help
```

Run built CLI:

```bash
node dist/src/cli/index.js --help
```

## Quick Start

Note:
- Snoopy uses Reddit public JSON endpoints by default.
- Optional Reddit OAuth fallback credentials can be configured in `snoopy settings` for environments where unauthenticated access is blocked.

1. Start interactive setup and create your first job:

```bash
npm run dev -- job add
```

2. List jobs:

```bash
npm run dev -- jobs list
```

3. Run one job immediately (limit to 5 new items while testing):

```bash
npm run dev -- job run <jobRef> --limit 5
```

4. View run history:

```bash
npm run dev -- job runs <jobRef>
```

5. Regenerate results CSV files (all jobs or one job):

```bash
npm run dev -- export csv
npm run dev -- export csv <jobRef>
```

6. Inspect one run's detailed log output:

```bash
npm run dev -- logs <runId>
```

7. Show recent errors for one job:

```bash
npm run dev -- errors <jobRef>
```

8. Enable daemon mode:

```bash
npm run dev -- daemon start
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
GITHUB_OWNER=gabidobo GITHUB_REPO=snoopy npm run docs:deploy
```

```text
┌─┐┌┐┌┌─┐┌─┐┌─┐┬ ┬
└─┐││││ ││ │├─┘└┬┘
└─┘┘└┘└─┘└─┘┴   ┴ 
```

# Monitor Reddit Conversations With AI

[![Build](https://img.shields.io/github/actions/workflow/status/cozymantis/snoopy/ci.yml?branch=main&label=build)](https://github.com/cozymantis/snoopy/actions/workflows/ci.yml)
[![Coverage](https://img.shields.io/badge/coverage-94.6%25-brightgreen)](#development)
[![npm](https://img.shields.io/npm/v/snoopy-cli)](https://www.npmjs.com/package/snoopy-cli)

📖 [Full documentation](https://cozymantis.github.io/snoopy/)

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

## Development

Run without a global install (contributors):

```bash
npm run dev -- --help
```

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

## Releases

Versioning and changelogs are managed automatically by [release-please](https://github.com/googleapis/release-please).

**How it works:**
1. Merge commits to `main` following [Conventional Commits](https://www.conventionalcommits.org/) (`fix:`, `feat:`, `feat!:`, etc.).
2. release-please maintains an open "Release PR" that accumulates version bumps and CHANGELOG entries.
3. Merge the Release PR to cut a release: `package.json` version is bumped, `CHANGELOG.md` is updated, a git tag is created, and the package is published to npm automatically.

**Commit types and semver mapping (while version < 1.0.0):**
- `fix:` → patch bump
- `feat:` → patch bump (minor bump is suppressed pre-1.0)
- `feat!:` or `fix!:` (breaking change) → minor bump (major bump is suppressed pre-1.0)

No manual `git tag` or `npm version` steps are needed.

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

5. View analytics globally or for one job:

```bash
snoopy analytics
snoopy analytics <jobRef>
snoopy analytics --days 7
```

6. Regenerate results CSV files (all jobs or one job):

```bash
snoopy export csv
snoopy export csv <jobRef>
```

7. Inspect one run's detailed log output:

```bash
snoopy logs <runId>
snoopy logs <runId> --raw
```

8. Show recent errors for one job:

```bash
snoopy errors <jobRef>
```

9. Enable daemon mode:

```bash
snoopy daemon start
snoopy daemon reload
```

## Most Used Commands

- `job add`
- `job list`
- `job run <jobRef> --limit <N>`
- `job runs [jobRef]`
- `analytics [jobRef] --days <N>`
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
- `snoopy logs <runId>` now shows a pretty timeline by default with post/comment text snippets, qualification result + justification, and clickable post/comment links.
- Use `snoopy logs <runId> --raw` to print the full raw log file content, including full JSON request/response payloads for Reddit and OpenRouter calls.
- Rich TTY manual runs (`snoopy job run <jobRef>`) also show text-first scan lines with clickable links and qualification justifications.
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

Docs changes pushed to `main` under `docs/` or `website/` are also rebuilt and published to GitHub Pages automatically via GitHub Actions.

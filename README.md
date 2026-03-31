```text
┌─┐┌┐┌┌─┐┌─┐┌─┐┬ ┬
└─┐││││ ││ │├─┘└┬┘
└─┘┘└┘└─┘└─┘┴   ┴ 
```

# Monitor Reddit Conversations With AI

[![Build](https://img.shields.io/github/actions/workflow/status/telepat-io/snoopy/ci.yml?branch=main&label=build)](https://github.com/telepat-io/snoopy/actions/workflows/ci.yml)
[![Coverage](https://codecov.io/gh/telepat-io/snoopy/graph/badge.svg)](https://codecov.io/gh/telepat-io/snoopy)
[![npm](https://img.shields.io/npm/v/@telepat/snoopy)](https://www.npmjs.com/package/@telepat/snoopy)

📖 [Full documentation](https://docs.telepat.io/ideon/)

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
npm install -g @telepat/snoopy
snoopy --help
```

From source:

```bash
npm install
npm run build
npm link
```

For first-time onboarding (OpenRouter key setup, first `job add`, and verification), see [Installation & Setup](docs/getting-started/installation.md).

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
snoopy job run --limit 5
snoopy job run <jobRef> --limit 5
```

If `<jobRef>` is omitted for `job run`, `job enable`, `job disable`, `job delete`, `start`, `stop`, `errors`, or `results`, Snoopy shows your job list and lets you pick with up/down arrows and Enter.

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

6. Browse results in the interactive viewer:

```bash
snoopy results
snoopy results <jobRef>
```

7. Regenerate qualified results files (all jobs or one job):

```bash
snoopy export
snoopy export <jobRef> --json --last-run
```

8. Inspect one run's detailed log output:

```bash
snoopy logs
snoopy logs <runId>
snoopy logs <runId> --raw
```

When `runId` is omitted for `logs`, Snoopy first prompts for a job, then prompts for a run from that job (up/down arrows + Enter).

9. Show recent errors for one job:

```bash
snoopy errors <jobRef>
```

10. Enable daemon mode:

```bash
snoopy daemon start
snoopy daemon reload
```

## Most Used Commands

- `job add`
- `job list`
- `job run [jobRef] --limit <N>`
- `job runs [jobRef]`
- `analytics [jobRef] --days <N>`
- `results [jobRef]`
- `export [jobRef] --csv|--json [--last-run]`
- `logs [runId]`
- `errors [jobRef] --hours <N>`
- `start [jobRef]` / `stop [jobRef]`
- `delete [jobRef]`
- `daemon start|stop|status`
- `daemon reload`
- `startup status`
- `doctor`

## Run Logs

- Each job run writes a dedicated log file under `~/.snoopy/logs/`.
- Files are named `run-<runId>.log`.
- `snoopy logs` now supports guided selection (job first, then run) and shows a pretty timeline by default with post/comment text snippets, qualification result + justification, and clickable post/comment links.
- Use `snoopy logs [runId] --raw` to print the full raw log file content, including full JSON request/response payloads for Reddit and OpenRouter calls.
- Rich TTY manual runs (`snoopy job run <jobRef>`) show compact multi-line scan blocks with indented fields, clickable links, and qualification justifications.
- In rich terminals, scan field labels are colorized and qualification status is highlighted (`qualified` in green, `not qualified` in red, `pending` in yellow).
- Run logs older than 5 days are deleted automatically on daemon startup and after each job run.
- Deleting a job also deletes all associated per-run log files for that job.

## Results Exports

- Export files are generated on demand with `export`.
- Files are written under `~/.snoopy/results/`.
- Each export writes a timestamped file like `<YYYYMMDD-HHmmss>_<job-slug>.<ext>`.
- Use `--csv` (default) or `--json` to choose output format.
- Use `--last-run` to export only qualified rows from each job's most recent run.
- Export files are regenerated from database truth on each export command.

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

- [Documentation Index](docs/index.md)
- [Getting Started Overview](docs/getting-started/overview.md)
- [Installation & Setup](docs/getting-started/installation.md)
- [Quick Start](docs/getting-started/quickstart.md)
- [CLI Reference](docs/reference/cli-reference.md)
- [Database Schema](docs/reference/database-schema.md)
- [Agent Operations](docs/guides/agent-operations.md)
- [Scheduling, Cron, Daemon, and Startup](docs/guides/scheduling-and-startup.md)
- [Security and Secret Storage](docs/technical/security.md)
- [E2E Smoke Testing Guide](docs/technical/e2e-testing.md)
- [Contributing](docs/contributing/development.md)

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
GITHUB_OWNER=telepat-io GITHUB_REPO=snoopy npm run docs:deploy
```

Docs changes pushed to `main` under `docs/` or `website/` are also rebuilt and published to GitHub Pages automatically via GitHub Actions.

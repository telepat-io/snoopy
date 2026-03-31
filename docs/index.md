---
title: Snoopy
slug: /
sidebar_position: 1
---

```text
┌─┐┌┐┌┌─┐┌─┐┌─┐┬ ┬
└─┐││││ ││ │├─┘└┬┘
└─┘┘└┘└─┘└─┘┴   ┴ 
```

# Monitor Reddit Conversations With AI

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

```bash
npm install -g @telepat/snoopy
```

Requirements: Node.js 20+, npm 10+

## Quick Start

1. Create your first monitoring job:

```bash
snoopy job add
```

2. List jobs:

```bash
snoopy jobs list
```

3. Run one job immediately (limit to 5 new items while testing):

```bash
snoopy job run --limit 5
snoopy job run <jobRef> --limit 5
```

If `<jobRef>` is omitted for `job run`, `job enable`, `job disable`, `job delete`, `start`, `stop`, or `errors`, Snoopy shows your jobs and prompts you to choose one.

4. View run history:

```bash
snoopy job runs <jobRef>
```

5. View analytics:

```bash
snoopy analytics
snoopy analytics <jobRef> --days 7
```

6. Export qualified results:

```bash
snoopy export
snoopy export <jobRef> --json --last-run
```

7. Start the background daemon:

```bash
snoopy daemon start
```

## Most Used Commands

- `job add`
- `job list`
- `job run [jobRef] --limit <N>`
- `job runs [jobRef]`
- `export [jobRef] --csv|--json [--last-run]`
- `start [jobRef]` / `stop [jobRef]`
- `delete [jobRef]`
- `daemon start|stop|status`
- `startup status`
- `doctor`

## Full Documentation

- [Getting Started Overview](getting-started/overview.md)
- [Installation](getting-started/installation.md)
- [Quick Start](getting-started/quickstart.md)
- [Guides](guides/scheduling-and-startup.md)
- [CLI Reference](reference/cli-reference.md)
- [Database Schema](reference/database-schema.md)
- [Security and Secret Storage](technical/security.md)
- [E2E Smoke Testing Guide](technical/e2e-testing.md)
- [Contributing](contributing/development.md)

Deploy to GitHub Pages:

```bash
GITHUB_OWNER=cozymantis GITHUB_REPO=snoopy npm run docs:deploy
```

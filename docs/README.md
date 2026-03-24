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
npm install -g snoopy-cli
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
snoopy job run <jobRef> --limit 5
```

4. View run history:

```bash
snoopy job runs <jobRef>
```

5. View analytics:

```bash
snoopy analytics
snoopy analytics <jobRef> --days 7
```

6. Export qualified results to CSV:

```bash
snoopy export csv
snoopy export csv <jobRef>
```

7. Start the background daemon:

```bash
snoopy daemon start
```

## Most Used Commands

- `job add`
- `job list`
- `job run <jobRef> --limit <N>`
- `job runs [jobRef]`
- `export csv [jobRef]`
- `start <jobRef>` / `stop <jobRef>`
- `delete <jobRef>`
- `daemon start|stop|status`
- `startup status`
- `doctor`

## Full Documentation

- [Command Reference](commands/index.md)
- [Database Schema](database-schema.md)
- [Agent Operations](agent-operations.md)
- [Scheduling, Cron, Daemon, and Startup](scheduling-and-startup.md)
- [Security and Secret Storage](security.md)
- [E2E Smoke Testing Guide](e2e-testing.md)

Deploy to GitHub Pages:

```bash
GITHUB_OWNER=cozymantis GITHUB_REPO=snoopy npm run docs:deploy
```

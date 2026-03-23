---
title: Snoopy
slug: /
sidebar_position: 1
---

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

5. Enable daemon mode:

```bash
npm run dev -- daemon start
```

## Most Used Commands

- `job add`
- `job list`
- `job run <jobRef> --limit <N>`
- `job runs [jobRef]`
- `start <jobRef>` / `stop <jobRef>`
- `delete <jobRef>`
- `daemon start|stop|status`
- `startup status`
- `doctor`

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

- [Command Reference](commands/index.md)
- [Database Schema](database-schema.md)
- [Scheduling, Cron, Daemon, and Startup](scheduling-and-startup.md)
- [Security and Secret Storage](security.md)
- [E2E Smoke Testing Guide](e2e-testing.md)

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

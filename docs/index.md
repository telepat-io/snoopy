---
title: Snoopy
slug: /
sidebar_position: 1
description: Monitor Reddit conversations with AI qualification, run repeatable scanning jobs on a schedule, and manage everything from the CLI.
keywords: [reddit, monitoring, cli, scheduler, ai, documentation]
---

```text
┌─┐┌┐┌┌─┐┌─┐┌─┐┬ ┬
└─┐││││ ││ │├─┘└┬┘
└─┘┘└┘└─┘└─┘┴   ┴ 
```

# Find High-Intent Conversations With AI

Snoopy monitors online conversations for high-intent signals that match your business goals.

Define what you care about in plain language, let Snoopy create a monitoring job, and continuously scan and qualify conversations so you can focus on response and outreach.

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

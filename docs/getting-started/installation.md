---
title: Installation & Setup
sidebar_position: 2
---

# Installation & Setup

Use this guide for first-time setup: install Snoopy, configure your OpenRouter key, add your first job, and verify everything is healthy.

## Requirements

- Node.js 20+
- npm 10+
- OpenRouter API key (required for qualification)

Without an OpenRouter key, job runs will fail when Snoopy reaches qualification.

## Install Snoopy

From npm (recommended):

```bash
npm install -g @telepat/snoopy
snoopy --help
```

From source (development builds):

```bash
npm install
npm run build
npm link
snoopy --help
```

## Configure OpenRouter API Key

Set your key with the interactive settings flow:

```bash
snoopy settings
```

Navigate to **OpenRouter API Key**, paste your key, then save.

Storage behavior:
- Snoopy stores secrets in your OS keychain when available.
- If keychain storage is unavailable, configure secrets via environment variables:
	- `SNOOPY_OPENROUTER_API_KEY`
	- `SNOOPY_REDDIT_CLIENT_SECRET`

If the key is missing, `snoopy job add` prompts for it during first-time setup when keychain storage is available.

## Add Your First Job

Start the guided job flow:

```bash
snoopy job add
```

What the flow does:
- Collects your monitoring intent and follow-up details
- Generates a job name, slug, and qualification prompt
- Saves the job locally
- Runs an immediate first scan
- Enables scheduled execution after that first run attempt completes

You can also use the short alias:

```bash
snoopy add
```

After setup, list your jobs:

```bash
snoopy jobs list
```

To run a quick validation scan with a cap:

```bash
snoopy job run --limit 5
snoopy job run <jobRef> --limit 5
```

## Verify Setup

Run health checks:

```bash
snoopy doctor
```

Confirm at least:
- OpenRouter API key is configured
- Database and filesystem checks pass

## First-Time Command Sequence

If you want the full setup path in one place:

```bash
# 1) Install globally
npm install -g @telepat/snoopy

# 2) Optional: configure key before creating jobs
snoopy settings

# 3) Create first job (prompts for missing key/settings as needed)
snoopy job add

# 4) Verify health
snoopy doctor
```

## Related Docs

- [CLI Reference](../reference/cli-reference.md)
- [Job command reference](../reference/commands/job.md)
- [Agent Operations](../guides/agent-operations.md)
- [Security and Secret Storage](../technical/security.md)
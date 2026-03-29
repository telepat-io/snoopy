---
title: Scheduling and Startup
sidebar_position: 4
---

# Scheduling, Cron, Daemon, and Startup

This document explains how Snoopy runs jobs continuously and survives restarts.

## Scheduling Model

- Scheduler: `node-cron`
- Each enabled job registers one cron task.
- Default schedule when creating jobs: `*/30 * * * *` (every 30 minutes).

At each tick:

1. Job is reloaded from DB.
2. If still enabled, runner executes.
3. Run stats are persisted in `job_runs`.
4. Scanned items are persisted in `scan_items` for dedupe and auditing.

## Daemon Lifecycle

Commands:

- `snoopy daemon start`
- `snoopy daemon stop`
- `snoopy daemon status`
- `snoopy daemon run`

Behavior:

- `daemon start` launches detached process and writes PID file.
- PID file path: `<root>/daemon.pid`.
- `daemon status` verifies PID file and process liveness.
- `daemon run` keeps scheduler in foreground and is useful for debugging.

## Manual Runs vs Scheduled Runs

Manual run:

```bash
snoopy job run <jobRef> --limit 5
```

Manual runs are ideal for:

- quick rubric checks
- model configuration validation
- smoke testing new jobs

Scheduled runs are best for continuous monitoring once a job is trusted.

## Cron Expressions

`jobs.schedule_cron` supports standard cron syntax used by `node-cron`.

Examples:

- `*/30 * * * *` every 30 minutes
- `0 * * * *` hourly
- `0 9 * * *` daily at 09:00

## Startup-on-Reboot/Login

Snoopy supports OS startup registration.

Commands:

- `snoopy startup install`
- `snoopy startup uninstall`
- `snoopy startup enable`
- `snoopy startup disable`
- `snoopy startup status`

Alias group:

- `snoopy reboot enable|disable|status`

### macOS

Primary method:

- launchd LaunchAgent

Status checks for:

- `~/Library/LaunchAgents/com.snoopy.daemon.plist`

### Linux

Preferred method:

- systemd user service (when available)

Fallback method:

- cron `@reboot` entry

Status checks:

- systemd service file in `~/.config/systemd/user/`
- crontab entry containing `snoopy daemon run`

### Windows

Preferred method:

- Task Scheduler job

Fallback method:

- HKCU Run registry entry

Status checks:

- `schtasks /query /tn "Snoopy\\Daemon"`
- `reg query HKCU\Software\Microsoft\Windows\CurrentVersion\Run /v SnoopyDaemon`

## Operational Recommendations

- During setup: run `snoopy doctor` after configuring settings.
- Before enabling startup: confirm `daemon start` works.
- After reboot registration: verify with `startup status` and `daemon status`.
- For debugging noisy jobs: use manual runs with `--limit`.

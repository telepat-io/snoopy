---
title: CLI Reference
sidebar_position: 1
---

# CLI Reference

This section documents the Snoopy CLI one command group at a time.

## Top-Level Commands

- `job`
- `jobs`
- `add`
- `list`
- `delete [jobRef]`
- `start [jobRef]`
- `stop [jobRef]`
- `settings`
- `daemon`
- `startup`
- `reboot`
- `export`
- `consume [jobRef]`
- `analytics [jobRef]`
- `results [jobRef]`
- `logs [runId]`
- `errors [jobRef]`
- `doctor`

`<jobRef>` accepts either a job UUID or a slug.

For commands with `[jobRef]` or `[runId]`, omitting the argument starts an interactive selector in TTY mode.

## Per-Command Pages

- [Job Commands (`job`, `jobs`)](commands/job.md)
- [Settings](commands/settings.md)
- [Daemon](commands/daemon.md)
- [Startup (`startup`, `reboot`)](commands/startup.md)
- [Export](commands/export.md)
- [Consume](commands/consume.md)
- [Analytics](commands/analytics.md)
- [Results](commands/results.md)
- [Logs](commands/logs.md)
- [Errors](commands/errors.md)
- [Doctor](commands/doctor.md)

## Top-Level Aliases

Snoopy exposes a few top-level shortcuts for common actions.

### `add`

Alias for `job add`.

```bash
snoopy add
```

### `list`

Alias for `jobs list`.

```bash
snoopy list
```

### `delete [jobRef]`

Alias for `job delete [jobRef]`.

```bash
snoopy delete
snoopy delete <jobRef>
```

### `start [jobRef]`

Alias for enabling a job.

```bash
snoopy start
snoopy start <jobRef>
```

### `stop [jobRef]`

Alias for disabling a job.

```bash
snoopy stop
snoopy stop <jobRef>
```

## Typical Flow

```bash
snoopy job add
snoopy job run --limit 5
snoopy job run <jobRef> --limit 5
snoopy job runs <jobRef>
snoopy analytics <jobRef>
snoopy results <jobRef>
snoopy export <jobRef> --json --last-run
snoopy consume <jobRef> --json --dry-run
snoopy logs
snoopy logs <runId>
snoopy errors <jobRef>
snoopy daemon start
snoopy doctor
```

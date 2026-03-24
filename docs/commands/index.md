---
title: Command Reference
sidebar_position: 1
---

# Command Reference

This section documents the Snoopy CLI one command group at a time.

## Top-Level Commands

- `job`
- `jobs`
- `add`
- `list`
- `delete <jobRef>`
- `start <jobRef>`
- `stop <jobRef>`
- `settings`
- `daemon`
- `startup`
- `reboot`
- `export`
- `analytics [jobRef]`
- `logs <runId>`
- `errors <jobRef>`
- `doctor`

`<jobRef>` accepts either a job UUID or a slug.

## Per-Command Pages

- [Job Commands](job.md)
- [Jobs Alias Group](jobs.md)
- [Settings](settings.md)
- [Daemon](daemon.md)
- [Startup](startup.md)
- [Reboot Alias Group](reboot.md)
- [Export](export.md)
- [Analytics](analytics.md)
- [Logs](logs.md)
- [Errors](errors.md)
- [Doctor](doctor.md)

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

### `delete <jobRef>`

Alias for `job delete <jobRef>`.

```bash
snoopy delete <jobRef>
```

### `start <jobRef>`

Alias for enabling a job.

```bash
snoopy start <jobRef>
```

### `stop <jobRef>`

Alias for disabling a job.

```bash
snoopy stop <jobRef>
```

## Typical Flow

```bash
snoopy job add
snoopy job run <jobRef> --limit 5
snoopy job runs <jobRef>
snoopy analytics <jobRef>
snoopy export csv <jobRef>
snoopy logs <runId>
snoopy errors <jobRef>
snoopy daemon start
snoopy doctor
```

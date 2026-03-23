---
title: daemon
sidebar_position: 6
---

# `daemon`

The `daemon` group manages the long-running Snoopy scheduler process.

## Subcommands

### `daemon start`

Starts the scheduler in the background.

```bash
snoopy daemon start
```

### `daemon stop`

Stops the background daemon.

```bash
snoopy daemon stop
```

### `daemon status`

Shows whether the daemon is running and whether the PID file is healthy.

```bash
snoopy daemon status
```

### `daemon run`

Runs the daemon in the foreground.

```bash
snoopy daemon run
```

## Typical Use

```bash
snoopy daemon start
snoopy daemon status
```

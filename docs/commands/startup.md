---
title: startup
sidebar_position: 7
---

# `startup`

The `startup` group manages OS-level registration so Snoopy can start on reboot or login.

The `reboot` group is an alias for the user-facing startup behavior commands.

## Aliases

These commands behave the same as their `startup` counterparts:

- `reboot enable`
- `reboot disable`
- `reboot status`

Examples:

```bash
snoopy reboot enable
snoopy reboot status
```

## Subcommands

### `startup install`

Installs startup registration artifacts.

```bash
snoopy startup install
```

### `startup uninstall`

Removes installed startup registration artifacts.

```bash
snoopy startup uninstall
```

### `startup enable`
### `startup disable`
### `startup status`

Controls or inspects startup-on-reboot/login behavior.

```bash
snoopy startup enable
snoopy startup disable
snoopy startup status
```

## Notes

Implementation varies by OS:

- macOS: launchd
- Linux: systemd user service, with cron fallback
- Windows: Task Scheduler, with registry Run fallback

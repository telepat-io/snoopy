---
title: daemon
sidebar_position: 6
description: CLI-Referenz für den Daemon-Befehl zur Verwaltung des lang laufenden Snoopy-Scheduler-Prozesses.
keywords: [reddit, monitoring, cli, scheduler, daemon]
---

# `daemon`

Die `daemon`-Gruppe verwaltet den lang laufenden Snoopy-Scheduler-Prozess.

## Unterbefehle

### `daemon start`

Startet den Scheduler im Hintergrund.

```bash
snoopy daemon start
```

### `daemon stop`

Stoppt den Hintergrund-Daemon.

```bash
snoopy daemon stop
```

### `daemon status`

Zeigt an, ob der Daemon läuft und ob die PID-Datei intakt ist.

```bash
snoopy daemon status
```

### `daemon reload`

Lädt die Scheduler-Registrierungen im laufenden Daemon neu, ohne ihn neu zu starten.

```bash
snoopy daemon reload
```

### `daemon run`

Führt den Daemon im Vordergrund aus.

```bash
snoopy daemon run
```

## Typische Verwendung

```bash
snoopy daemon start
snoopy daemon status
snoopy daemon reload
```

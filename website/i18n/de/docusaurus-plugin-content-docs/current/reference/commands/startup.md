---
title: startup
sidebar_position: 7
description: CLI-Referenz für den Startup-Befehl zur Registrierung des Snoopy-Schedulers für den Start bei Systemneustart oder Anmeldung.
keywords: [reddit, monitoring, cli, scheduler, startup, reboot]
---

# `startup`

Die `startup`-Gruppe verwaltet die Registrierung auf OS-Ebene, damit Snoopy beim Neustart oder bei der Anmeldung starten kann.

Die Startregistrierung ist immer eine explizite Opt-in-Option.

Die `reboot`-Gruppe ist ein Alias für die benutzerorientierten Startverhaltensbefehle.

## Aliase

Diese Befehle verhalten sich gleich wie ihre `startup`-Gegenstücke:

- `reboot enable`
- `reboot disable`
- `reboot status`

Beispiele:

```bash
snoopy reboot enable
snoopy reboot status
```

## Unterbefehle

### `startup install`

Installiert Startregistrierungsartefakte.

```bash
snoopy startup install
```

### `startup uninstall`

Entfernt installierte Startregistrierungsartefakte.

```bash
snoopy startup uninstall
```

### `startup enable`
### `startup disable`
### `startup status`

Steuert oder überprüft das Startverhalten beim Neustart/Anmeldung.

```bash
snoopy startup enable
snoopy startup disable
snoopy startup status
```

## Hinweise

Die Implementierung variiert je nach Betriebssystem:

- macOS: launchd
- Linux: systemd Benutzerservice mit cron-Fallback
- Windows: Nur Task Scheduler (kein Registry-Run-Fallback)

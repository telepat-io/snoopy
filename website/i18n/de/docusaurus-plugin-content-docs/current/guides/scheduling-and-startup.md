---
title: Planung und Start
sidebar_position: 4
description: Verstehen Sie, wie der Snoopy-Scheduler Reddit-Überwachungsjobs kontinuierlich ausführt und Systemneustarts überlebt.
keywords: [reddit, monitoring, scheduler, cli, daemon, startup, cron]
---

# Planung, Cron, Daemon und Start

Dieses Dokument erklärt, wie Snoopy Jobs kontinuierlich ausführt und Neustarts überlebt.

## Planungsmodell

- Scheduler: `node-cron`
- Jeder aktivierte Job registriert eine Cron-Aufgabe.
- Standardzeitplan beim Erstellen von Jobs: `*/30 * * * *` (alle 30 Minuten).

Bei jedem Takt:

1. Job wird aus der DB neu geladen.
2. Wenn immer noch aktiviert, wird der Runner ausgeführt.
3. Laufstatistiken werden in `job_runs` persistiert.
4. Gescannte Elemente werden in `scan_items` für Deduplizierung und Prüfung persistiert.

## Daemon-Lebenszyklus

Befehle:

- `snoopy daemon start`
- `snoopy daemon stop`
- `snoopy daemon status`
- `snoopy daemon run`

Verhalten:

- `daemon start` startet einen losgelösten Prozess und schreibt eine PID-Datei.
- PID-Dateipfad: `<root>/daemon.pid`.
- `daemon status` überprüft PID-Datei und Prozessaktivität.
- `daemon run` hält den Scheduler im Vordergrund und ist nützlich zum Debuggen.

## Manuelle Läufe vs. Geplante Läufe

Manueller Lauf:

```bash
snoopy job run <jobRef> --limit 5
```

Manuelle Läufe sind ideal für:

- Schnelle Rubrikprüfungen
- Modellkonfigurationsvalidierung
- Smoke-Tests neuer Jobs

Geplante Läufe eignen sich am besten für kontinuierliche Überwachung, sobald einem Job vertraut wird.

## Cron-Ausdrücke

`jobs.schedule_cron` unterstützt die von `node-cron` verwendete Standard-Cron-Syntax.

Beispiele:

- `*/30 * * * *` alle 30 Minuten
- `0 * * * *` stündlich
- `0 9 * * *` täglich um 09:00

## Start beim Neustart/Anmeldung

Snoopy unterstützt die OS-Startregistrierung.

Die Startregistrierung ist immer eine explizite Opt-in-Option. Snoopy konfiguriert sie nur, wenn Sie `startup enable/install` ausführen (oder sich während der Job-Einrichtung explizit für `startup install` entscheiden).

Befehle:

- `snoopy startup install`
- `snoopy startup uninstall`
- `snoopy startup enable`
- `snoopy startup disable`
- `snoopy startup status`

Alias-Gruppe:

- `snoopy reboot enable|disable|status`

### macOS

Hauptmethode:

- launchd LaunchAgent

Statusprüfungen für:

- `~/Library/LaunchAgents/com.snoopy.daemon.plist`

### Linux

Bevorzugte Methode:

- systemd Benutzerservice (wenn verfügbar)

Fallback-Methode:

- cron `@reboot`-Eintrag

Statusprüfungen:

- systemd-Service-Datei in `~/.config/systemd/user/`
- crontab-Eintrag mit `snoopy daemon run`

### Windows

Bevorzugte Methode:

- Task Scheduler-Job

Statusprüfungen:

- `schtasks /query /tn "Snoopy\\Daemon"`

Wenn die Task-Scheduler-Einrichtung fehlschlägt, gibt Snoopy einen Fehler zurück, anstatt still auf alternative Persistenzmechanismen zurückzugreifen.

## Betriebsempfehlungen

- Während der Einrichtung: Führen Sie `snoopy doctor` nach dem Konfigurieren der Einstellungen aus.
- Vor dem Aktivieren des Starts: Bestätigen Sie, dass `daemon start` funktioniert.
- Nach der Neustart-Registrierung: Überprüfen Sie mit `startup status` und `daemon status`.
- Zum Debuggen lauter Jobs: Verwenden Sie manuelle Läufe mit `--limit`.

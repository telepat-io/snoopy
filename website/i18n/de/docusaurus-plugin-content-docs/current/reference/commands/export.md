---
title: export
sidebar_position: 8
description: CLI-Referenz für den Export-Befehl zur Neugenerierung von Datenartefakten aus Reddit-Überwachungsergebnissen.
keywords: [reddit, monitoring, cli, ai, export, data]
---

# `export`

Verwenden Sie `export` zum Neugenerieren von Datenartefakten aus der lokalen Datenbank.

## `export [jobRef]`

Generiert pro-Job-Exportdateien mit qualifizierten Ergebnissen neu.

```bash
snoopy export
snoopy export <jobRef>
snoopy export --csv
snoopy export --json
snoopy export <jobRef> --json --last-run
```

Argumente:

- `[jobRef]`: optionale Job-ID oder Slug

Optionen:

- `--csv`: Export im CSV-Format (Standard)
- `--json`: Export im rohen JSON-Format
- `--last-run`: Exportiert nur Zeilen des neuesten Laufs jedes Jobs
- `--limit <count>`: maximale Zeilen pro Job-Datei (Standard: `100`)

Verhalten:

- ohne `jobRef` exportiert alle Jobs
- mit `jobRef` exportiert nur einen Job
- jeder Job schreibt nach `~/.snoopy/results/<zeitstempel>_<job-slug>.<erweiterung>`
- Zeitstempelformat ist UTC-kompakt: `YYYYMMDD-HHmmss`
- Dateien werden bei jedem Befehlsaufruf vollständig aus der Datenbankwahrheit neu generiert
- Zeilenreihenfolge ist neueste zuerst (kürzlich gepostete zuerst)
- `--last-run` begrenzt Zeilen auf den neuesten Lauf pro ausgewähltem Job
- `--limit` begrenzt Zeilen pro Datei; erhöhen Sie es, wenn ein Job viele qualifizierte Ergebnisse hat

CSV-Spalten:

- `URL`
- `Title`
- `Truncated Content` (300 Zeichen + `...` wenn länger)
- `Author`
- `Justification`
- `Date`

JSON-Form:

- Array von qualifizierten Zeilenobjekten aus `scan_items`
- Enthält Felder wie `id`, `jobId`, `runId`, `author`, `title`, `body`, `url`, `redditPostedAt`, `qualificationReason`, `createdAt`

Hinweise:

- dieser Befehl ist manuell; Job-Läufe schreiben nicht automatisch Exportdateien
- das Löschen eines Jobs entfernt nicht rückwirkend zuvor exportierte Zeitstempeldateien

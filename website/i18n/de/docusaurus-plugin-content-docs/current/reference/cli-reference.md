---
title: CLI-Referenz
sidebar_position: 1
description: Vollständige CLI-Referenz für das Snoopy Reddit-Überwachungstool, organisiert nach Befehlsgruppe.
keywords: [reddit, monitoring, cli, ai, reference, commands]
---

# CLI-Referenz

Dieser Abschnitt dokumentiert die Snoopy CLI Befehl für Befehl.

## Befehle auf oberster Ebene

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
- `prompt <jobRef>`
- `prompt set <jobRef> <prompt>`

`<jobRef>` akzeptiert entweder eine Job-UUID oder einen Slug.

Für Befehle mit `[jobRef]` oder `[runId]` startet das Weglassen des Arguments einen interaktiven Selektor im TTY-Modus.

## Befehlsspezifische Seiten

- [Job-Befehle (`job`, `jobs`)](commands/job.md)
- [Einstellungen](commands/settings.md)
- [Daemon](commands/daemon.md)
- [Start (`startup`, `reboot`)](commands/startup.md)
- [Export](commands/export.md)
- [Consume](commands/consume.md)
- [Analysen](commands/analytics.md)
- [Ergebnisse](commands/results.md)
- [Protokolle](commands/logs.md)
- [Fehler](commands/errors.md)
- [Doctor](commands/doctor.md)
- [Prompt](commands/prompt.md)

## Aliase auf oberster Ebene

Snoopy bietet einige Abkürzungen auf oberster Ebene für häufige Aktionen.

### `add`

Alias für `job add`.

```bash
snoopy add
```

### `list`

Alias für `jobs list`.

```bash
snoopy list
```

### `delete [jobRef]`

Alias für `job delete [jobRef]`.

```bash
snoopy delete
snoopy delete <jobRef>
```

### `start [jobRef]`

Alias zum Aktivieren eines Jobs.

```bash
snoopy start
snoopy start <jobRef>
```

### `stop [jobRef]`

Alias zum Deaktivieren eines Jobs.

```bash
snoopy stop
snoopy stop <jobRef>
```

## Typischer Ablauf

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
snoopy prompt <jobRef>
snoopy prompt <jobRef> --raw
snoopy prompt set <jobRef> "Verfeinerte Qualifizierungskriterien"
snoopy daemon start
snoopy doctor
```

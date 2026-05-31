---
title: job
sidebar_position: 2
description: CLI-Referenz für den Job-Befehl zur Erstellung, Verwaltung und Planung von Reddit-Überwachungsjobs.
keywords: [reddit, monitoring, cli, scheduler, job, create, manage]
---

# `job`

Verwenden Sie `job` zum Erstellen, Überprüfen, Ausführen, Aktivieren, Deaktivieren und Löschen von Überwachungsjobs.

Die Mehrzahl `jobs` ist ein Alias für dieselben操作ationsbefehle.

## Aliase

Diese Befehle verhalten sich gleich wie ihre `job`-Gegenstücke:

- `jobs list`
- `jobs enable [jobRef]`
- `jobs disable [jobRef]`
- `jobs remove [jobRef]`
- `jobs delete [jobRef]`
- `jobs run [jobRef] [--limit N]`
- `jobs runs [jobRef]`

Beispiele:

```bash
snoopy jobs list
snoopy jobs run my-job --limit 5
snoopy jobs delete my-job
```

## Unterbefehle

### `job add`

Startet den interaktiven Job-Erstellungsablauf.

```bash
snoopy job add
```

Was es tut:

- Erhebt die natürlichsprachige Überwachungsabsicht
- Stellt Nachfragen
- Generiert Name, Slug, Beschreibung und Qualifizierungsprompt
- Fragt nach fehlenden Anmeldedaten/Einstellungen nach Bedarf
- Fragt, ob der OS-Start beim Neustart/Anmeldung registriert werden soll (Standard: Ja)
- Speichert den Job lokal
- Führt einen sofortigen ersten Scan mit derselben Fortschritts- und Zusammenfassungsausgabe wie `job run` aus
- Hält den Job ungeplant, während der erste Lauf läuft, und aktiviert geplante Läufe, wenn der Versuch endet

Wenn Sie den initialen Lauf mit Ctrl+C unterbrechen, aktiviert Snoopy den Job vor dem Beenden, damit die Cron-Planung fortgesetzt werden kann.

### `job list`

Listet alle konfigurierten Jobs auf.

```bash
snoopy job list
```

### `job remove [jobRef]`
### `job delete [jobRef]`

Löscht einen Job und kaskadiert die Bereinigung zugehöriger Läufe, Scan-Elemente, Laufprotokolldateien und exportierter CSV-Dateien.

```bash
snoopy job delete
snoopy job delete <jobRef>
```

Wenn `jobRef` weggelassen wird, zeigt Snoopy alle Jobs und lässt Sie einen mit Auf/Ab-Pfeilen und Enter auswählen.

Wenn die detaillierte Laufprotokollierung aktiviert ist, entfernt das Löschen eines Jobs auch die entsprechenden `run-<runId>.log`-Dateien unter `~/.snoopy/logs/`.

Das Löschen eines Jobs entfernt auch seine Ergebnisdatei unter `~/.snoopy/results/<job-slug>.csv`, wenn vorhanden.

### `job enable [jobRef]`
### `job disable [jobRef]`

Aktiviert oder deaktiviert die geplante Ausführung.

```bash
snoopy job enable
snoopy job enable <jobRef>
snoopy job disable
snoopy job disable <jobRef>
```

Wenn `jobRef` weggelassen wird, zeigt Snoopy alle Jobs und lässt Sie einen mit Auf/Ab-Pfeilen und Enter auswählen.

### `job run [jobRef] [--limit N]`

Führt einen Job sofort aus.

Argumente:

- `[jobRef]`: optionale Job-ID oder Slug

Optionen:

- `-l, --limit <count>`: maximale Anzahl neuer Beiträge/Kommentare, die während des Laufs qualifiziert werden

```bash
snoopy job run
snoopy job run <jobRef>
snoopy job run <jobRef> --limit 5
```

Wenn `jobRef` weggelassen wird, zeigt Snoopy alle Jobs und lässt Sie einen mit Auf/Ab-Pfeilen und Enter auswählen.

Ausgabehinweise:

- Rich-TTY-Läufe rendern Beitrags-/Kommentar-Scan-Updates als kompakte mehrzeilige Blöcke mit eingerückten Feldern.
- Beschriftungen sind zur Lesbarkeit farbcodiert.
- Qualifizierungsstatus ist farbcodiert: `qualified` (grün), `not qualified` (rot), `pending` (gelb).
- Wenn bereits ein anderer Lauf für denselben Job aktiv ist, schlägt Snoopy schnell fehl und markiert den neuen Versuch als `skipped` mit einer `already active`-Meldung.
- Doppelte Beitrags-/Kommentarkandidaten, die während Überlappungsfenstern entdeckt werden, werden als bereits gescannt behandelt und lassen den Lauf nicht fehlschlagen.

### `job runs [jobRef]`

Listet die kürzliche Laufhistorie auf.

Wenn `jobRef` weggelassen wird, gibt dieser Befehl kürzliche Läufe über Jobs hinweg zurück.

```bash
snoopy job runs
snoopy job runs <jobRef>
```

`job runs` zeigt nur die Laufhistorie an. Um pro-Job-Ergebnisdateien neu zu generieren, führen Sie aus:

```bash
snoopy export
snoopy export <jobRef> --json --last-run
```

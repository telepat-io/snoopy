---
title: logs
sidebar_position: 8
description: CLI-Referenz für den Logs-Befehl zur Überprüfung von Job-Laufzeitachsen für geplante Reddit-Überwachungsjobs.
keywords: [reddit, monitoring, cli, scheduler, logs, debugging]
---

# `logs [runId]`

Verwenden Sie `logs`, um standardmäßig einen Lauf mit einer benutzerfreundlichen Zeitachse zu überprüfen.

```bash
snoopy logs
snoopy logs <runId>
snoopy logs <runId> --raw
```

Wenn `runId` weggelassen wird, zeigt Snoopy zunächst die Job-Liste an und lässt Sie mit Auf/Ab-Pfeilen und Enter einen Job auswählen, dann zeigt es die kürzlichen Läufe für diesen Job an und lässt Sie auf die gleiche Weise einen Lauf auswählen.

Standard (`snoopy logs <runId>`) zeigt:

- Lauf-Metadaten
- Beitrags-/Kommentar-Textschnipsel
- Qualifizierungsergebnis und Begründung sowohl für qualifizierte als auch nicht-qualifizierte Elemente
- Klickbare Beitrags-/Kommentar-Links
- Wichtige Lauf-Lebenszyklus-Ereignisse und Fehler

Roher Modus (`--raw`) zeigt:

- Den vollständigen rohen Protokolldatei-Inhalt
- Detaillierte Reddit/OpenRouter-Anfrage- und Antwort-Payloads
- Alle Lebenszyklus-Einträge genau wie auf Datenträger geschrieben

Hinweise:

- Laufprotokolle befinden sich unter `~/.snoopy/logs/`
- Dateien heißen `run-<runId>.log`
- Ältere Läufe haben möglicherweise keine Protokolldatei, wenn sie vor der detaillierten Laufprotokollierung liegen
- Terminals ohne Hyperlink-Unterstützung zeigen dennoch volle URLs an, damit Links kopiert werden können
- Ergebnisdateien werden separat unter `~/.snoopy/results/` über `snoopy export` exportiert

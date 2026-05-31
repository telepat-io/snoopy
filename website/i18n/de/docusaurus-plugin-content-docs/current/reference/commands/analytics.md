---
title: analytics
sidebar_position: 8
description: CLI-Referenz für den Analytics-Befehl zur Überprüfung von Reddit-Scanvolumen und KI-Verbrauchsmetriken.
keywords: [reddit, monitoring, cli, ai, analytics, metrics]
---

# analytics

Verwenden Sie analytics, um Scanvolumen und KI-Verbrauchsmetriken auf globaler oder pro-Job-Ebene zu überprüfen.

## Verwendung

```bash
snoopy analytics
snoopy analytics <jobRef>
snoopy analytics --days 7
snoopy analytics <jobRef> --days 14
```

Argumente:

- `<jobRef>`: optionale Job-ID oder Slug

Optionen:

- `-d, --days <count>`: Um diesen Zeitraum in Tagen zurückblicken (Standard: 30)

## Was es anzeigt

Globaler Modus (`snoopy analytics`):

- Systemgesamt für neu gescannte Beiträge/Kommentare
- Prompt/Completion/Gesamt-Token-Verbrauch
- Geschätzte Gesamtkosten
- Tagesdurchschnitte für Beiträge/Kommentare/Tokens/Kosten
- Job- und Subreddit-Aufschlüsselungen
- Kürzliche Laufkarten mit Dauer, pro-Lauf neue Beiträge/Kommentare, Token-Gesamt, Kosten und pro-Beitrags-Verhältnisse

Job-Modus (`snoopy analytics <jobRef>`):

- Gesamt- und Durchschnitte für diesen einzelnen Job
- Subreddit-Aufschlüsselung für diesen Job
- Kürzliche Läufe für diesen Job

Kostenwerte sind als Schätzungen gekennzeichnet und verwenden Snoopy's aktuelle statische Token-Preisberechnungsheuristik.

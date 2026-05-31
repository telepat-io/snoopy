---
title: consume
sidebar_position: 9
description: CLI-Referenz für den consume-Befehl zum Markieren von KI-qualifizierten Reddit-Monitoring-Ergebnissen als konsumiert.
keywords: [reddit, monitoring, cli, ai, consume, results]
---

# `consume`

Verwenden Sie `consume`, um nicht konsumierte qualifizierte Ergebnisse aufzulisten und als konsumiert zu markieren, damit sie nicht erneut zurückgegeben werden.

## `consume [jobRef]`

Listet die neuesten nicht konsumierten qualifizierten Ergebnisse auf und markiert sie anschließend als konsumiert.

```bash
snoopy consume
snoopy consume <jobRef>
snoopy consume --limit 10
snoopy consume <jobRef> --json
snoopy consume --json --dry-run
```

Argumente:

- `[jobRef]`: optionale Job-ID oder Slug

Optionen:

- `--limit <count>`: maximale Anzahl zurückzugebender Ergebnisse (Standard: alle nicht konsumierten)
- `--json`: gibt ein rohes JSON-Array auf stdout aus, anstelle einer lesbaren Liste
- `--dry-run`: zeigt eine Vorschau der Ergebnisse, ohne sie als konsumiert zu markieren

Verhalten:

- ohne `jobRef`: gibt nicht konsumierte Ergebnisse aller Jobs zurück
- mit `jobRef`: gibt nicht konsumierte Ergebnisse nur für diesen Job zurück
- Ergebnisse werden nach dem neuesten zuerst sortiert (zuletzt erstellte zuerst)
- nach der Anzeige werden die zurückgegebenen Zeilen in der Datenbank als `consumed = 1` markiert
- nachfolgende Aufrufe überspringen bereits konsumierte Ergebnisse
- wenn `--json` ohne Ergebnisse verwendet wird, wird ein leeres Array `[]` ausgegeben

JSON-Struktur:

- Array von qualifizierten Zeilenobjekten aus `scan_items`
- enthält Felder wie `id`, `jobId`, `runId`, `author`, `title`, `body`, `url`, `redditPostedAt`, `qualificationReason`, `createdAt`, `consumed`

Hinweise:

- dieser Befehl ist das Read-Once-Gegenstück zu `export`; verwenden Sie `export` für die bedarfsgesteuerte Dateierzeugung
- `--dry-run` ist nützlich für Agenten oder Skripte, die vor dem Konsumieren eine Vorschau anzeigen möchten
- das `consumed`-Flag ist unabhängig von `viewed`, `validated` und `processed`

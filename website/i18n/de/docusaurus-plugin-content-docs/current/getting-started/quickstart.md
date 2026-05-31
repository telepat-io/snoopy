---
title: Schnellstart
description: Führen Sie den minimalen Weg durch, um Snoopy's Reddit-Überwachungs- und KI-Qualifizierungspipeline end-to-end zu validieren.
keywords: [reddit, monitoring, cli, ai, quickstart, validation]
---

# Schnellstart

Diese Anleitung durchläuft den minimalen Weg zur End-to-End-Validierung von Snoopy.

## 1. Job erstellen

```bash
snoopy job add
```

## 2. Jobs überprüfen

```bash
snoopy jobs list
```

## 3. Kleinen Validierungsscan durchführen

```bash
snoopy job run --limit 5
snoopy job run <jobRef> --limit 5
```

## 4. Ergebnisse überprüfen

```bash
snoopy job runs <jobRef>
snoopy analytics <jobRef> --days 7
```

## 5. Hintergrundplanung starten

```bash
snoopy daemon start
snoopy startup status
```

## 6. Qualifizierte Ergebnisse exportieren

```bash
snoopy export
snoopy export <jobRef> --json --last-run
```

## Nächste Schritte

- Lesen Sie [Planung und Start](../guides/scheduling-and-startup.md) für dauerhafte Operationen.
- Verwenden Sie die [CLI-Referenz](../reference/cli-reference.md) für vollständige Befehlsdetails.
- Führen Sie [Doctor](../reference/commands/doctor.md) aus, wenn etwas nicht stimmt.

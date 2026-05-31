---
title: doctor
sidebar_position: 10
description: CLI-Referenz für den Doctor-Befehl zur Durchführung von Gesundheitsprüfungen der Snoopy Reddit-Überwachungsumgebung.
keywords: [reddit, monitoring, cli, doctor, health, diagnostics]
---

# `doctor`

Der `doctor`-Befehl führt eine schnelle Gesundheitsprüfung der lokalen Snoopy-Umgebung durch.

```bash
snoopy doctor
```

## Aktuelle Prüfungen

- Plattform und Node-Version
- SQLite-Datenbank-Erreichbarkeit
- OpenRouter-API-Schlüssel-Vorhandensein
- Gesamtzahl/aktivierte Job-Anzahlen
- Daemon-Gesundheit
- Startregistrierungszustand und -methode
- Kürzliche Job-Lauffehler oder protokolierte Fehler der letzten 24 Stunden

## Behebungsvorschläge

Wenn eine Prüfung fehlschlägt, gibt `doctor` einen vorgeschlagenen Befehl zur Behebung des Problems aus:

| Problem | Vorgeschlagene Behebung |
|---|---|
| Daemon läuft nicht | `snoopy daemon start` |
| OpenRouter-API-Schlüssel fehlt | `snoopy settings` |
| Datenbank nicht erreichbar | Angezeigten DB-Dateipfad überprüfen |
| Kürzliche Job-Lauffehler | `snoopy job` / `snoopy logs <runId>` |

## Typische Verwendung

Führen Sie `doctor` aus nach:

- Ersteinrichtung
- Änderung von Anmeldedaten
- Aktivieren der Startregistrierung
- Daemon-Fehlern
- Smoke-Test-Fehlern

---
title: E2E-Smoke-Testing
sidebar_position: 6
description: Anleitung für die Durchführung von End-to-End-Smoke-Tests zur Validierung der Reddit-Überwachungs- und KI-Qualifizierungspipeline von der Job-Erstellung bis zu den Ergebnissen.
keywords: [reddit, monitoring, cli, ai, testing, e2e, smoke]
---

# E2E-Smoke-Test-Anleitung

Verwenden Sie diese Anleitung, um den Kernpfad zu überprüfen:

1. Job erstellen
2. Initialen Qualifizierungsversuch für 5 neue Elemente ausführen
3. Job-Aktivierungszustände um den initialen Lauf herum überprüfen
4. Job und zugehörige Analysen löschen

## Ein-Kommando-Smoke-Test

```bash
npm run e2e:smoke
```

Das Skript:

- überprüft, ob die erforderlichen OpenRouter-Anmeldedaten vorhanden sind
- erstellt einen temporären Job im deaktivierten Zustand
- führt dieselbe Initial-Lauf-Orchestrierung wie `job add` aus
- überprüft, dass der Job nach dem initialen Laufversuch aktiviert ist und eine Laufzeile existiert
- löscht den Job bei der Bereinigung

Implementierungspfad:

- `src/scripts/e2eSmoke.ts`

## Voraussetzungen

Vor dem Ausführen des Smoke-Tests:

- OpenRouter-API-Schlüssel ist entweder in `snoopy settings` (Schlüsselbund verfügbar) oder über `TELEPAT_OPENROUTER_KEY` konfiguriert
- Optional: Konfigurieren Sie Reddit-OAuth-Fallback-Anmeldedaten für Umgebungen, in denen die nicht-authentifizierte Reddit-JSON-Zugriff blockiert ist

Schnell überprüfen:

```bash
snoopy doctor
```

## Optionale Umgebungsvariablen

- `SNOOPY_E2E_LIMIT` Standard `5`
- `SNOOPY_E2E_SUBREDDITS` Standard `startups,entrepreneur`
- `SNOOPY_E2E_KEEP_JOB` Standard `false`

Beispiel:

```bash
SNOOPY_E2E_LIMIT=5 SNOOPY_E2E_SUBREDDITS=startups,entrepreneur npm run e2e:smoke
```

Job zur Inspektion aufbewahren:

```bash
SNOOPY_E2E_KEEP_JOB=true npm run e2e:smoke
```

## Manueller Äquivalenzablauf

Wenn Sie volle manuelle Kontrolle benötigen:

1. Job erstellen:

```bash
snoopy job add
```

2. 5-Elemente-Test ausführen:

```bash
snoopy job run <jobRef> --limit 5
```

3. Historie überprüfen:

```bash
snoopy job runs <jobRef>
```

4. Löschen und Kaskadenbereinigung:

```bash
snoopy delete <jobRef>
```

## Wie eine korrekte Ausgabe aussieht

- Lauf sch ohne Fehler ab.
- Bei Verwendung von `--limit 5` werden genau 5 neue Elemente verarbeitet.
- Qualifizierungsgründe sind knapp und stimmen mit dem Job-Prompt überein.
- Keine wiederholten Fallback-Gründe wie `Model output invalid; marked unqualified`.

## Fehlerbehebung

Wenn der Smoke-Test fehlschlägt:

1. Führen Sie `snoopy doctor` aus.
2. Überprüfen Sie den OpenRouter-API-Schlüssel in `settings` oder `TELEPAT_OPENROUTER_KEY`.
3. Wenn der Reddit-Zugriff in Ihrer Umgebung verweigert wird, konfigurieren Sie Reddit-OAuth-Fallback-Anmeldedaten in `settings`.
4. Überprüfen Sie den Daemon-Zustand, falls relevant (`daemon status`).
5. Überprüfen Sie die Protokolle unter `<root>/logs/snoopy.log`.
6. Führen Sie `SNOOPY_E2E_KEEP_JOB=true` erneut aus, um persistierte Daten zu überprüfen.

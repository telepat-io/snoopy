---
title: Datenbankschema
sidebar_position: 3
description: Referenz für das lokale SQLite-Datenbankschema von Snoopy zur Speicherung von Reddit-Überwachungsjobs, Läufen und KI-Qualifizierungsergebnissen.
keywords: [reddit, monitoring, cli, ai, database, schema, sqlite]
---

# Datenbankschema

Snoopy verwendet eine lokale SQLite-Datenbank.

## Speicherort

Pfadmuster:

- `<rootDir>/snoopy.db`

Standard-Stammverzeichnis ist `<home>/.snoopy` auf allen unterstützten Betriebssystemen:

- macOS-Beispiel: `~/.snoopy/snoopy.db`
- Linux-Beispiel: `~/.snoopy/snoopy.db`
- Windows-Beispiel: `C:\Users\<Sie>\.snoopy\snoopy.db`

Standardpfad (macOS/Linux):

- `~/.snoopy/snoopy.db`

Stammverzeichnis überschreiben:

- Setzen Sie `SNOOPY_ROOT_DIR`

Dann wird der DB-Pfad:

- `<SNOOPY_ROOT_DIR>/snoopy.db`

## Schemaquellen

- TypeScript-Migrationsmodule in `src/services/db/migrations/`
- Migrations-Runner in `src/services/db/migrations/runner.ts`
- Datenbank-Bootstrap in `src/services/db/sqlite.ts` (nur WAL-Modus + Runner-Aufruf)

## Tabellen

### settings

Zweck:

- Speichert Schlüssel-Wert-App-Einstellungen und Anmeldedaten-Metadaten

Spalten:

- `key TEXT PRIMARY KEY`
- `value TEXT NOT NULL`
- `updated_at TEXT NOT NULL DEFAULT datetime('now')`

Häufige Schlüssel:

- `model`
- `model_settings_json`
- `reddit_app_name`
- `reddit_client_id`

### jobs

Zweck:

- Definiert Überwachungsjobs

Spalten:

- `id TEXT PRIMARY KEY`
- `slug TEXT UNIQUE`
- `name TEXT NOT NULL UNIQUE`
- `description TEXT NOT NULL`
- `qualification_prompt TEXT NOT NULL`
- `subreddits_json TEXT NOT NULL`
- `schedule_cron TEXT NOT NULL DEFAULT '*/30 * * * *'`
- `enabled INTEGER NOT NULL DEFAULT 1`
- `monitor_comments INTEGER NOT NULL DEFAULT 1`
- `created_at TEXT NOT NULL DEFAULT datetime('now')`
- `updated_at TEXT NOT NULL DEFAULT datetime('now')`

Indizes:

- `idx_jobs_slug` eindeutiger Index auf `slug`

Hinweise:

- Befehle akzeptieren Job-ID oder Slug.
- Slugs werden in der Repository-Logik generiert und eindeutig gemacht.

### job_runs

Zweck:

- Speichert jeden geplanten/manuellen Ausführungsversuch

Spalten im aktiven Laufzeit-Schema:

- `id TEXT PRIMARY KEY`
- `job_id TEXT NOT NULL` (FK zu `jobs.id`)
- `status TEXT NOT NULL` (`running`, `completed`, `failed`, `skipped`)
- `message TEXT`
- `started_at TEXT`
- `finished_at TEXT`
- `items_discovered INTEGER NOT NULL DEFAULT 0`
- `items_new INTEGER NOT NULL DEFAULT 0`
- `items_qualified INTEGER NOT NULL DEFAULT 0`
- `prompt_tokens INTEGER NOT NULL DEFAULT 0`
- `completion_tokens INTEGER NOT NULL DEFAULT 0`
- `estimated_cost_usd REAL`
- `log_file_path TEXT`
- `created_at TEXT NOT NULL DEFAULT datetime('now')`

Hinweise:

- Migration 001 initialisiert eine minimale Version.
- Runtime-Bootstrap aktualisiert ältere lokale DBs durch Hinzufügen neuerer Analyse-Spalten.
- `log_file_path` verweist auf die protokollierte Laufdatei unter `~/.snoopy/logs/`, wenn detaillierte Protokollierung verfügbar ist.
- `idx_job_runs_active_job` erzwingt höchstens eine `running`-Zeile pro `job_id`, um überlappende Läufe zu verhindern.

### scan_items

Zweck:

- Deduplizierter Speicher gescannter Beiträge/Kommentare und Qualifizierungsergebnis
- Unterstützt eine leichte Ergebnislebenszyklusverfolgung für nachgelagerte Automatisierung

Spalten:

- `id TEXT PRIMARY KEY`
- `job_id TEXT NOT NULL` (FK zu `jobs.id`)
- `run_id TEXT NOT NULL` (FK zu `job_runs.id`)
- `type TEXT NOT NULL CHECK(type IN ('post','comment'))`
- `reddit_post_id TEXT NOT NULL`
- `reddit_comment_id TEXT`
- `subreddit TEXT NOT NULL`
- `author TEXT NOT NULL`
- `title TEXT`
- `body TEXT NOT NULL`
- `url TEXT NOT NULL`
- `reddit_posted_at TEXT NOT NULL`
- `qualified INTEGER NOT NULL DEFAULT 0`
- `viewed INTEGER NOT NULL DEFAULT 0`
- `validated INTEGER NOT NULL DEFAULT 0`
- `processed INTEGER NOT NULL DEFAULT 0`
- `consumed INTEGER NOT NULL DEFAULT 0`
- `qualification_reason TEXT`
- `created_at TEXT NOT NULL DEFAULT datetime('now')`

Indizes:

- `idx_scan_items_dedup` eindeutiger Index auf `(job_id, reddit_post_id, COALESCE(reddit_comment_id,''))`
- `idx_scan_items_consumed` Index auf `(job_id, qualified, consumed, created_at DESC)`

Verhalten:

- Verhindert die erneute Verarbeitung desselben Beitrags/Kommentars pro Job
- Speichert den endgültigen Qualifizierungsgrund zur Nachprüfbarkeit
- Lebenszyklus-Flag-Semantik:
	- `viewed = 1` Ergebnis wurde von einem Operator oder Agenten überprüft
	- `validated = 1` Ergebnis wurde qualitätsgeprüft/akzeptiert
	- `processed = 1` Ergebnis wurde an nachgelagerten Workflow übergeben
	- `consumed = 1` Ergebnis wurde vom `consume`-Befehl zurückgegeben und erscheint nicht mehr

Hinweise:

- SQLite speichert Booleans als Ganzzahlen (`0` falsch, `1` wahr).
- Neuere Laufzeitversionen füllen fehlende Lebenszyklus-Spalten beim Start mit `ALTER TABLE` für ältere lokale DBs nach.

### daemon_state

Zweck:

- Reservierte Laufzeit-Zustandstabelle für den Daemon-Lebenszyklus

Spalten:

- `id INTEGER PRIMARY KEY CHECK (id = 1)`
- `is_running INTEGER NOT NULL`
- `updated_at TEXT NOT NULL DEFAULT datetime('now')`

### migrations

Zweck:

- Verfolgt, welche Schema-Migrations vom Migrations-Runner angewendet wurden

Spalten:

- `id INTEGER PRIMARY KEY`
- `name TEXT NOT NULL`
- `applied_at TEXT NOT NULL DEFAULT datetime('now')`

Hinweise:

- Wird vom Migrations-Runner beim ersten DB-Zugriff automatisch erstellt
- Jede Zeile stellt ein angewendetes Migrationsmodul dar
- `snoopy doctor` meldet ausstehende vs. angewendete Migrationen

## Löschung und Daten-Lebenszyklus

Das Löschen eines Jobs über CLI/Repository entfernt:

1. `scan_items`-Zeilen für den Job
2. `job_runs`-Zeilen für den Job
3. Zugehörige Laufprotokolldateien, auf die von `job_runs.log_file_path` verwiesen wird (wenn vorhanden)
4. `jobs`-Zeile selbst

Diese Löschung wird in einer DB-Transaktion in der Repository-Logik ausgeführt.

## Anfragebeispiele

Neueste Läufe für einen Job:

```sql
SELECT *
FROM job_runs
WHERE job_id = ?
ORDER BY created_at DESC
LIMIT 20;
```

Neueste qualifizierte Elemente für einen Lauf:

```sql
SELECT reddit_post_id, reddit_comment_id, qualified, qualification_reason
FROM scan_items
WHERE run_id = ?
ORDER BY created_at DESC;
```

Unverarbeitete qualifizierte Elemente für einen Job:

```sql
SELECT
	id,
	url,
	author,
	title,
	qualification_reason,
	viewed,
	validated,
	processed,
	reddit_posted_at
FROM scan_items
WHERE job_id = ?
	AND qualified = 1
	AND processed = 0
ORDER BY datetime(reddit_posted_at) DESC;
```

Ein Ergebnis als überprüft + validiert markieren:

```sql
UPDATE scan_items
SET viewed = 1,
		validated = 1
WHERE id = ?;
```

Qualifizierte Ergebnisse eines Laufs als verarbeitet markieren:

```sql
UPDATE scan_items
SET processed = 1
WHERE run_id = ?
	AND qualified = 1;
```

## Agenten-Workflow-Referenz

Für End-to-End-direkte DB-Workflows (Jobs auflisten, Jobs einfügen, Daemon-/Startzustand überprüfen, Jobs ausführen, Ergebnisse lesen/aktualisieren) siehe [Agenten-Operationen](../guides/agent-operations.md).

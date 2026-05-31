---
title: Agenten-Operationen
sidebar_position: 7
description: Detailliertes Operations-Runbook für die Verwaltung von Snoopy Reddit-Überwachungsagenten über die CLI und direkten Datenbankzugriff.
keywords: [reddit, monitoring, cli, ai, agent, operations, database]
---

# Agenten-Operationen

:::tip Neu: Für-Agenten-Bereich
Für MCP-Server-Einrichtung, Agenten-Framework-Registrierung und Skill-Pakete lesen Sie den Bereich [Für Agenten](../for-agents/index.md). Diese Anleitung behandelt das vollständige CLI-Operations-Runbook und direkte Datenbankzugriffsmuster.
:::

Diese Anleitung richtet sich an KI-Agenten und Automatisierungsskripte, die Snoopy end-to-end betreiben. Sie behandelt Installation, Anmeldeeinrichtung, alle verfügbaren Befehle und direkte Datenbankzugriffsmuster für Fälle, in denen die CLI nicht ausreicht.

---

## 1. Installation

**Voraussetzungen:** Node.js 20+, npm 10+

**Über npm (empfohlen für den Produktivbetrieb):**

```bash
npm install -g @telepat/snoopy
snoopy --help
```

**Aus Quelle (Entwicklung/modifizierte Builds):**

```bash
npm install
npm run build
npm link
snoopy --help
```

**Installation überprüfen:**

```bash
snoopy --version
snoopy --help
```

Das Datenverzeichnis wird beim ersten Start automatisch unter `~/.snoopy/` (macOS und Linux) oder `C:\Users\<Sie>\.snoopy\` (Windows) erstellt.

Setzen Sie `SNOOPY_ROOT_DIR`, um den Datenverzeichnisspeicherort vollständig zu überschreiben:

```bash
SNOOPY_ROOT_DIR=/custom/path snoopy doctor
```

---

## 2. Anmeldedaten

### OpenRouter-API-Schlüssel (erforderlich)

Snoopy verwendet [OpenRouter](https://openrouter.ai), um Reddit-Beiträge und Kommentare anhand Ihrer Job-Prompts zu qualifizieren. Ohne API-Schlüssel schlagen Job-Ausführungen fehl.

**Speicherort:** Der Schlüssel wird über `keytar` im System-Schlüsselbund (macOS Keychain, Linux Secret Service, Windows Credential Manager) gespeichert, wenn dieser verfügbar ist. Wenn der Schlüsselbund nicht verfügbar ist, übergeben Sie den Schlüssel über `TELEPAT_OPENROUTER_KEY`.

**Schlüssel interaktiv setzen:**

```bash
snoopy settings
```

Navigieren Sie zu **OpenRouter API Key**, geben Sie Ihren Schlüssel ein und speichern Sie ihn.

Der Schlüssel wird auch beim ersten Aufruf von `snoopy job add` automatisch abgefragt, wenn der Schlüsselbund verfügbar ist.
Wenn der Schlüsselbund nicht verfügbar ist, setzen Sie `TELEPAT_OPENROUTER_KEY` vor dem Ausführen von `snoopy job add`.

**Überprüfen, ob der Schlüssel konfiguriert ist:**

```bash
snoopy doctor
```

Suchen Sie in der Ausgabe nach `OpenRouter API key: configured`.

### Reddit-Anmeldedaten (optional)

Snoopy verwendet standardmäßig die öffentliche API von Reddit. Wenn Sie OAuth-Anmeldedaten verwenden müssen (für höhere Ratenbegrenzungen oder private Subreddits), konfigurieren Sie diese über `snoopy settings`:

- **Reddit App Name**
- **Reddit Client ID**
- **Reddit Client Secret**

Diese sind optional und nur in bestimmten Deployment-Szenarien erforderlich.

---

## 3. Ersteinrichtung

Der schnellste Weg zu einem laufenden System:

```bash
# 1. Installieren (wenn nicht bereits geschehen)
npm install -g @telepat/snoopy

# 2. Ersten Überwachungsjob erstellen
#    Dies fragt nach Ihrem OpenRouter-Schlüssel, falls noch nicht gesetzt,
#    und führt Sie durch die Job-Konfiguration, startet den Daemon und führt einen initialen Scan durch.
snoopy job add

# 3. Überprüfen, dass alles funktioniert
snoopy doctor
```

Alternativ, um den API-Schlüssel vor der Job-Erstellung zu setzen:

```bash
snoopy settings    # Zuerst OpenRouter-API-Schlüssel setzen
snoopy job add     # Dann einen Job erstellen
```

In Umgebungen ohne Schlüsselbund-Unterstützung:

```bash
export TELEPAT_OPENROUTER_KEY=<Ihr-openrouter-schlüssel>
export SNOOPY_REDDIT_CLIENT_SECRET=<optionaler-reddit-client-secret>
snoopy job add
```

---

## 4. Job-Verwaltung

Ein **Job** definiiert, was Snoopy überwacht: welche Subreddits, was einen Beitrag oder Kommentar qualifiziert und wie oft gescannt wird.

`<jobRef>` in diesem Abschnitt akzeptiert entweder die Job-**ID** oder den **Slug**.

### Job erstellen

```bash
snoopy job add
# Kurzalias:
snoopy add
```

Interaktiver Ablauf — erfasst:
- Job-Name und Beschreibung
- Ziel-Subreddits
- Qualifizierungsprompt (Kriterien in einfacher Sprache für die KI)
- Modell-Einstellungen (Modell, Temperatur, max tokens, topP)
- Ob Kommentare zusätzlich zu Beiträgen überwacht werden sollen
- Ob der Start beim Neustart registriert werden soll
- Auslösung eines sofortigen ersten Scans

Der Job startet **deaktiviert**, bis der erste Lauf abgeschlossen ist. Der Scheduler aktiviert ihn dann automatisch.

### Jobs auflisten

```bash
snoopy job list
# Aliase:
snoopy jobs list
snoopy list
```

Zeigt alle Jobs mit ihrem Zustand (ein/aus), ID, Slug und Subreddits an.

### Planung aktivieren/deaktivieren

```bash
snoopy job enable <jobRef>    # Alias: snoopy start <jobRef>
snoopy job disable <jobRef>   # Alias: snoopy stop <jobRef>
```

Nach dem Umschalten senden Sie einen Daemon-Reload, damit die Änderung sofort wirksam wird, ohne neustarten zu müssen:

```bash
snoopy daemon reload
```

### Job sofort ausführen

```bash
snoopy job run <jobRef>
snoopy job run <jobRef> --limit 5   # Neue qualifizierte Beiträge/Kommentare begrenzen (nützlich für Smoke-Tests)
# Alias:
snoopy jobs run <jobRef>
```

Optionen:
- `-l, --limit <count>` — Maximale neue Beiträge/Kommentare, die in diesem Lauf qualifiziert werden (positive Ganzzahl)

Ausgabe enthält: Lauf-ID, entdeckte/neue/qualifizierte Elemente, Token-Verbrauch, geschätzte Kosten USD, Logdateipfad.

### Qualifizierungsprompt anzeigen oder aktualisieren

```bash
# Anzeigen (interaktiv + optionale Bearbeitung)
snoopy prompt <jobRef>

# Nur Prompt-Text (programmatisch)
snoopy prompt <jobRef> --raw

# Direkte nicht-interaktive Aktualisierung
snoopy prompt set <jobRef> "Neue Qualifizierungskriterien"
```

Interaktive Editor-Tasten:

- `Enter`: Absenden
- `Shift+Enter`: Neue Zeile
- `Auf`/`Ab`: Cursor vertikal bewegen
- `Esc`: Abbrechen

### Laufhistorie anzeigen

```bash
snoopy job runs             # Alle kürzlichen Läufe über alle Jobs
snoopy job runs <jobRef>    # Läufe für einen Job (bis zu 20 neueste)
```

Jede Laufkarte zeigt: Lauf-ID, Status, Dauer, entdeckte/neue/qualifizierte Elemente, Tokens, Kosten, Logpfad.

### Job löschen

```bash
snoopy job delete <jobRef>
# Alias:
snoopy job remove <jobRef>
# Kurzalias:
snoopy delete <jobRef>
```

**Kaskadierenes Löschen:** Entfernt alle `scan_items`, alle `job_runs`, alle Laufprotokolldateien und den Job-Datensatz selbst — in einer einzigen DB-Transaktion.

---

## 5. Daemon-Lebenszyklus

Der Daemon läuft im Hintergrund und führt Jobs nach ihren Cron-Zeitplänen aus.

```bash
snoopy daemon start     # Daemon im Hintergrund starten; schreibt PID nach ~/.snoopy/.pid
snoopy daemon stop      # SIGTERM an Daemon senden; entfernt PID-Datei
snoopy daemon status    # Überprüfen, ob Daemon läuft (und PID anzeigen)
snoopy daemon reload    # SIGUSR2 senden für Hot-Reload der Job-Zeitpläne ohne Neustart
snoopy daemon run       # Daemon im Vordergrund ausführen (nützlich zum Debuggen/Protokollieren)
```

**Typisches Agenten-Muster:**

```bash
# Sicherstellen, dass Daemon läuft
snoopy daemon status || snoopy daemon start

# Nach dem Aktivieren/Deaktivieren eines Jobs Zeitpläne neu laden
snoopy daemon reload
```

---

## 6. Start beim Neustart

Registrieren Sie Snoopy für den automatischen Start beim Neustart der Maschine oder bei der Benutzeranmeldung.

```bash
snoopy startup enable     # Startregistrierung installieren und aktivieren
snoopy startup disable    # Startregistrierung entfernen
snoopy startup status     // Aktuellen Startzustand und Methode anzeigen
```

Aliase (gleichwertig):

```bash
snoopy reboot enable
snoopy reboot disable
snoopy reboot status
```

Plattformspezifische Implementierungen:
- **macOS** — LaunchAgent plist (`~/Library/LaunchAgents/`)
- **Linux** — systemd Benutzerservice oder cron-Eintrag
- **Windows** — Task Scheduler-Eintrag

**Typisches Agenten-Muster:**

```bash
snoopy startup status || snoopy startup enable
```

---

## 7. Gesundheitsprüfungen — doctor

`snoopy doctor` ist die kanonische Methode zur Überprüfung, ob ein System voll funktionsfähig ist.

```bash
snoopy doctor
```

Ausgabe umfasst:
- Plattform und Node.js-Version
- Datenbankstandort und -erreichbarkeit
- OpenRouter-API-Schlüssel: konfiguriert / fehlend
- Gesamtzahl der Jobs und wie viele aktiviert sind
- Daemon: läuft (mit PID) oder gestoppt
- Start beim Neustart: aktiviert/deaktiviert und Methode
- Kürzliche Job-Fehler: fehlgeschlagene oder fehlerhafte Läufe der letzten 24 Stunden mit Diagnose

**Behebungsablauf für einen Agenten:**

```bash
snoopy doctor
# Wenn API-Schlüssel fehlt:        snoopy settings
# Wenn Daemon nicht läuft:          snoopy daemon start
# Wenn Start nicht registriert:     snoopy startup enable
```

---

## 8. Fehler und Protokolle

### Kürzliche Fehler für einen Job überprüfen

```bash
snoopy errors <jobRef>              # Standard: letzte 24 Stunden
snoopy errors <jobRef> --hours 48   # Zeitraum erweitern
```

Ausgabe:
- Fehgeschlagene Läufe und Läufe mit protokollierten Fehlern im Zeitraum
- Lauf-Datum/Uhrzeit, Status, Lauf-ID, Statusmeldung
- Neuester Fehlereintrag wird vollständig ausgegeben

### Rohe Protokolle für einen Lauf anzeigen

```bash
snoopy logs <runId>
```

Streamt die vollständige rohe Protokolldatei für den angegebenen Lauf. Protokolle enthalten JSON-Ereignis-Payloads für jeden Lebenszyklusschritt: Anfragen, Antworten, Qualifizierungsentscheidungen, Fehler.

**Protokollierspeicher:**
- Ort: `~/.snoopy/logs/run-<runId>.log`
- Automatische Löschung nach **5 Tagen**

---

## 9. Analysen

```bash
snoopy analytics                     # Alle Jobs, letzte 30 Tage (Standard)
snoopy analytics --days 7            # Alle Jobs, benutzerdefinierter Zeitraum
snoopy analytics <jobRef>            # Einzelner Job
snoopy analytics <jobRef> --days 90  # Einzelner Job, erweiterter Zeitraum
```

Ausgabemetriken:
- Laufanzahl und Zeitraumgröße
- Gesamtzahl entdeckter, neuer und qualifizierter Elemente
- Gesamt- und Durchschnittswerte für Prompt/Completion/Gesamt-Tokens
- Gesamt- und geschätzte Kosten (USD)
- Tokens pro Beitrag, Kosten pro Beitrag
- Aufschlüsselung pro Subreddit (Beiträge, Kommentare, Tokens, Kosten, Tagesdurchschnitte)
- Individuelle Laufkarten mit vollständigen Details

---

## 10. Qualifizierte Ergebnisse exportieren

Exportieren Sie qualifizierte Scan-Elemente zur Nachverarbeitung, ohne direkt SQLite abzufragen.

```bash
snoopy export <jobRef> --json --last-run           # Einzelner Job, nur neuester Lauf
snoopy export --json --last-run                    # Alle Jobs, jeweils neuester Lauf
snoopy export <jobRef> --json --last-run --limit 500  # Zeilenlimit bei Bedarf erhöhen
snoopy export <jobRef> --csv                       # CSV-Ausgabe (Standardformat)
```

Ausgabedateien werden nach `~/.snoopy/results/<zeitstempel>_<job-slug>.<erweiterung>` geschrieben, wobei der Zeitstempel UTC `YYYYMMDD-HHmmss` ist. Dateien werden bei jedem Aufruf aus der Datenbank neu generiert (nicht inkrementell). Der Befehl gibt die Zeilenanzahl und den Dateipfad bei Abschluss aus.

Für Agenten verwenden Sie vorzugsweise `--json --last-run`, um nur die neuesten qualifizierten Elemente im maschinenfreundlichen Format abzurufen. Dies vermeidet das direkte Lesen der DB und hält die Automatisierung deterministisch.

---

## 11. Einstellungsreferenz

```bash
snoopy settings
```

Alle Einstellungen werden in der Datenbank (`settings`-Tabelle) gespeichert. Geheimnisse (API-Schlüssel, Reddit-Client-Geheimnis) werden im System-Schlüsselbund oder in der verschlüsselten Fallback-Datei gespeichert.

| Einstellung | Standard | Hinweise |
|---|---|---|
| OpenRouter API Key | (erforderlich) | Im System-Schlüsselbund / verschlüsselten Datei gespeichert |
| Standardmodell | `deepseek/deepseek-v4-pro` | LLM-Modell für Qualifizierung |
| Temperatur | `0.0` | Bereich 0.0–2.0 |
| Max Tokens | — | Token-Limit pro Anfrage |
| Top P | — | Nucleus-Sampling, Bereich 0.0–1.0 |
| Scan-Intervall | `30` (Minuten) | Wird in `*/N * * * *` Cron-Ausdruck umgewandelt |
| Job-Timeout | `10` (Minuten) | Timeout pro Job-Lauf; 0 = kein Timeout |
| Desktop-Benachrichtigungen | `true` | OS-Benachrichtigungen bei Laufereignissen |
| Reddit App Name | (optional) | OAuth-Fallback |
| Reddit Client ID | (optional) | OAuth-Fallback |
| Reddit Client Secret | (optional) | Im System-Schlüsselbund / verschlüsselten Datei gespeichert |

---

## 12. Direkter DB-Zugriff (Anhang)

Für Automatisierung, die die interaktive CLI nicht verwenden kann, können die meisten Lesevorgänge und Aktualisierungen der Lebenszyklus-Flags direkt in die SQLite-Datenbank erfolgen.

**Datenbankstandort:**

```
~/.snoopy/snoopy.db                          # Standard (macOS / Linux)
C:\Users\<Sie>\.snoopy\snoopy.db             # Standard (Windows)
$SNOOPY_ROOT_DIR/snoopy.db                   # Bei gesetztem Override
```

**Mit sqlite3 öffnen:**

```bash
sqlite3 ~/.snoopy/snoopy.db
```

### Jobs auflisten

```sql
SELECT id, slug, name, enabled, monitor_comments, schedule_cron, created_at
FROM jobs
ORDER BY datetime(created_at) DESC;
```

- `enabled = 1` → Scheduler wird ihn ausführen
- `monitor_comments = 1` → Kommentar-Qualifizierung ist aktiv

### Job direkt einfügen (nicht-interaktiv)

```sql
INSERT INTO jobs (
  id, slug, name, description,
  qualification_prompt, subreddits_json,
  schedule_cron, enabled, monitor_comments,
  created_at, updated_at
) VALUES (
  lower(hex(randomblob(16))),
  'lead-monitor-saas',
  'Lead Monitor SaaS',
  'Track high-intent SaaS buying questions',
  'Qualify only if the user is actively seeking SaaS recommendations or alternatives.',
  '["startups","entrepreneur","SaaS"]',
  '*/30 * * * *',
  1, 1,
  datetime('now'), datetime('now')
);
```

- `slug` muss eindeutig sein (`idx_jobs_slug`).
- `subreddits_json` muss ein gültiges JSON-Array-String sein.
- Verwenden Sie `BEGIN TRANSACTION; ... COMMIT;` für mehrstufige Schreibvorgänge.

### Kürzliche Läufe für einen Job lesen

```sql
SELECT
  id, status, message,
  started_at, finished_at,
  items_discovered, items_new, items_qualified,
  prompt_tokens, completion_tokens, estimated_cost_usd,
  created_at
FROM job_runs
WHERE job_id = '<job-id>'
ORDER BY datetime(created_at) DESC
LIMIT 20;
```

### Qualifizierte Ergebnisse für einen Job abrufen

```sql
SELECT
  id, run_id, type, subreddit, author,
  title, url, body,
  qualified, qualification_reason,
  viewed, validated, processed,
  reddit_posted_at, created_at
FROM scan_items
WHERE job_id = '<job-id>'
  AND qualified = 1
ORDER BY datetime(reddit_posted_at) DESC, datetime(created_at) DESC;
```

### Lebenszyklus-Flags aktualisieren

```sql
-- Ein Element als überprüft und validiert markieren
UPDATE scan_items
SET viewed = 1, validated = 1
WHERE id = '<item-id>';

-- Alle qualifizierten Elemente eines Laufs als verarbeitet markieren
UPDATE scan_items
SET processed = 1
WHERE run_id = '<run-id>'
  AND qualified = 1;

-- Unverarbeiteten Rückstand für einen Job zählen
SELECT COUNT(*) AS unprocessed_qualified
FROM scan_items
WHERE job_id = '<job-id>'
  AND qualified = 1
  AND processed = 0;
```

**Lebenszyklus-Flag-Semantik:**
- `viewed = 1` — Ergebnis wurde von einem Operator oder Agenten überprüft
- `validated = 1` — Ergebnis wurde qualitätsgeprüft und akzeptiert
- `processed = 1` — Ergebnis wurde an einen nachgelagerten Workflow übergeben

Für das vollständige Tabellenschema einschließlich aller Spalten, Indizes und Einschränkungen siehe [Datenbankschema](../reference/database-schema.md).

---

## 13. Minimales Agenten-Runbook

1. Snoopy installieren und bestätigen, dass `snoopy --help` funktioniert.
2. `snoopy doctor` ausführen — Beheben Sie alle angezeigten Probleme (fehlender Schlüssel, Daemon gestoppt, Start nicht registriert).
3. Job mit `snoopy job add` erstellen (oder direkt in die DB einfügen für nicht-interaktive Einrichtungen).
4. Bestätigen, dass Daemon läuft: `snoopy daemon status` → wenn nicht, `snoopy daemon start`.
5. Bestätigen, dass Start registriert ist: `snoopy startup status` → wenn nicht, `snoopy startup enable`.
6. Testlauf auslösen: `snoopy job run <jobRef> --limit 5`.
7. Ergebnisse prüfen: `snoopy job runs <jobRef>` und `snoopy errors <jobRef>`.
8. Qualifizierte Ergebnisse nach Bedarf exportieren oder abfragen.
9. Lebenszyklus-Flags (`viewed`, `validated`, `processed`) aktualisieren, wenn Ihr Workflow fortschreitet.

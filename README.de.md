<p align="center"><img src="./assets/avatar/snoopy-logo.webp" width="128" alt="Snoopy"></p>
<h1 align="center">Snoopy</h1>
<p align="center"><em>Überwachen Sie Online-Konversationen auf Signale mit hoher Kaufabsicht — mit KI. Natürlichsprachliche Kriterien, kontinuierliches Scanning, keine Infrastruktur.</em></p>

<p align="center">
  <a href="https://docs.telepat.io/snoopy">📖 Docs</a>
  · <a href="./README.md">🇺🇸 English</a>
  · <a href="./README.zh-CN.md">🇨🇳 简体中文</a>
  · <a href="./README.de.md">🇩🇪 Deutsch</a>
</p>

<p align="center">
  <a href="https://github.com/telepat-io/snoopy/actions/workflows/ci.yml"><img src="https://github.com/telepat-io/snoopy/actions/workflows/ci.yml/badge.svg?branch=main" alt="Build"></a>
  <a href="https://codecov.io/gh/telepat-io/snoopy"><img src="https://codecov.io/gh/telepat-io/snoopy/graph/badge.svg" alt="Codecov"></a>
  <a href="https://www.npmjs.com/package/@telepat/snoopy"><img src="https://img.shields.io/npm/v/@telepat/snoopy" alt="npm"></a>
  <a href="https://github.com/telepat-io/snoopy/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-yellow.svg" alt="License"></a>
</p>

Snoopy überwacht Online-Konversationen auf Signale mit hoher Kaufabsicht, die zu Ihren Geschäftszielen passen.

Definieren Sie in natürlicher Sprache, wonach Sie suchen, lassen Sie Snoopy einen Überwachungsjob erstellen und scannen und qualifizieren Sie Konversationen kontinuierlich, damit Sie sich auf Antwort und Outreach konzentrieren können.

Entwickelt für Gründer, Marketer und Vertriebsteams, die echte Chancen in Online-Communities finden möchten, ohne manuell scrollen zu müssen.

## Funktionen

- **Job-Erstellung in natürlicher Sprache** — Beschreiben Sie in natürlicher Sprache, wonach Sie suchen. Snoopy erstellt einen KI-gestützten Überwachungsjob. Kein Regex, keine Keyword-Konfiguration.
- **KI-Qualifizierung, kein Keyword-Matching** — Konversationen werden gegen Ihre Absicht bewertet. Snoopy versteht Kontext — nicht nur Musterabgleich.
- **Feedback-gesteuertes Prompt-Lernen** — Überprüfen Sie Ergebnisse, senden Sie Valid/Invalid-Feedback und konsolidieren Sie Aktualisierungen, damit Ihr Qualifizierungs-Prompt mit der Zeit intelligenter wird.
- **Kontinuierliche Daemon-Überwachung** — Legen Sie einen Cron-Zeitplan fest und lassen Sie Snoopy im Hintergrund scannen. `snoopy daemon start`
- **Code-gesteuerte Effizienz** — Deterministischer Code übernimmt Scraping, Zeitplanung, Zustandsverwaltung und SQLite-Persistenz. Tokens werden nur für die Qualifizierung verwendet.
- **Lokal & privat** — SQLite-Datenbank auf Ihrem Rechner. Keine Cloud-Abhängigkeit. Export als CSV oder JSON auf Abruf.
- **Kostenbewusste Analytik** — Token-Verbrauch, Kostenschätzungen und qualifizierte Elemente pro Durchlauf. `snoopy analytics --days 7`
- **Agent- & CI-bereit** — MCP-Server, direkter SQLite-Zugriff, nicht-interaktiver Modus, maschinenlesbare Ausgabe.
- **Plattformübergreifend** — macOS, Linux, Windows. Autostart bei Systemstart. `snoopy startup install`

## Schnellstart

Voraussetzungen: Node.js 20+, npm 10+.

```bash
npm install -g @telepat/snoopy
```

1. Ersten Überwachungsjob erstellen:

```bash
snoopy job add
```

2. Schnellen Test-Scan ausführen:

```bash
snoopy job run --limit 5
```

3. Hintergrund-Daemon starten:

```bash
snoopy daemon start
```

4. Ergebnisse anzeigen:

```bash
snoopy results
snoopy export --json --last-run
```

Für das vollständige Onboarding siehe [Installation & Setup](https://docs.telepat.io/snoopy/getting-started/installation) und [Quick Start](https://docs.telepat.io/snoopy/getting-started/quickstart).

## Voraussetzungen

- Node.js 20+
- npm 10+
- macOS, Linux oder Windows

## Funktionsweise

Snoopy verwendet öffentliche Reddit-JSON-Endpunkte (mit optionalem OAuth-Fallback), um Beiträge und Kommentare gegen einen KI-gestützten Qualifizierungs-Prompt zu scannen. Treffer werden in einer lokalen SQLite-Datenbank gespeichert. Der integrierte Daemon führt Jobs nach Cron-Zeitplänen aus, und Ergebnisse können bei Bedarf als CSV oder JSON exportiert werden.

## Verwendung mit KI-Agenten

Snoopy ist für Headless-Automatisierung und agentengesteuerte Überwachung konzipiert:

- **Nicht-interaktive CLI** — Die meisten Befehle unterstützen das Weglassen von `<jobRef>`, um eine interaktive Auswahl zu erhalten, aber die Automatisierung kann Referenzen direkt übergeben, um eine Ausführung ohne Prompts zu ermöglichen.
- **Maschinenlesbare Ausgabe** — `snoopy export --json --last-run` und `snoopy consume --json` erzeugen strukturierte Daten für nachgelagerte Agenten.
- **Feedback-Schleife für kontinuierliche Qualität** — Agenten können `snoopy feedback review --json` ausführen, menschliches Feedback sammeln, mit `snoopy feedback submit` einreichen und mit `snoopy feedback consolidate` finalisieren.
- **Direkter Datenbankzugriff** — SQLite unter `~/.snoopy/snoopy.db` (oder `$SNOOPY_ROOT_DIR/snoopy.db`) mit einem dokumentierten Schema. Agenten können Jobs einfügen, Ergebnisse abfragen und Lebenszyklus-Flags direkt aktualisieren.
- **Umgebungsvariablen** — `TELEPAT_OPENROUTER_KEY`, `SNOOPY_REDDIT_CLIENT_SECRET` und `SNOOPY_ROOT_DIR` entfernen alle interaktiven Anmeldeaufforderungen.
- **Agent-Dokumentation** — [Agent Operations](https://docs.telepat.io/snoopy/guides/agent-operations) bietet ein vollständiges Runbook für die Automatisierung, einschließlich SQL-Schema, Lebenszyklus-Flags und empfohlener Workflows.

## Feedback-Workflow

Verwenden Sie die Feedback-Befehle, um die Qualifizierungsqualität im Laufe der Zeit zu verbessern:

```bash
# 1) Nicht validierte qualifizierte Ergebnisse überprüfen (agentensicheres JSON)
snoopy feedback review --json --limit 10

# 2) Pro-Ergebnis-Feedback einreichen
snoopy feedback submit <resultId> --valid
snoopy feedback submit <resultId> --invalid --reason "Kein tatsächliches Kaufsignal"

# 3) Feedback in aktualisierten Qualifizierungs-Prompt konsolidieren
snoopy feedback consolidate
```

Interaktive `snoopy feedback review`-Sitzungen bieten auch an, die Konsolidierung vor dem vorzeitigen Beenden auszuführen.

## Sicherheit und Vertrauen

- Secrets werden standardmäßig im OS-Keychain gespeichert (via `keytar`). Fallback auf eine verschlüsselte Datei, wenn der Keychain nicht verfügbar ist.
- Umgebungsvariablen überschreiben gespeicherte Secrets und werden für CI und containerisierte Umgebungen empfohlen.
- Reddit-OAuth-Anmeldeinformationen sind optional; öffentliche JSON-Endpunkte werden standardmäßig verwendet.
- Ausführungslogs, die älter als 5 Tage sind, werden automatisch gelöscht.

Um ein Sicherheitsproblem zu melden, öffnen Sie einen privaten Bericht über den Security-Flow des Repositories.

## Dokumentation und Support

- [Dokumentationsseite](https://docs.telepat.io/snoopy)
- [Installation & Setup](https://docs.telepat.io/snoopy/getting-started/installation)
- [Quick Start](https://docs.telepat.io/snoopy/getting-started/quickstart)
- [CLI-Referenz](https://docs.telepat.io/snoopy/reference/cli-reference)
- [Agent Operations](https://docs.telepat.io/snoopy/guides/agent-operations)
- [Zeitplanung & Daemon](https://docs.telepat.io/snoopy/guides/scheduling-and-startup)
- [Sicherheit](https://docs.telepat.io/snoopy/technical/security)
- [Repository](https://github.com/telepat-io/snoopy)
- [npm-Paket](https://www.npmjs.com/package/@telepat/snoopy)

## Mitwirken

Beiträge sind willkommen. Siehe [Development](https://docs.telepat.io/snoopy/contributing/development) für Einrichtung, Workflow und Quality Gates.

## Lizenz

MIT. Siehe [LICENSE](./LICENSE).

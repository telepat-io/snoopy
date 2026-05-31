---
slug: /features
title: "Finden Sie hochintensive Gespräche in jeder Online-Community"
description: Was Snoopy für Gründer, Vermarkter und Vertriebsteams leisten kann.
keywords: [snoopy, features, conversation monitoring, ai qualification, lead generation]
sidebar_label: Features
sidebar_position: 1
---

# Finden Sie hochintensive Gespräche in jeder Online-Community

Snoopy überwacht Online-Gespräche auf hochintensive Signale, die Ihren Geschäftszielen entsprechen. Definieren Sie in einfacher Sprache, was Ihnen wichtig ist, und Snoopy scannt und qualifiziert Gespräche kontinuierlich, damit Sie sich auf Reaktionen und Outreach konzentrieren können.

Entwickelt für Gründer, Vermarkter und Vertriebsteams, die echte Möglichkeiten finden müssen, ohne jeden Beitrag manuell durchzuscrollen und zu bewerten.

---

## Klare Sprachjob-Definitionen

Beschreiben Sie in einfacher Sprache, wonach Sie suchen. Snoopy erstellt einen KI-gestützten Überwachungsjob aus Ihren Kriterien — kein Regex, keine Keyword-Konfigurationen, keine booleschen Filter. Sagen Sie einfach, was Ihnen wichtig ist.

```bash
snoopy job add
```

Snoopy stellt Klärungsfragen, verfeinert Ihre Kriterien und erstellt einen strukturierten Überwachungsjob, der sofort bereit ist.

---

## KI-Qualifizierung, kein Keyword-Matching

Gespräche werden anhand Ihrer Intention bewertet, nicht nur anhand von Keywords gematcht. Snoopy versteht Kontext — es kennt den Unterschied zwischen jemandem, der sich über Ihr Produkt *beschwert*, und jemandem, der Ihr Produkt *kaufen möchte*.

Konfigurieren Sie Ihren Qualifizierungsprompt einmalig. Snoopy wendet ihn auf jeden Beitrag und jeden Kommentar an, den es findet.

---

## Feedbackgesteuerte Prompt-Lernfähigkeit

Snoopy unterstützt jetzt eine vollständige Feedback-Schleife, sodass die Qualifizierungsqualität im Laufe der Zeit verbessert:

1. Überprüfen Sie kürzlich nicht validierte qualifizierte Ergebnisse
2. Reichen Sie pro Ergebnis valid/invalid Feedback ein
3. Konsolidieren Sie dieses Feedback, um einen intelligenteren Qualifizierungsprompt zu erstellen

```bash
snoopy feedback review --json
snoopy feedback submit <resultId> --invalid --reason "Not actually buying intent"
snoopy feedback consolidate
```

Für interaktive Überprüfungen fragt Snoopy, ob vor dem vorzeitigen Beenden eine Konsolidierung durchgeführt werden soll, damit Prompt-Updates nicht vergessen werden.

---

## Kontinuierliche Daemon-Überwachung

Nach der Konfiguration scannt Snoopy im Hintergrund nach Cron-Zeitplänen. Setzen Sie Ihren Rhythmus und lassen Sie es laufen. Lösen Sie manuelle Scans für schnelle Validierung aus.

```bash
snoopy daemon start        # Hintergrund-Daemon starten
snoopy job run --limit 5   # Schneller manueller Scan
snoopy job runs <ref>      # Laufhistorie anzeigen
```

---

## Codegesteuerte Effizienz

Snoopy übernimmt Scraping, Planung, Zustandsverwaltung und Ergebnispersistierung mit deterministischem Code. Ihre Token fließen in die Qualifizierungsintelligenz — das Verstehen, ob ein Gespräch Ihrer Intention entspricht — und nicht in Infrastruktur-Overhead.

Keine Kontextfenster werden für Paginierungslogik verbrannt. Keine Token werden für Serialisierung und Speicherung verschwendet. Nur präzise Qualifizierung dort, wo es zählt.

---

## Lokal & Privat

Ergebnisse werden in einer lokalen SQLite-Datenbank gespeichert. Keine Cloud-Abhängigkeit. Ihre Überwachungsdaten und Suchkriterien bleiben auf Ihrem Gerät.

```bash
snoopy export --json --last-run   # Strukturierter Export
snoopy consume --json             # Ergebnisse als konsumiert markieren
```

Direkter SQLite-Zugriff für Agenten und Integrationen verfügbar. Vollständige Schema-Dokumentation in der [Datenbankschema](./reference/database-schema.md)-Referenz.

---

## Kostenbewusste Analysen

Verfolgen Sie entdeckte, neue und qualifizierte Elemente pro Lauf. Token-Verbrauch und Kostenberechnungen sind in jeder Analyseansicht integriert.

```bash
snoopy analytics --days 7
snoopy analytics <jobRef> --days 30
```

Ermitteln Sie genau, was die Ausführung jedes Überwachungsjobs im Laufe der Zeit kostet.

---

## Agenten- & CI-bereit

- **MCP-Server** — `snoopy mcp` stellt Tools über stdio für Claude Code, ChatGPT, Gemini oder jeden MCP-Host bereit
- **Direkter SQLite-Zugriff** — Agenten können Jobs einfügen, Ergebnisse abfragen und Lebenszyklus-Flags direkt in `~/.snoopy/snoopy.db` aktualisieren
- **Nicht-interaktiver Modus** — Übergeben Sie Job-Referenzen direkt für eine ausführungslose Ausführung
- **Maschinenlesbare Ausgabe** — `--json` Flag bei Export, Consume und Analytics
- **Umgebungsvariablen-Konfiguration** — `TELEPAT_OPENROUTER_KEY`, `SNOOPY_REDDIT_CLIENT_SECRET`, `SNOOPY_ROOT_DIR`

---

## Plattformübergreifend & Immer Aktiv

Läuft auf macOS, Linux und Windows. Registrieren Sie sich für den Start beim Neustart, damit die Überwachung nie stoppt.

```bash
snoopy startup install
snoopy startup status
snoopy doctor               # Gesundheitsprüfung
```

---

## Bereit, Ihre Gespräche zu finden?

[Loslegen →](./getting-started/installation.md)

Oder springen Sie direkt zum [Schnellstart](./getting-started/quickstart.md) und zur [CLI-Referenz](./reference/cli-reference.md).

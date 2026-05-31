---
title: Skills
sidebar_position: 4
description: Snoopy-Skill-Pakete für KI-Agenten-Workflows.
keywords:
  - skills
  - SKILL.md
  - agent skills
  - monitoring
---

# Skills

Snoopy liefert ein Skill-Paket, das KI-Agenten eine kontextfreie Workflow-Anleitung für Reddit-Überwachung bietet.

## Haupt-Skill-Paket

Das `skill/snoopy-cli/`-Paket ist das installierbare Skill-Bundle für Snoopy.

- **Ort**: `skill/snoopy-cli/SKILL.md` (Repository-Stamm)
- **Zweck**: Führt Agenten durch Installation, Einrichtung, Job-Verwaltung, Debugging und MCP-Integration
- **Format**: Spezifikation für Agent Skills konform

### Anwendungsfälle

- Snoopy von Grund auf installieren und konfigurieren
- Überwachungsjobs erstellen und verwalten
- Fehlgeschlagene Läufe mit Fehlern und Protokollen debuggen
- Snoopy bei Agenten-Frameworks registrieren (Claude, Cursor, VS Code usw.)
- MCP-Server für programmgesteuerten Zugriff verwenden
- Qualifizierte Ergebnisse für nachgelagerte Verarbeitung exportieren

### Kern-Datei

`skill/snoopy-cli/SKILL.md` enthält:

- Installations- und Einrichtungsanweisungen (interaktiv + nicht-interaktiv)
- Deterministischer Workflow für alle Operationen
- MCP-Tool-Set-Dokumentation
- Argumentsemantik und Einschränkungen
- Fallstricke und scharfe Kanten
- Fehlerbehandlungsmatrix
- Quellenbelegskarte

### Begleitreferenzen

- `references/command-catalog.md` — Vollständige Befehls/Argument-Matrix
- `references/troubleshooting.md` — Fehlerdiagnose

## Installationsorte

### Projektumfang

- `.agents/skills/snoopy-cli/`
- `.github/skills/snoopy-cli/`
- `.cursor/skills/snoopy-cli/`

### Benutzerumfang

- `~/.agents/skills/snoopy-cli/`
- `~/.copilot/skills/snoopy-cli/`
- `~/.claude/skills/snoopy-cli/`

## Erforderlicher Skill-Vertrag

Jeder mitgelieferte Skill muss dokumentieren:

1. **Name**: `snoopy-cli` (kebab-case, passt zum Verzeichnis)
2. **Eingaben**: OpenRouter-API-Schlüssel, Subreddits, Qualifizierungsprompt, Job-Name, Zeitplan
3. **Sicherheitsvorkehrungen**: Immer API-Schlüssel erfordern, Daemon muss für geplante Jobs laufen
4. **Ausgaben**: Job-Läufe, qualifizierte Ergebnisse, Analysen, Fehlerberichte
5. **Fehlermodi**: Fehlender API-Schlüssel, Daemon läuft nicht, Token-Abbruch, DB gesperrt
6. **Überprüfungsaufforderungen**: Sollte-auslösen- und Sollte-nicht-auslösen-Beispiele

## Veröffentlichungsregeln

- Kanonische Seite: `docs/for-agents/skills.md`
- Links zu Human-Docs: `docs/getting-started/installation.md`, `docs/getting-started/quickstart.md`
- Konkrete Beispiele: Alle Befehlsbeispiele sind kopier-/einfügesicher
- Synchronisationsanforderungen: Skill-Updates müssen in derselben Änderung wie CLI-Verhaltensänderungen erfolgen

## Sync- und Drift-Richtlinie

Wenn sich die MCP-Oberfläche ändert, aktualisieren Sie in derselben Änderung:

1. `src/mcp/tools.ts` (Schemata und Verträge)
2. `src/mcp/server.ts` (Handler)
3. `docs/for-agents/mcp-server.md` (MCP-Dokumentation)
4. `skill/snoopy-cli/SKILL.md` (Skill-Dokumentation)

Wenn sich die Agenten-Installationsziele ändern, aktualisieren Sie:

1. `src/agent/install.ts` (Installationslogik)
2. `docs/for-agents/agent-setup.md` (Einrichtungsdokumentation)
3. `skill/snoopy-cli/SKILL.md` (Skill-Dokumentation)

## Verwandte Seiten

- [MCP-Server](./mcp-server.md) — MCP-Server-Dokumentation
- [Agenten-Einrichtung](./agent-setup.md) — Framework-Registrierungsanweisungen
- [Für Agenten](./index.md) — Agenten-Einschränkungen und Entscheidungsablauf

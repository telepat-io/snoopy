---
title: Snoopy
slug: /
sidebar_position: 1
description: Überwachen Sie Reddit-Gespräche mit KI-Qualifizierung, führen Sie wiederkehrende Scan-Jobs nach Zeitplan aus und verwalten Sie alles über die CLI.
keywords: [reddit, monitoring, cli, scheduler, ai, documentation]
---

```text
┌─┐┌┐┌┌─┐┌─┐┌─┐┬ ┬
└─┐││││ ││ │├─┘└┬┘
└─┘┘└┘└─┘└─┘┴   ┴ 
```

# Finden Sie hochintensive Gespräche mit KI

Snoopy überwacht Online-Gespräche auf hochintensive Signale, die Ihren Geschäftszielen entsprechen.

Definieren Sie in einfacher Sprache, was Ihnen wichtig ist, lassen Sie Snoopy einen Überwachungsjob erstellen und scannen und qualifizieren Sie Gespräche kontinuierlich, damit Sie sich auf Reaktionen und Outreach konzentrieren können.

## Installation

```bash
npm install -g @telepat/snoopy
```

Voraussetzungen: Node.js 20+, npm 10+

## Schnellstart

1. Erstellen Sie Ihren ersten Überwachungsjob:

```bash
snoopy job add
```

2. Jobs auflisten:

```bash
snoopy jobs list
```

3. Einen Job sofort ausführen (während des Tests auf 5 neue Elemente begrenzen):

```bash
snoopy job run --limit 5
snoopy job run <jobRef> --limit 5
```

Wenn `<jobRef>` für `job run`, `job enable`, `job disable`, `job delete`, `start`, `stop` oder `errors` weggelassen wird, zeigt Snoopy Ihre Jobs und fordert Sie auf, einen auszuwählen.

4. Laufhistorie anzeigen:

```bash
snoopy job runs <jobRef>
```

5. Analysen anzeigen:

```bash
snoopy analytics
snoopy analytics <jobRef> --days 7
```

6. Qualifizierte Ergebnisse exportieren:

```bash
snoopy export
snoopy export <jobRef> --json --last-run
```

7. Hintergrund-Daemon starten:

```bash
snoopy daemon start
```

## Meistverwendete Befehle

- `job add`
- `job list`
- `job run [jobRef] --limit <N>`
- `job runs [jobRef]`
- `export [jobRef] --csv|--json [--last-run]`
- `start [jobRef]` / `stop [jobRef]`
- `delete [jobRef]`
- `daemon start|stop|status`
- `startup status`
- `doctor`

## Vollständige Dokumentation

- [Einführung](getting-started/overview.md)
- [Installation](getting-started/installation.md)
- [Schnellstart](getting-started/quickstart.md)
- [Anleitungen](guides/scheduling-and-startup.md)
- [CLI-Referenz](reference/cli-reference.md)
- [Datenbankschema](reference/database-schema.md)
- [Sicherheit und Geheimnisspeicherung](technical/security.md)
- [E2E-Smoke-Test-Anleitung](technical/e2e-testing.md)
- [Beitragen](contributing/development.md)

Deploy to GitHub Pages:

```bash
GITHUB_OWNER=cozymantis GITHUB_REPO=snoopy npm run docs:deploy
```

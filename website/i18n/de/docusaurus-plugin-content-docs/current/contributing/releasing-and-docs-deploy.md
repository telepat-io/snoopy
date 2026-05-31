---
title: Veröffentlichung und Docs-Deployment
description: Anleitung für die Veröffentlichung neuer Versionen und das Deployment der Dokumentation für den Snoopy Reddit-Überwachungs-CLI-Scheduler.
keywords: [reddit, monitoring, cli, scheduler, releasing, deploy, docs]
---

# Veröffentlichung und Docs-Deployment

Snoopy verwendet release-please-Automatisierung und npm-Veröffentlichungsworkflows.

## Veröffentlichungsautomatisierung

- `release-please.yml` verwaltet Versionierung/Changelog auf `main`.
- Wenn eine Veröffentlichung erstellt wird, läuft die Veröffentlichung mit Qualitätstoren und npm-Provenance.

## Manuelles Veröffentlichungs-Workflow

- `npm-publish.yml` ist für manuelle `workflow_dispatch`-Veröffentlichungen verfügbar.
- Es validiert Tag-Format, Paketmetadaten und main-Branch-Abstammung vor der Veröffentlichung.

## Docs-Deployment

Docs werden über `docs-pages.yml` auf GitHub Pages deployt.

Lokale Docs-Prüfungen:

```bash
npm run docs:build
```

## Referenzen

- [Einführung](../getting-started/overview.md)
- [CLI-Referenz](../reference/cli-reference.md)

---
title: Entwicklung
description: Beitragsanleitung für lokale Entwicklungseinrichtung und Qualitätstore bei der Arbeit am Snoopy Reddit-Überwachungs-CLI.
keywords: [reddit, monitoring, cli, ai, contributing, development]
---

# Beitragen: Entwicklung

Beiträge sind willkommen. Verwenden Sie diese Anleitung für lokale Entwicklung und Qualitätstore.

## Lokale Einrichtung

```bash
npm ci
npm run build
npm test
```

## Erforderliche Validierungsreihenfolge

Vor dem Öffnen eines PR führen Sie Prüfungen in dieser Reihenfolge aus:

```bash
npm run lint
npm run build
npm test
```

Wenn sich Docs/Site-Dateien geändert haben, führen Sie auch aus:

```bash
npm run docs:build
```

## Test-Erwartungen

- Fügen Sie Tests für bedeutende Verhaltensänderungen hinzu oder aktualisieren Sie sie.
- Halten Sie Änderungen begrenzt und explizit.
- Bewahren Sie plattformübergreifendes Verhalten für Start/Daemon-Befehle.

## Hilfreiche Referenzen

- [E2E-Smoke-Testing](../technical/e2e-testing.md)
- [Sicherheit](../technical/security.md)
- [CLI-Referenz](../reference/cli-reference.md)

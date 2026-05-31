---
title: Überblick
description: Erfahren Sie, was Snoopy ist und wie Sie mit KI-gestützter Reddit-Gesprächsüberwachung von der CLI aus starten.
keywords: [reddit, monitoring, cli, ai, overview, getting started]
---

# Einführung

Snoopy hilft Teams, Reddit auf hochintensive Gespräche zu überwachen, Ergebnisse mit KI zu qualifizieren und wiederkehrende Scan-Jobs nach Zeitplan auszuführen.

Verwenden Sie diesen Abschnitt, um von null zu einem zuverlässigen ersten Workflow zu gelangen.

## Was Sie brauchen

- Node.js 20+
- npm 10+
- OpenRouter-API-Schlüssel

## Vorgeschlagener Weg

1. Snoopy installieren und Anmeldedaten konfigurieren: [Installation](installation.md)
2. Ersten Job ausführen und Ausgabe validieren: [Schnellstart](quickstart.md)
3. Befehlsoberfläche kennenlernen: [CLI-Referenz](../reference/cli-reference.md)

## Kernkonzepte

- Jobs definieren Ihre Zielgruppe und Qualifizierungskriterien.
- Läufe führen Scans aus und speichern Analysen.
- Daemon-Modus führt aktivierte Jobs nach Cron-Zeitplänen aus.
- Ergebnisse werden lokal in SQLite gespeichert und können nach CSV exportiert werden.

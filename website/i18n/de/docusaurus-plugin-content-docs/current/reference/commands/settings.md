---
title: settings
sidebar_position: 5
description: CLI-Referenz für den Settings-Befehl zur Konfiguration der Snoopy Reddit-Überwachungs- und KI-Qualifizierungsoptionen.
keywords: [reddit, monitoring, cli, ai, settings, configuration]
---

# `settings`

Der `settings`-Befehl öffnet ein interaktives Einstellungsmenü.

```bash
snoopy settings
```

## Was Sie konfigurieren können

- OpenRouter-API-Schlüssel
- Standardmodell-ID
- Modelleinstellungen:
  - Temperatur
  - max tokens
  - top-p
- Reddit-OAuth-Fallback-Anmeldedaten (optional):
  - App-Name (Standard: generiertes `snoopy-<zufällig>`, bearbeitbar)
  - Client-ID
  - Client-Geheimnis (als hochwertiges Geheimnis über Schlüsselbund gespeichert, wenn verfügbar)

Alle Einstellungen sind gleichzeitig in einem navigierbaren Menü sichtbar. Verwenden Sie Auf/Ab-Pfeile und drücken Sie Enter, um direkt zur Einstellung zu springen, die Sie bearbeiten möchten, und kehren Sie dann zum Menü zurück.

Geheimnisartige Werte werden im Menü maskiert angezeigt:

- API-Schlüssel: teilweise maskiert
- Reddit-Client-ID: teilweise maskiert
- Reddit-Client-Geheimnis: nur als konfiguriert/fehlend angezeigt (nie ausgegeben)

Geheimnisspeicher-Verhalten:

- Wenn der Schlüsselbund verfügbar sind, werden Geheimnis-Edits aus `snoopy settings` persistiert.
- Wenn der Schlüsselbund nicht verfügbar ist, liest Snoopy Geheimnisse stattdessen aus Umgebungsvariablen:
  - `TELEPAT_OPENROUTER_KEY`
  - `SNOOPY_REDDIT_CLIENT_SECRET`
- In diesem Fall werden eingegebene Geheimniswerte in der Settings-UI nicht persistiert.

Wählen Sie `Save changes`, um Aktualisierungen zu speichern, oder `Cancel`/`Esc`, um ohne Speichern zu beenden.

## Wann Sie es verwenden

Verwenden Sie `settings`, wenn:

- Sie Snoopy zum ersten Mal konfigurieren
- Sie das Modell ändern
- Sie API-Anmeldedaten rotieren
- Sie optionale Reddit-OAuth-Fallback-Anmeldedaten konfigurieren oder rotieren

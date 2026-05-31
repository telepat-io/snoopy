---
title: Sicherheit
sidebar_position: 5
description: Wie Snoopy Geheimnisse und Betriebsdaten für KI-gestützte Reddit-Überwachung speichert, einschließlich API-Schlüsseln und Scheduler-Persistenz.
keywords: [reddit, monitoring, cli, ai, security, secrets, storage]
---

# Sicherheit und Geheimnisspeicherung

Dieses Dokument beschreibt, wie Snoopy Geheimnisse und Betriebsdaten speichert.

## Geheimnistypen

Snoopy behandelt diese hochwertigen Geheimnisse direkt:

- OpenRouter-API-Schlüssel
- Reddit-OAuth-Client-Geheimnis (optionales Fallback-Modell)

## Hochwertige Geheimnisspeicherung

Snoopy verwendet dieselbe Speicherstrategie für OpenRouter-API-Schlüssel und Reddit-OAuth-Client-Geheimnisse.

Hauptpfad:

- OS-Anmeldeinformations-Speicher über `keytar`

Fallback-Pfad:

- Umgebungsvariablen
	- `TELEPAT_OPENROUTER_KEY`
	- `SNOOPY_REDDIT_CLIENT_SECRET`

Standard-Stammverzeichnis:

- `~/.snoopy`

## Reddit OAuth Fallback-Metadaten

Nicht-geheime Reddit-Fallback-Metadaten werden in SQLite-Einstellungen gespeichert:

- App-Name
- Client-ID

Das Reddit-Client-Geheimnis wird nicht in SQLite gespeichert.

## Daten im Ruhezustand

Hauptlokale Dateien:

- `snoopy.db` (Job-Konfigurationen, Lauf-Analysen, Scan-Elemente, Reddit-App-Name/Client-ID-Metadaten)
- `logs/snoopy.log`
- `daemon.pid`

Alle gespeichert unter dem App-Stammverzeichnis (Standard `~/.snoopy`).

## Protokollierung

Snoopy schreibt einfache Protokollzeilen nach:

- `<root>/logs/snoopy.log`

Betriebliche Anleitung:

- Vermeiden Sie das Protokollieren von Geheimnissen in benutzerdefinierten Patches.
- Behandeln Sie Protokolle als potenziell sensibel, da Titel/Inhalte und Fehler-Payloads Benutzer-/Geschäftskontext enthalten können.

## Hinweise zum Bedrohungsmodell

Das aktuelle Design ist für lokale Entwickler-/Betreibernutzung optimiert:

- Einbenutzer-Maschinenausgangslagen
- Keine Multi-Tenant-Autorisierungsschicht
- Keine ferne Steuerungsebene

## Absicherungsempfehlungen

- Verwenden Sie eine dedizierte Maschine/Benutzerkonto für produktionsähnliche Operationen.
- Beschränken Sie Dateisystemberechtigungen für das App-Stammverzeichnis.
- Bevorzugen Sie Umgebungen, in denen `keytar` funktioniert, oder injizieren Sie Geheimnisse zur Laufzeit über Umgebungsvariablen.
- Rotieren Sie den OpenRouter-Schlüssel regelmäßig.
- Rotieren Sie das Reddit-OAuth-Client-Geheimnis, wenn Fallback-Anmeldedaten verwendet werden.
- Sichern Sie die DB sicher ab, wenn Sie auf historische Qualifizierungsdaten angewiesen sind.
- Erwägen Sie eine vollständige Festplattenverschlüsselung auf dem Host.

## Schnelle Schritte zur Vorfallreaktion

Bei Verdacht auf einen kompromittierten Schlüssel:

1. Widerrufen/rotieren Sie betroffene Schlüssel in den Provider-Konsolen (OpenRouter und/oder Reddit-App).
2. Führen Sie `snoopy settings` aus und aktualisieren Sie die Anmeldedaten.
3. Aktualisieren Sie die Laufzeitumgebungsvariablen, wenn Ihr Deployment auf umgebungsbasierte Geheimnisinjektion setzt.
4. Überprüfen Sie die Protokolle auf versehentliche Schlüsselweitergabe.

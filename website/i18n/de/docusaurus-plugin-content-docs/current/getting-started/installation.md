---
title: Installation & Einrichtung
sidebar_position: 2
description: Installieren Sie das Snoopy CLI-Werkzeug und richten Sie KI-gestützte Reddit-Überwachung mit Ihrem ersten Scheduler-Job ein.
keywords: [reddit, monitoring, cli, ai, scheduler, installation, setup]
---

# Installation & Einrichtung

Verwenden Sie diese Anleitung für die Ersteinrichtung: Installieren Sie Snoopy, konfigurieren Sie Ihren OpenRouter-Schlüssel, fügen Sie Ihren ersten Job hinzu und überprüfen Sie, dass alles funktioniert.

## Voraussetzungen

- Node.js 20+
- npm 10+
- OpenRouter-API-Schlüssel (erforderlich für Qualifizierung)

Ohne OpenRouter-Schlüssel schlagen Job-Ausführungen fehl, wenn Snoopy die Qualifizierung erreicht.

## Snoopy installieren

Über npm (empfohlen):

```bash
npm install -g @telepat/snoopy
snoopy --help
```

Aus Quelle (Entwicklungsversionen):

```bash
npm install
npm run build
npm link
snoopy --help
```

## OpenRouter-API-Schlüssel konfigurieren

Setzen Sie Ihren Schlüssel über den interaktiven Einstellungsablauf:

```bash
snoopy settings
```

Navigieren Sie zu **OpenRouter API Key**, fügen Sie Ihren Schlüssel ein und speichern Sie ihn.

Speicherverhalten:
- Snoopy speichert Geheimnisse in Ihrem OS-Schlüsselbund, wenn dieser verfügbar ist.
- Wenn der Schlüsselbund nicht verfügbar ist, konfigurieren Sie Geheimnisse über Umgebungsvariablen:
	- `TELEPAT_OPENROUTER_KEY`
	- `SNOOPY_REDDIT_CLIENT_SECRET`

Fehlt der Schlüssel, fordert `snoopy job add` bei der Ersteinrichtung danach fragt, wenn der Schlüsselbund verfügbar ist.

## Ersten Job hinzufügen

Starten Sie den geführten Job-Ablauf:

```bash
snoopy job add
```

Was der Ablauf tut:
- Erhebt Ihre Überwachungsabsicht und Zusatzdetails
- Generiert Job-Name, Slug und Qualifizierungsprompt
- Speichert den Job lokal
- Führt einen sofortigen ersten Scan aus
- Aktiviert die geplante Ausführung nach dem Abschluss des ersten Durchlaufversuchs

Sie können auch den Kurzalias verwenden:

```bash
snoopy add
```

Listen Sie nach der Einrichtung Ihre Jobs auf:

```bash
snoopy jobs list
```

Um einen schnellen Validierungsscan mit Grenzwert durchzuführen:

```bash
snoopy job run --limit 5
snoopy job run <jobRef> --limit 5
```

## Einrichtung überprüfen

Führen Sie Gesundheitsprüfungen durch:

```bash
snoopy doctor
```

Bestätigen Sie mindestens:
- OpenRouter-API-Schlüssel ist konfiguriert
- Datenbank- und Dateisystemprüfungen sind erfolgreich

## Erster Befehlsablauf

Wenn Sie den vollständigen Einrichtungsweg an einem Ort möchten:

```bash
# 1) Global installieren
npm install -g @telepat/snoopy

# 2) Optional: Schlüssel vor der Job-Erstellung konfigurieren
snoopy settings

# 3) Ersten Job erstellen (fragt nach fehlenden Schlüssel/Einstellungen nach Bedarf)
snoopy job add

# 4) Gesundheit überprüfen
snoopy doctor
```

## Verwandte Dokumente

- [CLI-Referenz](../reference/cli-reference.md)
- [Job-Befehlsreferenz](../reference/commands/job.md)
- [Agenten-Operationen](../guides/agent-operations.md)
- [Sicherheit und Geheimnisspeicherung](../technical/security.md)

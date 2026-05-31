---
title: MCP-Server
sidebar_position: 3
description: Wie Sie Snoopy's MCP-Server für programmgesteuerten Agenten-Zugriff auf Reddit-Überwachung verwenden.
keywords:
  - MCP
  - Model Context Protocol
  - agent
  - monitoring
  - tools
---

# MCP-Server

Snoopy bietet einen ersten MCP-Server (Model Context Protocol) für programmgesteuerten Agenten-Zugriff. Der Server stellt Snoopy's vollständige Überwachungsoberfläche als MCP-Tools über stdio-Transport bereit.

## Server starten

```bash
snoopy mcp
```

Der Server läuft auf stdio-Transport und ist dafür gedacht, von einem MCP-Client (Agenten-Framework) gestartet zu werden. Er akzeptiert keine interaktive Eingabe.

## Transport und Umfang

- **Transport**: stdio (JSON-RPC-Nachrichten auf stdout, Protokolle auf stderr)
- **Beabsichtigte Verwendung**: lokal prozessgestartete MCP-Clients
- **Protokoll**: MCP 1.0 mit initialize, tools/list und tools/call

## Verfügbare Tools

Der Server stellt 19 Tools bereit, die nach Kategorie organisiert sind:

### Gesundheitstools

| Tool | Beschreibung |
|------|-------------|
| `snoopy_doctor` | Vollständige Systemgesundheitsprüfung (Datenbank, API-Schlüssel, Daemon, Jobs, Start, kürzliche Fehler) |

### Daemon-Tools

| Tool | Beschreibung |
|------|-------------|
| `snoopy_daemon_status` | Zeigt an, ob der Daemon läuft und seine PID |
| `snoopy_daemon_start` | Startet den Hintergrund-Daemon |
| `snoopy_daemon_stop` | Stoppt den Hintergrund-Daemon |
| `snoopy_daemon_reload` | Hot-Reload der Job-Zeitpläne ohne Neustart |

### Job-Tools

| Tool | Beschreibung |
|------|-------------|
| `snoopy_job_list` | Listet alle Überwachungsjobs mit Zustand, Subreddits, Zeitplan |
| `snoopy_job_runs` | Listet kürzliche Laufhistorie für einen Job oder alle Jobs |
| `snoopy_job_add` | Erstellt einen neuen Überwachungsjob |
| `snoopy_job_delete` | Löscht einen Job und alle seine Daten (Läufe, Scan-Elemente, Protokolle) |
| `snoopy_job_enable` | Aktiviert die Planung für einen Job |
| `snoopy_job_disable` | Deaktiviert die Planung für einen Job |
| `snoopy_job_run` | Löst einen sofortigen Job-Lauf aus |

### Analyse- und Ergebnis-Tools

| Tool | Beschreibung |
|------|-------------|
| `snoopy_analytics` | Zeigt Analysen (Tokens, Kosten, Beiträge, Kommentare) für Jobs |
| `snoopy_export` | Exportiert qualifizierte Scan-Elemente als JSON oder CSV |
| `snoopy_consume` | Listet und markiert nicht konsumierte qualifizierte Ergebnisse |

### Diagnose-Tools

| Tool | Beschreibung |
|------|-------------|
| `snoopy_errors` | Zeigt kürzliche fehlgeschlagene oder fehlerhafte Läufe für einen Job |
| `snoopy_logs` | Zeigt die Protokollausgabe für einen bestimmten Lauf an |

### Einstellungs-Tools

| Tool | Beschreibung |
|------|-------------|
| `snoopy_settings_get` | Liest aktuelle Einstellungen (Modell, API-Schlüssel-Status, Zeitplan) |
| `snoopy_settings_set` | Aktualisiert eine einzelne Einstellung |

## MCP-Aufrufbeispiele

### Tools auflisten

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/list"
}
```

### Gesundheitsprüfung ausführen

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "snoopy_doctor",
    "arguments": {}
  }
}
```

### Jobs auflisten

```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "snoopy_job_list",
    "arguments": {}
  }
}
```

### Job erstellen

```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "method": "tools/call",
  "params": {
    "name": "snoopy_job_add",
    "arguments": {
      "name": "SaaS Lead Monitor",
      "subreddits": ["startups", "SaaS", "entrepreneur"],
      "qualificationPrompt": "Qualify only if the user is actively seeking SaaS recommendations or alternatives.",
      "scheduleCron": "*/30 * * * *"
    }
  }
}
```

### Ergebnisse exportieren

```json
{
  "jsonrpc": "2.0",
  "id": 5,
  "method": "tools/call",
  "params": {
    "name": "snoopy_export",
    "arguments": {
      "jobRef": "saas-lead-monitor",
      "format": "json",
      "lastRun": true
    }
  }
}
```

## Fehlerbehandlung

Alle Tools geben Fehler im MCP-Standardformat zurück:

```json
{
  "content": [{ "type": "text", "text": "Fehlermeldung" }],
  "isError": true
}
```

Häufige Fehler:

| Fehler | Bedeutung |
|-------|---------|
| `Job not found: <ref>` | Ungültige Job-Referenz; überprüfen Sie `snoopy_job_list` |
| `Run not found: <id>` | Ungültige Lauf-ID; überprüfen Sie `snoopy_job_runs` |
| `Unknown setting: <key>` | Ungültiger Einstellungsschlüssel für `snoopy_settings_set` |

## Fehlerbehebung

| Symptom | Wahrscheinliche Ursache | Lösung |
|---------|------------------------|--------|
| Server beendet sofort | Stdio-Transportfehler | Stellen Sie sicher, dass Sie im richtigen MCP-Client-Kontext laufen |
| Tools erscheinen nicht im Agenten | Server nicht registriert | Führen Sie `snoopy agent install <runtime>` aus |
| Doctor zeigt API-Schlüssel fehlt | Schlüssel nicht konfiguriert | Führen Sie `snoopy settings` aus oder setzen Sie `TELEPAT_OPENROUTER_KEY` |
| Job-Lauf fehlschlägt | Daemon läuft nicht | Führen Sie `snoopy daemon start` aus |

## Verwandte Seiten

- [Agenten-Einrichtung](./agent-setup.md) — Snoopy bei Agenten-Frameworks registrieren
- [Skills](./skills.md) — Snoopy-Skill-Pakete
- [Für Agenten](./index.md) — Agenten-Einschränkungen und Entscheidungsablauf

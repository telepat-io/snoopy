---
title: Agenten-Einrichtung
sidebar_position: 5
description: Registrieren Sie Snoopy bei KI-Agenten-Frameworks für MCP-basierte Reddit-Überwachung.
keywords:
  - agent setup
  - MCP registration
  - Claude
  - Cursor
  - VS Code
  - Codex
  - Gemini
  - OpenCode
---

# Agenten-Einrichtung

Registrieren Sie Snoopy's MCP-Server bei KI-Agenten-Frameworks für programmgesteuerte Reddit-Überwachung.

## Schnellstart

```bash
# Bei Claude Code registrieren
snoopy agent install claude

# Bei Cursor registrieren
snoopy agent install cursor

# Bei VS Code registrieren
snoopy agent install vscode

# Registrierungsstatus überprüfen
snoopy agent status
```

## Unterstützte Frameworks

| Framework | Runtime-ID | Konfigurationsziel | Format |
|-----------|-----------|-------------------|--------|
| Claude Code | `claude` | `~/.claude/settings.json` | JSON |
| Claude Desktop | `claude-desktop` | Plattformspezifische Claude Desktop-Konfiguration | JSON |
| ChatGPT Desktop | `chatgpt` | Manuelle Einrichtung über Entwicklermodus | N/A |
| Gemini CLI | `gemini` | `~/.gemini/settings.json` | JSON |
| Codex | `codex` | `~/.codex/config.toml` | TOML |
| Cursor | `cursor` | `~/.cursor/mcp.json` | JSON |
| VS Code | `vscode` | `.vscode/mcp.json` (Arbeitsbereich) | JSON |
| OpenCode | `opencode` | `opencode.json` (Projektstamm) | JSON |
| Generisch | `generic-mcp` | Auf stdout ausgegeben | Manuell |

## Einrichtung pro Framework

### Claude Code

```bash
snoopy agent install claude
```

Registriert `snoopy` MCP-Server in `~/.claude/settings.json` unter `mcpServers`.

### Claude Desktop

```bash
snoopy agent install claude-desktop
```

Registriert in der Claude Desktop-Konfiguration (macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`).

### ChatGPT Desktop

```bash
snoopy agent install chatgpt
```

Gibt manuelle Einrichtungsanweisungen aus. ChatGPT Desktop erfordert einen HTTP-MCP-Endpunkt über den Entwicklermodus.

### Gemini CLI

```bash
snoopy agent install gemini
```

Registriert in `~/.gemini/settings.json` unter `mcpServers`.

### Codex

```bash
snoopy agent install codex
```

Fügt `[mcp_servers.snoopy]`-Bereich zu `~/.codex/config.toml` hinzu.

### Cursor

```bash
snoopy agent install cursor
```

Registriert in `~/.cursor/mcp.json` unter `mcpServers`.

### VS Code

```bash
snoopy agent install vscode
```

Registriert in `.vscode/mcp.json` unter `servers` (Arbeitsbereichsumfang).

### OpenCode

```bash
snoopy agent install opencode
```

Registriert in `opencode.json` unter `mcp` (Projektstamm).

### Generischer MCP

```bash
snoopy agent install generic-mcp
```

Gibt einen JSON-Konfigurationsschnipsel für die manuelle Registrierung in jedem MCP-kompatiblen Framework aus.

## Deinstallation

```bash
snoopy agent uninstall <runtime>
```

Entfernt nur Snoopy-eigene Einträge aus der Framework-Konfiguration. Andere MCP-Server bleiben erhalten.

## Überprüfung

Überprüfen Sie nach der Registrierung die Einrichtung:

1. Starten Sie das Agenten-Framework neu oder laden Sie es neu.
2. Überprüfen Sie, ob Snoopy-Tools in der Tool-Liste des Frameworks erscheinen.
3. Führen Sie einen einfachen Befehl aus (z. B. `snoopy_doctor`), um die Konnektivität zu überprüfen.

## Manuelle Registrierung

Wenn `snoopy agent install` für Ihr Framework nicht funktioniert, registrieren Sie manuell:

```json
{
  "mcpServers": {
    "snoopy": {
      "command": "snoopy",
      "args": ["mcp"]
    }
  }
}
```

Für VS Code:

```json
{
  "servers": {
    "snoopy": {
      "type": "stdio",
      "command": "snoopy",
      "args": ["mcp"]
    }
  }
}
```

## Fehlerbehebung

| Symptom | Wahrscheinliche Ursache | Lösung |
|---------|------------------------|--------|
| Tools erscheinen nicht | Framework nicht neu gestartet | Framework nach Registrierung neu starten |
| Server kann nicht starten | `snoopy` nicht im PATH | Überprüfen Sie mit `which snoopy` oder verwenden Sie absoluten Pfad |
| Doctor zeigt Probleme | System nicht gesund | Führen Sie `snoopy doctor` aus und beheben Sie gemeldete Probleme |

## Verwandte Seiten

- [MCP-Server](./mcp-server.md) — MCP-Server-Dokumentation und Tool-Liste
- [Skills](./skills.md) — Snoopy-Skill-Pakete
- [Für Agenten](./index.md) — Agenten-Einschränkungen und Entscheidungsablauf

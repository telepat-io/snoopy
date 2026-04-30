---
title: Agent Setup
sidebar_position: 5
description: Register Snoopy with AI agent frameworks for MCP-based Reddit monitoring.
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

# Agent Setup

Register Snoopy's MCP server with AI agent frameworks for programmatic Reddit monitoring.

## Quick start

```bash
# Register with Claude Code
snoopy agent install claude

# Register with Cursor
snoopy agent install cursor

# Register with VS Code
snoopy agent install vscode

# Check registration status
snoopy agent status
```

## Supported frameworks

| Framework | Runtime ID | Config target | Format |
|-----------|-----------|---------------|--------|
| Claude Code | `claude` | `~/.claude/settings.json` | JSON |
| Claude Desktop | `claude-desktop` | Platform-specific Claude Desktop config | JSON |
| ChatGPT Desktop | `chatgpt` | Manual setup via Developer Mode | N/A |
| Gemini CLI | `gemini` | `~/.gemini/settings.json` | JSON |
| Codex | `codex` | `~/.codex/config.toml` | TOML |
| Cursor | `cursor` | `~/.cursor/mcp.json` | JSON |
| VS Code | `vscode` | `.vscode/mcp.json` (workspace) | JSON |
| OpenCode | `opencode` | `opencode.json` (project root) | JSON |
| Generic | `generic-mcp` | Printed to stdout | Manual |

## Per-framework setup

### Claude Code

```bash
snoopy agent install claude
```

Registers `snoopy` MCP server in `~/.claude/settings.json` under `mcpServers`.

### Claude Desktop

```bash
snoopy agent install claude-desktop
```

Registers in Claude Desktop config (macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`).

### ChatGPT Desktop

```bash
snoopy agent install chatgpt
```

Prints manual setup instructions. ChatGPT Desktop requires a remote HTTP MCP endpoint via Developer Mode.

### Gemini CLI

```bash
snoopy agent install gemini
```

Registers in `~/.gemini/settings.json` under `mcpServers`.

### Codex

```bash
snoopy agent install codex
```

Appends `[mcp_servers.snoopy]` section to `~/.codex/config.toml`.

### Cursor

```bash
snoopy agent install cursor
```

Registers in `~/.cursor/mcp.json` under `mcpServers`.

### VS Code

```bash
snoopy agent install vscode
```

Registers in `.vscode/mcp.json` under `servers` (workspace scope).

### OpenCode

```bash
snoopy agent install opencode
```

Registers in `opencode.json` under `mcp` (project root).

### Generic MCP

```bash
snoopy agent install generic-mcp
```

Prints a JSON config snippet for manual registration in any MCP-compatible framework.

## Uninstalling

```bash
snoopy agent uninstall <runtime>
```

Removes only Snoopy-owned entries from the framework config. Other MCP servers are preserved.

## Verification

After registration, verify the setup:

1. Restart or reload the agent framework.
2. Check that Snoopy tools appear in the framework's tool list.
3. Run a simple command (e.g. `snoopy_doctor`) to verify connectivity.

## Manual registration

If `snoopy agent install` doesn't work for your framework, register manually:

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

For VS Code:

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

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| Tools not appearing | Framework not restarted | Restart framework after registration |
| Server fails to start | `snoopy` not on PATH | Verify with `which snoopy` or use absolute path |
| Doctor shows issues | System not healthy | Run `snoopy doctor` and fix reported issues |

## Related pages

- [MCP Server](./mcp-server.md) — MCP server documentation and tool list
- [Skills](./skills.md) — Snoopy skill packages
- [For Agents](./index.md) — agent constraints and decision flow

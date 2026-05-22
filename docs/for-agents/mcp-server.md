---
title: MCP Server
sidebar_position: 3
description: How to use Snoopy's MCP server for programmatic agent access to Reddit monitoring.
keywords:
  - MCP
  - Model Context Protocol
  - agent
  - monitoring
  - tools
---

# MCP Server

Snoopy provides a first-party MCP (Model Context Protocol) server for programmatic agent access. The server exposes Snoopy's full monitoring surface as MCP tools over stdio transport.

## Starting the server

```bash
snoopy mcp
```

The server runs on stdio transport and is intended to be spawned by an MCP client (agent framework). It does not accept interactive input.

## Transport and scope

- **Transport**: stdio (JSON-RPC messages on stdout, logs on stderr)
- **Intended usage**: local process-spawned MCP clients
- **Protocol**: MCP 1.0 with initialize, tools/list, and tools/call

## Available tools

The server exposes 19 tools organized by category:

### Health tools

| Tool | Description |
|------|-------------|
| `snoopy_doctor` | Full system health check (database, API key, daemon, jobs, startup, recent errors) |

### Daemon tools

| Tool | Description |
|------|-------------|
| `snoopy_daemon_status` | Show whether the daemon is running and its PID |
| `snoopy_daemon_start` | Start the background daemon |
| `snoopy_daemon_stop` | Stop the background daemon |
| `snoopy_daemon_reload` | Hot-reload job schedules without restart |

### Job tools

| Tool | Description |
|------|-------------|
| `snoopy_job_list` | List all monitoring jobs with state, subreddits, schedule |
| `snoopy_job_runs` | List recent run history for a job or all jobs |
| `snoopy_job_add` | Create a new monitoring job |
| `snoopy_job_delete` | Delete a job and all its data (runs, scan items, logs) |
| `snoopy_job_enable` | Enable scheduling for a job |
| `snoopy_job_disable` | Disable scheduling for a job |
| `snoopy_job_run` | Trigger an immediate job run |

### Analytics and results tools

| Tool | Description |
|------|-------------|
| `snoopy_analytics` | Show analytics (tokens, cost, posts, comments) for jobs |
| `snoopy_export` | Export qualified scan items as JSON or CSV |
| `snoopy_consume` | List and mark unconsumed qualified results |

### Diagnostics tools

| Tool | Description |
|------|-------------|
| `snoopy_errors` | Show recent failed or errored runs for a job |
| `snoopy_logs` | View the log output for a specific run |

### Settings tools

| Tool | Description |
|------|-------------|
| `snoopy_settings_get` | Read current settings (model, API key status, schedule) |
| `snoopy_settings_set` | Update a single setting |

## Example MCP calls

### List tools

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/list"
}
```

### Run health check

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

### List jobs

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

### Create a job

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

### Export results

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

## Error handling

All tools return errors in MCP standard format:

```json
{
  "content": [{ "type": "text", "text": "Error message" }],
  "isError": true
}
```

Common errors:

| Error | Meaning |
|-------|---------|
| `Job not found: <ref>` | Invalid job reference; check `snoopy_job_list` |
| `Run not found: <id>` | Invalid run ID; check `snoopy_job_runs` |
| `Unknown setting: <key>` | Invalid settings key for `snoopy_settings_set` |

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| Server exits immediately | Stdio transport error | Ensure running in proper MCP client context |
| Tools not appearing in agent | Server not registered | Run `snoopy agent install <runtime>` |
| Doctor shows API key missing | Key not configured | Run `snoopy settings` or set `TELEPAT_OPENROUTER_KEY` |
| Job run fails | Daemon not running | Run `snoopy daemon start` |

## Related pages

- [Agent Setup](./agent-setup.md) — register Snoopy with agent frameworks
- [Skills](./skills.md) — Snoopy skill packages
- [For Agents](./index.md) — agent constraints and decision flow

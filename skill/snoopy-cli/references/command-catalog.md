# Command Catalog

Full command and argument matrix for the Snoopy CLI.

## Top-level commands

| Command | Description |
|---------|-------------|
| `snoopy job add` | Add a monitoring job (interactive) |
| `snoopy job list` | List monitoring jobs |
| `snoopy job enable <jobRef>` | Enable scheduling for a job |
| `snoopy job disable <jobRef>` | Disable scheduling for a job |
| `snoopy job run [jobRef]` | Run a job immediately |
| `snoopy job runs [jobRef]` | List recent run history |
| `snoopy job delete <jobRef>` | Delete a job and all data |
| `snoopy settings` | Update API key/model settings (interactive TUI) |
| `snoopy daemon start` | Start daemon in background |
| `snoopy daemon stop` | Stop daemon |
| `snoopy daemon status` | Show daemon status |
| `snoopy daemon reload` | Reload daemon schedules |
| `snoopy daemon run` | Run daemon in foreground |
| `snoopy startup enable` | Enable startup on reboot |
| `snoopy startup disable` | Disable startup on reboot |
| `snoopy startup status` | Show startup status |
| `snoopy doctor` | Run health checks |
| `snoopy logs [runId]` | Show logs for a run |
| `snoopy errors [jobRef]` | Show recent errors |
| `snoopy analytics [jobRef]` | Show analytics |
| `snoopy results [jobRef]` | Browse results (interactive TUI) |
| `snoopy export [jobRef]` | Export qualified results |
| `snoopy consume [jobRef]` | List and mark results consumed |
| `snoopy mcp` | Start MCP server (stdio) |
| `snoopy agent install <runtime>` | Register with agent framework |
| `snoopy agent uninstall <runtime>` | Remove from agent framework |
| `snoopy agent status` | Show agent registration status |

## Aliases

| Alias | Equivalent |
|-------|-----------|
| `snoopy add` | `snoopy job add` |
| `snoopy list` | `snoopy job list` |
| `snoopy delete <jobRef>` | `snoopy job delete <jobRef>` |
| `snoopy start <jobRef>` | `snoopy job enable <jobRef>` |
| `snoopy stop <jobRef>` | `snoopy job disable <jobRef>` |
| `snoopy jobs *` | `snoopy job *` |
| `snoopy reboot *` | `snoopy startup *` |

## Command arguments

### snoopy job run

```
snoopy job run [jobRef] [-l, --limit <count>]
```

- `jobRef`: Job ID or slug (optional if only one job exists)
- `--limit <count>`: Maximum new items to qualify (positive integer)

### snoopy export

```
snoopy export [jobRef] [--csv] [--json] [--last-run] [--limit <count>]
```

- `jobRef`: Job ID or slug (optional; omit for all jobs)
- `--csv`: Export as CSV (default)
- `--json`: Export as JSON
- `--last-run`: Only export items from the latest run
- `--limit <count>`: Max rows per job (default: 100)

### snoopy consume

```
snoopy consume [jobRef] [--limit <count>] [--json] [--dry-run]
```

- `jobRef`: Job ID or slug (optional)
- `--limit <count>`: Max results to consume
- `--json`: Output raw JSON array
- `--dry-run`: Preview without marking consumed

### snoopy errors

```
snoopy errors [jobRef] [--hours <count>]
```

- `jobRef`: Job ID or slug
- `--hours <count>`: Look back window in hours (default: 24)

### snoopy analytics

```
snoopy analytics [jobRef] [-d, --days <count>]
```

- `jobRef`: Job ID or slug (optional)
- `--days <count>`: Lookback window (default: 30)

### snoopy logs

```
snoopy logs [runId] [--raw]
```

- `runId`: Run ID to view
- `--raw`: Show raw log content without formatting

## MCP tools

| Tool | Required args | Optional args |
|------|---------------|---------------|
| `snoopy_doctor` | — | — |
| `snoopy_daemon_status` | — | — |
| `snoopy_daemon_start` | — | — |
| `snoopy_daemon_stop` | — | — |
| `snoopy_daemon_reload` | — | — |
| `snoopy_job_list` | — | — |
| `snoopy_job_runs` | — | `jobRef`, `limit` |
| `snoopy_job_add` | `name`, `subreddits`, `qualificationPrompt` | `description`, `scheduleCron`, `enabled`, `monitorComments` |
| `snoopy_job_delete` | `jobRef` | — |
| `snoopy_job_enable` | `jobRef` | — |
| `snoopy_job_disable` | `jobRef` | — |
| `snoopy_job_run` | `jobRef` | `limit` |
| `snoopy_analytics` | — | `jobRef`, `days` |
| `snoopy_export` | — | `jobRef`, `format`, `lastRun`, `limit` |
| `snoopy_consume` | — | `jobRef`, `limit`, `dryRun` |
| `snoopy_errors` | `jobRef` | `hours` |
| `snoopy_logs` | `runId` | — |
| `snoopy_settings_get` | — | — |
| `snoopy_settings_set` | `key`, `value` | — |

## Agent runtimes

| Runtime | ID | Config target |
|---------|-----|---------------|
| Claude Code | `claude` | `~/.claude/settings.json` |
| Claude Desktop | `claude-desktop` | Platform-specific Claude Desktop config |
| ChatGPT Desktop | `chatgpt` | Manual setup via Developer Mode |
| Gemini CLI | `gemini` | `~/.gemini/settings.json` |
| Codex | `codex` | `~/.codex/config.toml` |
| Cursor | `cursor` | `~/.cursor/mcp.json` |
| VS Code | `vscode` | `.vscode/mcp.json` (workspace) |
| OpenCode | `opencode` | `opencode.json` (project root) |
| Generic | `generic-mcp` | Printed to stdout |

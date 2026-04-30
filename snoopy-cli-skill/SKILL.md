---
name: snoopy-cli-skill
description: Use this skill when users need to install, configure, run, automate, debug, and troubleshoot the Snoopy CLI for Reddit conversation monitoring (including MCP server and agent framework registration) from zero context.
---

# Snoopy CLI Skill

## What this skill does

Snoopy monitors Reddit conversations using AI-powered qualification. It scans subreddits on a schedule, qualifies posts and comments against natural-language criteria using an LLM (via OpenRouter), and surfaces high-intent results for downstream workflows.

Use this skill to move from install -> setup -> first monitoring job -> iterative improvements -> debugging, without assuming prior Snoopy knowledge.

## Installation

Prerequisites:

- Node.js 20+
- npm 10+
- OpenRouter API key

Install paths:

```bash
# Global install
npm install -g @telepat/snoopy

# Verify install
snoopy --help
snoopy --version
```

## Setup and first run

Interactive setup path:

```bash
snoopy settings
```

This opens an interactive TUI to configure:
- OpenRouter API key (stored in system keychain or `SNOOPY_OPENROUTER_API_KEY`)
- LLM model (default: `moonshotai/kimi-k2.5`)
- Temperature, max tokens, topP
- Scan interval (default: 30 minutes)
- Job timeout (default: 10 minutes)
- Desktop notifications

Non-interactive setup path (CI/agents/containers):

```bash
export SNOOPY_OPENROUTER_API_KEY=sk-or-...
snoopy doctor
```

Setup verification checks:

```bash
# Full health check
snoopy doctor

# Expected: API key configured, DB reachable
```

## Local readiness checks

Readiness checklist:

1. CLI responds: `snoopy --help`
2. Doctor passes: `snoopy doctor` (all green)
3. Job creation works: `snoopy job add` (interactive) or via MCP `snoopy_job_add`
4. Daemon runs: `snoopy daemon start`
5. Job executes: `snoopy job run <jobRef> --limit 2`

Expected success signals:

- `snoopy doctor` shows all green checks.
- `snoopy daemon status` shows running with PID.
- `snoopy job run` exits 0 and shows items discovered/qualified.

## When to use this skill

Use this skill when:

- You need to set up Reddit monitoring from scratch.
- You need to manage monitoring jobs (create, enable, run, export, delete).
- You need the MCP server with Snoopy tools.
- You need to register Snoopy with agent frameworks (Claude, Cursor, VS Code, etc.).
- You need to debug failed runs, check errors, or inspect logs.
- You need to export qualified results for downstream processing.
- You need direct database access for advanced automation.

Do not use this skill when:

- You only need a quick explanation of one flag.
- You need to build Reddit bots (Snoopy monitors, it does not post).
- You need product architecture discussion without CLI execution.

## Inputs to collect from user

| Input | Required | Why it matters |
| --- | --- | --- |
| OpenRouter API key | Yes | Required for LLM qualification of posts |
| Subreddits | Yes (for jobs) | Which subreddits to monitor |
| Qualification prompt | Yes (for jobs) | Natural-language criteria for qualifying content |
| Job name | Yes (for jobs) | Display name for the monitoring job |
| Schedule | No | Cron expression, defaults to every 30 min |
| Monitor comments | No | Whether to also qualify comments, default true |

## Deterministic workflow

1. Discover user intent and risk class.
2. Confirm install and setup state using `snoopy doctor`.
3. Choose operation path:
   - Create job: `snoopy job add` or `snoopy_job_add` MCP tool
   - Run job: `snoopy job run <jobRef>` or `snoopy_job_run`
   - Check analytics: `snoopy analytics` or `snoopy_analytics`
   - Export results: `snoopy export <jobRef> --json --last-run` or `snoopy_export`
   - View errors: `snoopy errors <jobRef>` or `snoopy_errors`
   - Start daemon: `snoopy daemon start` or `snoopy_daemon_start`
   - Start MCP server: `snoopy mcp`
   - Register with agent: `snoopy agent install <runtime>`
4. Run minimal safe command first (`snoopy doctor`).
5. Escalate to full workflow only after verification succeeds.
6. Report:
   - command run
   - result/outcome
   - exit code
   - next safe step

Create-if-missing and update-if-existing behavior for this package:

- If this skill package is missing, create all files in this folder.
- If it exists, update in place and remove stale claims that conflict with current code/docs.

## Operations lifecycle

Start / run:

```bash
# Start daemon in background
snoopy daemon start

# Run daemon in foreground (debugging)
snoopy daemon run

# Reload daemon schedules (after enable/disable)
snoopy daemon reload
```

Common operations:

```bash
# Create a monitoring job (interactive)
snoopy job add

# List all jobs
snoopy job list

# Enable/disable scheduling
snoopy job enable <jobRef>
snoopy job disable <jobRef>

# Run a job immediately
snoopy job run <jobRef>
snoopy job run <jobRef> --limit 5

# View run history
snoopy job runs <jobRef>

# View analytics
snoopy analytics <jobRef> --days 7

# Export qualified results
snoopy export <jobRef> --json --last-run

# Consume (mark results as processed)
snoopy consume <jobRef> --limit 50

# View errors
snoopy errors <jobRef> --hours 48

# View run logs
snoopy logs <runId>
```

Monitoring / status:

```bash
snoopy doctor
snoopy daemon status
snoopy startup status
```

Update / upgrade:

```bash
npm i -g @telepat/snoopy@latest
snoopy --version
```

Cleanup / uninstall:

```bash
snoopy daemon stop
snoopy startup disable
npm uninstall -g @telepat/snoopy
```

## MCP and integrations

First-party MCP server:

```bash
snoopy mcp
```

Documented MCP characteristics:

- Transport: stdio
- Intended usage: local process-spawned MCP clients
- Tool set (19 tools): `snoopy_doctor`, `snoopy_daemon_status`, `snoopy_daemon_start`, `snoopy_daemon_stop`, `snoopy_daemon_reload`, `snoopy_job_list`, `snoopy_job_runs`, `snoopy_job_add`, `snoopy_job_delete`, `snoopy_job_enable`, `snoopy_job_disable`, `snoopy_job_run`, `snoopy_analytics`, `snoopy_export`, `snoopy_consume`, `snoopy_errors`, `snoopy_logs`, `snoopy_settings_get`, `snoopy_settings_set`

Agent framework registration:

```bash
snoopy agent install <runtime>
snoopy agent uninstall <runtime>
snoopy agent status
```

Supported runtimes: `claude`, `claude-desktop`, `chatgpt`, `gemini`, `codex`, `cursor`, `vscode`, `opencode`, `generic-mcp`.

## Argument semantics and constraints

Job management:

- `<jobRef>` accepts either job ID or slug everywhere.
- `--limit` caps new items qualified per run (positive integer).
- Schedule is a cron expression (default: `*/30 * * * *`).

Export:

- `--json` or `--csv` selects format (default: CSV).
- `--last-run` restricts to latest run's items only.
- `--limit` controls max rows per job (default: 100).

Consume:

- `--dry-run` previews without marking consumed.
- `--json` outputs raw JSON array.
- `--limit` caps results consumed.

Daemon:

- `snoopy daemon start` spawns a detached background process.
- `snoopy daemon reload` sends SIGUSR2 for hot-reload.
- `snoopy daemon stop` sends SIGTERM.

## Configuration precedence and discovery

Precedence (highest to lowest):

1. Environment variables (`SNOOPY_ROOT_DIR`, `SNOOPY_OPENROUTER_API_KEY`)
2. Settings DB (`~/.snoopy/snoopy.db` settings table)
3. Defaults (model, intervals, timeouts)

Key paths:

- Data directory: `~/.snoopy/` (override with `SNOOPY_ROOT_DIR`)
- Database: `~/.snoopy/snoopy.db`
- Logs: `~/.snoopy/logs/run-<runId>.log` (auto-deleted after 5 days)
- Results: `~/.snoopy/results/`
- PID file: `~/.snoopy/daemon.pid`

## Output and exit semantics

Machine-readable outputs:

- `snoopy doctor` prints structured health info.
- `snoopy export <jobRef> --json --last-run` returns JSON array of qualified items.
- `snoopy consume <jobRef> --json` returns JSON array of unconsumed items.
- MCP tools all return structured JSON.

Common exit semantics:

- `0`: success
- `1`: validation/runtime error
- `130`: interrupted by Ctrl+C

## Gotchas and sharp edges

- **Keychain unavailable**: On headless servers or containers, `keytar` may not work. Set `SNOOPY_OPENROUTER_API_KEY` env var instead. `snoopy doctor` will flag this.
- **Daemon PID staleness**: If the daemon crashes without cleanup, the PID file may be stale. `snoopy daemon start` handles this automatically by checking if the PID is alive.
- **Token truncation**: LLM responses may exhaust completion tokens before emitting structured output. The qualification flow preserves truncation-aware retries.
- **Log auto-deletion**: Run logs are auto-deleted after 5 days. Export results if you need longer retention.
- **DB migrations**: All migrations are idempotent. If you see `pending migrations` in `snoopy doctor`, they will run on next DB access.
- **Daemon reload after changes**: After `snoopy job enable/disable`, run `snoopy daemon reload` to apply changes without restart.
- **Startup registration**: `snoopy startup enable` registers OS-level auto-start (launchd on macOS, systemd on Linux, Task Scheduler on Windows). This is separate from `snoopy daemon start`.

## Clarifying questions for risky operations

Destructive:

1. Are you sure you want to delete this job? All runs, scan items, and log files will be permanently removed.
2. Do you want to stop the daemon? Active scheduled runs will be interrupted.

Credential:

1. Should the API key be stored in the system keychain or passed via environment variable?
2. Are you running in a container where keychain access should be disabled?

Job configuration:

1. Which subreddits should this job monitor?
2. What qualification criteria should the LLM use? (Be specific to reduce false positives.)
3. Should comments also be monitored, or only posts?

## Failure handling

| Failure | Action |
| --- | --- |
| OpenRouter API key missing | Run `snoopy settings` or set `SNOOPY_OPENROUTER_API_KEY` |
| Daemon not running | Run `snoopy daemon start` |
| Job run failed | Check `snoopy errors <jobRef>` and `snoopy logs <runId>` |
| Token truncation in qualification | The flow retries automatically; check logs if persistent |
| DB locked | Another process may be writing; retry after a moment |
| Startup registration failed | Check platform support; `snoopy doctor` shows current state |

For all failures: run `snoopy doctor` first to get a system health overview.

## Verification prompts

Should trigger:

1. Set up Snoopy for Reddit monitoring from scratch.
2. Run Snoopy MCP server and register with Claude/Cursor/VS Code.
3. Debug a failed Snoopy job run using errors and logs.

Should not trigger:

1. Explain one Snoopy flag quickly.
2. Build a Reddit bot.
3. Summarize repo architecture without running CLI workflows.

## Companion references

- See `references/command-catalog.md` for full command/argument matrix.
- See `references/troubleshooting.md` for detailed failure diagnostics.

## Source evidence map

- CLI entrypoint: `src/cli/index.ts`
- CLI commands: `src/cli/commands/*.ts`
- DB repositories: `src/services/db/repositories/*.ts`
- Analytics service: `src/services/analytics/analyticsService.ts`
- Daemon control: `src/services/daemonControl.ts`
- Secret store: `src/services/security/secretStore.ts`
- Startup registration: `src/services/startup/index.ts`
- MCP server: `src/mcp/server.ts`, `src/mcp/tools.ts`, `src/mcp/helpers.ts`
- Agent install: `src/agent/install.ts`
- Types: `src/types/job.ts`, `src/types/settings.ts`
- Paths: `src/utils/paths.ts`
- Agent operations docs: `docs/guides/agent-operations.md`
- CLI reference: `docs/reference/cli-reference.md`

# Command Catalog (Agent-Exclusive)

Full command and argument matrix for the Snoopy CLI, focused on **non-interactive agent workflows only**.

**Note:** This catalog excludes interactive TUI commands (`snoopy settings`, `snoopy job add` interactive flow, `snoopy results` viewer, interactive `snoopy prompt` editor). Agents use non-interactive equivalents documented here.

---

## Top-Level Commands

| Command | Category | Type | Description | MCP Equivalent |
|---------|----------|------|-------------|----------------|
| `snoopy job list` | Job Mgmt | Deterministic | List all monitoring jobs with status | `snoopy_job_list` |
| `snoopy job run <jobRef>` | Job Mgmt | Deterministic | Execute job immediately (manual trigger) | `snoopy_job_run` |
| `snoopy job runs <jobRef>` | Job Mgmt | Deterministic | View job's run history | `snoopy_job_runs` |
| `snoopy job enable <jobRef>` | Job Mgmt | Deterministic | Enable scheduled runs for job | `snoopy_job_enable` |
| `snoopy job disable <jobRef>` | Job Mgmt | Deterministic | Disable scheduled runs for job | `snoopy_job_disable` |
| `snoopy job delete <jobRef>` | Job Mgmt | Destructive | Delete job and all associated data | `snoopy_job_delete` |
| `snoopy daemon start` | Daemon | Deterministic | Start background monitoring daemon | `snoopy_daemon_start` |
| `snoopy daemon stop` | Daemon | Deterministic | Stop background daemon | `snoopy_daemon_stop` |
| `snoopy daemon status` | Daemon | Deterministic | Check if daemon is running | `snoopy_daemon_status` |
| `snoopy daemon reload` | Daemon | Deterministic | Hot-reload daemon schedules (after enable/disable) | `snoopy_daemon_reload` |
| `snoopy startup enable` | Startup | Deterministic | Register Snoopy to auto-start on reboot (launchd/systemd) | — |
| `snoopy startup disable` | Startup | Deterministic | Unregister Snoopy from auto-start | — |
| `snoopy startup status` | Startup | Deterministic | Check startup registration status | — |
| `snoopy doctor` | Diagnostics | Deterministic | Run full system health checks | `snoopy_doctor` |
| `snoopy errors <jobRef>` | Diagnostics | Deterministic | Show recent errors for job | `snoopy_errors` |
| `snoopy logs <runId>` | Diagnostics | Deterministic | Show detailed logs for a specific run | `snoopy_logs` |
| `snoopy analytics <jobRef>` | Monitoring | Deterministic | Show performance metrics (cost, tokens, qualification rate) | `snoopy_analytics` |
| `snoopy export <jobRef>` | Results | Deterministic | Export qualified results (read-only) | `snoopy_export` |
| `snoopy consume <jobRef>` | Results | Deterministic | Stream and mark results as consumed | `snoopy_consume` |
| `snoopy feedback review <jobRef>` | Feedback | Deterministic | Retrieve unvalidated results for feedback | `snoopy_feedback_review` |
| `snoopy feedback submit <resultId>` | Feedback | Deterministic | Submit feedback verdict (valid/invalid) | `snoopy_feedback_submit` |
| `snoopy feedback consolidate <jobRef>` | Feedback | Deterministic | Rewrite prompt based on feedback patterns | `snoopy_feedback_consolidate` |
| `snoopy prompt <jobRef>` | Prompt Mgmt | Deterministic | Show current qualification prompt (requires `--raw` for non-interactive) | — |
| `snoopy prompt set <jobRef> <prompt>` | Prompt Mgmt | Deterministic | Directly update qualification prompt (non-interactive) | — |
| `snoopy settings get <key>` | Settings | Deterministic | Get a setting value (non-destructive) | `snoopy_settings_get` |
| `snoopy settings set <key> <value>` | Settings | Deterministic | Set a configuration value | `snoopy_settings_set` |
| `snoopy mcp` | Integration | Deterministic | Start MCP server (stdio transport) | — |
| `snoopy agent install <runtime>` | Integration | Deterministic | Register Snoopy with agent framework | — |
| `snoopy agent uninstall <runtime>` | Integration | Deterministic | Unregister Snoopy from agent framework | — |
| `snoopy agent status` | Integration | Deterministic | Show agent framework registration status | — |
| `snoopy --version` | Meta | Deterministic | Show installed Snoopy version | — |
| `snoopy --help` | Meta | Deterministic | Show help text | — |

**Excluded from this catalog (interactive-only):**
- `snoopy job add` (use MCP tool `snoopy_job_add` instead)
- `snoopy settings` (interactive TUI; use `snoopy settings get/set` non-interactive commands or MCP tools)
- `snoopy results` (interactive viewer; use `snoopy export` or `snoopy consume` instead)
- `snoopy prompt` without `--raw` (interactive editor; use `snoopy prompt set` instead)

---

## Non-Interactive Flags & Modes

### Machine-Readable Output

| Flag | Commands | Purpose |
|------|----------|---------|
| `--json` | export, consume, feedback review, feedback consolidate, feedback submit, analytics, errors, doctor | Output as JSON (structuredagent-parseable format) |
| `--csv` | export | Output as CSV |
| `--raw` | prompt, logs | Output raw unformatted text (no JSON wrapper) |

### Control Flags

| Flag | Commands | Purpose | Values |
|------|----------|---------|--------|
| `--limit <count>` | job run, export, consume, feedback review, feedback consolidate | Limit result count | Positive integer (1–1000) |
| `--last-run` | export | Restrict to latest job run only | Boolean (no value needed) |
| `--hours <count>` | errors | Lookback window for recent errors | Positive integer (hours) |
| `--days <count>` | analytics | Lookback period for metrics | Positive integer (days) |
| `--dry-run` | consume | Preview without marking consumed | Boolean (no value needed) |

### Boolean Flags (Feedback Verdicts)

| Flag | Commands | Purpose | Mutually Exclusive |
|------|----------|---------|-------------------|
| `--valid` | feedback submit | Mark result as valid match | With `--invalid`; exactly one required |
| `--invalid` | feedback submit | Mark result as invalid | With `--valid`; exactly one required; requires `--reason` |
| `--reason <text>` | feedback submit | Explanation for invalid verdict | Required when `--invalid` used |

---

## Command Arguments & Constraints

### snoopy job run

```bash
snoopy job run <jobRef> [--limit <count>]
```

**Arguments:**
- `<jobRef>`: Job ID or slug (required)

**Flags:**
- `--limit <count>`: Maximum new items to qualify in this run (optional; positive integer)

**Output:**
- Prints discovery summary (items discovered, qualified); exit 0 on success

**Agent use:** Trigger manual job execution; limit results for testing

---

### snoopy export

```bash
snoopy export [<jobRef>] [--csv] [--json] [--last-run] [--limit <count>]
```

**Arguments:**
- `<jobRef>`: Job ID or slug (optional; omit to export all jobs)

**Flags:**
- `--csv` or `--json`: Output format (default: CSV)
- `--last-run`: Only export items from the latest run (optional)
- `--limit <count>`: Max rows per job (optional; default: 100)

**Output:**
- CSV or JSON array of qualified results; each item includes id, title, url, score, author, qualification reason

**Agent use:** Snapshot export for downstream processing; does NOT mark results as consumed

---

### snoopy consume

```bash
snoopy consume [<jobRef>] [--limit <count>] [--json] [--dry-run]
```

**Arguments:**
- `<jobRef>`: Job ID or slug (optional; omit to consume from all jobs)

**Flags:**
- `--limit <count>`: Max results to consume in this batch (optional)
- `--json`: Output raw JSON array (optional; default: formatted text)
- `--dry-run`: Preview without marking consumed (optional)

**Output:**
- JSON array of next unconsumed results; implicitly marks as consumed on next call

**Agent use:** Stream results; mark-as-consumed tracking; `--dry-run` for preview

---

### snoopy errors

```bash
snoopy errors <jobRef> [--hours <count>]
```

**Arguments:**
- `<jobRef>`: Job ID or slug (required)

**Flags:**
- `--hours <count>`: Lookback window (optional; default: 24)

**Output:**
- JSON array of recent errors with timestamp, error type, message, retryable flag

**Agent use:** Diagnose job failures; identify error patterns

---

### snoopy feedback review

```bash
snoopy feedback review [<jobRef>] [--json] [--limit <count>]
```

**Arguments:**
- `<jobRef>`: Job ID or slug (optional; omit to review all jobs)

**Flags:**
- `--json`: Machine-readable queue for agent parsing (required for agent use)
- `--limit <count>`: Max unvalidated results (optional; default: 10)

**Output:**
- JSON array of unvalidated qualified results, each with resultId, title, content, qualification reason

**Agent use:** Retrieve feedback queue; must use `--json`

---

### snoopy feedback submit

```bash
snoopy feedback submit <resultId> (--valid | --invalid --reason <text>) [--json]
```

**Arguments:**
- `<resultId>`: Result UUID (required)

**Flags (mutually exclusive; one required):**
- `--valid`: Mark result as valid
- `--invalid --reason <text>`: Mark result as invalid with reason (reason mandatory)

**Flags (optional):**
- `--json`: Output machine-readable status (optional)

**Output:**
- JSON confirmation: `{"submitted": true, "resultId": "...", "verdict": "valid|invalid"}`

**Constraints:**
- Exactly one of `--valid` or `--invalid` is required
- `--reason` is mandatory when `--invalid` is used

**Agent use:** Submit per-result feedback; reason required for invalid verdicts

---

### snoopy feedback consolidate

```bash
snoopy feedback consolidate [<jobRef>] [--json] [--limit <count>]
```

**Arguments:**
- `<jobRef>`: Job ID or slug (optional; omit to consolidate all jobs)

**Flags:**
- `--json`: Machine-readable output (required for agent use)
- `--limit <count>`: Max pending feedback items to process (optional)

**Output:**
- JSON with oldPrompt, newPrompt, changesApplied array, requiresConsolidation flag

**Agent use:** Rewrite prompt from feedback; must use `--json`; this is the final step of atomic feedback workflow

---

### snoopy prompt

```bash
snoopy prompt <jobRef> [--raw]
```

**Arguments:**
- `<jobRef>`: Job ID or slug (required)

**Flags:**
- `--raw`: Print only prompt text (required for non-interactive agent use)

**Output:**
- Plain text prompt (with `--raw`) or interactive editor (without)

**Agent use:** Read current prompt with `--raw` flag; never use without `--raw` (interactive mode)

---

### snoopy prompt set

```bash
snoopy prompt set <jobRef> "<prompt_text>"
```

**Arguments:**
- `<jobRef>`: Job ID or slug (required)
- `<prompt_text>`: New qualification prompt (required; enclose in quotes)

**Output:**
- JSON confirmation: `{"success": true, "jobRef": "...", "message": "Prompt updated"}`

**Agent use:** Non-interactive prompt update (always available; no interactive mode)

---

### snoopy analytics

```bash
snoopy analytics [<jobRef>] [--days <count>]
```

**Arguments:**
- `<jobRef>`: Job ID or slug (optional; omit for all jobs)

**Flags:**
- `--days <count>`: Lookback window in days (optional; default: 7)

**Output:**
- JSON with stats: totalRuns, successfulRuns, failedRuns, failureRate, qualificationRate, tokensUsed, costEstimate, avgRunTime

**Agent use:** Performance monitoring; detect low qualification rates or cost spikes

---

### snoopy doctor

```bash
snoopy doctor
```

**No arguments or flags.**

**Output:**
- JSON with health status and array of checks: `{healthy: boolean, checks: [{name, status}, ...]}`

**Agent use:** Pre-operation verification; diagnostics after failures

---

### snoopy logs

```bash
snoopy logs <runId> [--raw]
```

**Arguments:**
- `<runId>`: Run ID (required)

**Flags:**
- `--raw`: Show raw log without formatting (optional)

**Output:**
- Raw log content or structured formatted output

**Agent use:** Debug specific runs; inspect detailed execution traces

---

## MCP Tools (22 Total)

All commands above are also available as MCP tools for framework integration.

### MCP Tool Signatures

| Tool | Input | Output | Use Case |
|------|-------|--------|----------|
| `snoopy_doctor` | {} | `{healthy: bool, checks: []}` | Pre-op health check |
| `snoopy_daemon_status` | {} | `{status: string, pid?: number}` | Check if daemon running |
| `snoopy_daemon_start` | {} | `{success: bool, message: string}` | Enable background jobs |
| `snoopy_daemon_stop` | {} | `{success: bool, message: string}` | Stop background jobs |
| `snoopy_daemon_reload` | {} | `{success: bool, message: string}` | Hot-reload schedules |
| `snoopy_job_list` | {} | `{jobs: [{id, slug, name, enabled, lastRun, ...}]}` | View all jobs |
| `snoopy_job_add` | `{name, subreddits, qualificationPrompt, monitorComments?, schedule?}` | `{success: bool, jobId: string, jobSlug: string}` | Create job (non-interactive) |
| `snoopy_job_run` | `{jobRef, limit?}` | `{success: bool, discovered: number, qualified: number}` | Manual job trigger |
| `snoopy_job_runs` | `{jobRef, limit?}` | `{runs: [{runId, status, timestamp, ...}]}` | View job history |
| `snoopy_job_enable` | `{jobRef}` | `{success: bool, jobRef: string, enabled: true}` | Enable scheduling |
| `snoopy_job_disable` | `{jobRef}` | `{success: bool, jobRef: string, enabled: false}` | Disable scheduling |
| `snoopy_job_delete` | `{jobRef}` | `{success: bool, message: string}` | Delete job (destructive) |
| `snoopy_export` | `{jobRef?, format?: "json"\|"csv", lastRun?: bool, limit?: number}` | `{items: [...]}` or CSV string | Snapshot export |
| `snoopy_consume` | `{jobRef?, limit?, dryRun?}` | `{items: [...]}` | Stream with mark |
| `snoopy_feedback_review` | `{jobRef?, limit?}` | `{results: [{resultId, title, content, ...}]}` | Feedback queue |
| `snoopy_feedback_submit` | `{resultId, isValid: bool, reason?: string}` | `{submitted: bool, verdict: string}` | Submit feedback |
| `snoopy_feedback_consolidate` | `{jobRef?, limit?}` | `{oldPrompt, newPrompt, changesApplied: []}` | Apply feedback |
| `snoopy_analytics` | `{jobRef?, days?}` | `{stats: {runs, rate, cost, ...}}` | Performance metrics |
| `snoopy_errors` | `{jobRef, hours?}` | `{errors: [{timestamp, message, ...}]}` | Error log |
| `snoopy_logs` | `{runId}` | `{content: string}` | Run logs |
| `snoopy_settings_get` | `{key}` | `{value: any}` | Read setting |
| `snoopy_settings_set` | `{key, value}` | `{success: bool}` | Write setting |

---

## Job Reference Resolution

Throughout commands, `<jobRef>` accepts:
- **Job ID:** `abc123xyz` (unique identifier)
- **Job slug:** `my-job` (URL-friendly name)
- Either format works in any command

---

## Agent Framework Integration

| Runtime | Config Location | Registration Command |
|---------|-----------------|----------------------|
| Claude | `~/.claude/settings.json` | `snoopy agent install claude` |
| Claude Desktop | Platform-specific | `snoopy agent install claude-desktop` |
| Cursor | `~/.cursor/mcp.json` | `snoopy agent install cursor` |
| VS Code | `.vscode/mcp.json` | `snoopy agent install vscode` |
| ChatGPT | Developer Mode (manual) | `snoopy agent install chatgpt` |
| Gemini | `~/.gemini/settings.json` | `snoopy agent install gemini` |
| Codex | `~/.codex/config.toml` | `snoopy agent install codex` |
| OpenCode | `opencode.json` | `snoopy agent install opencode` |
| Generic MCP | Stdout | `snoopy agent install generic-mcp` |
```

- `jobRef`: Job ID or slug (optional; omit for all jobs)
- `--json`: Output machine-readable queue for agents
- `--limit <count>`: Max unvalidated qualified results (default: 10)

### snoopy feedback submit

```
snoopy feedback submit <resultId> [--valid] [--invalid] [--reason <text>] [--json]
```

- `resultId`: Qualified result ID
- `--valid`: Mark result as valid
- `--invalid`: Mark result as invalid
- `--reason <text>`: Required when `--invalid` is used
- `--json`: Output machine-readable status including consolidation hints

Constraints:

- Exactly one of `--valid` or `--invalid` is required.
- `--reason` is mandatory when `--invalid` is selected.

### snoopy feedback consolidate

```
snoopy feedback consolidate [jobRef] [--limit <count>] [--json]
```

- `jobRef`: Job ID or slug (optional; omit for all jobs)
- `--limit <count>`: Max pending feedback items to process
- `--json`: Output per-job consolidation results and pending counts

### snoopy prompt

```
snoopy prompt <jobRef> [--raw]
```

- `jobRef`: Job ID or slug
- `--raw`: Print only prompt text and exit (best for scripting)

### snoopy prompt set

```
snoopy prompt set <jobRef> <prompt>
```

- `jobRef`: Job ID or slug
- `prompt`: New qualification prompt text

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
| `snoopy_feedback_review` | — | `jobRef`, `limit` |
| `snoopy_feedback_submit` | `resultId`, `isValid` | `reason` |
| `snoopy_feedback_consolidate` | — | `jobRef`, `limit` |
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

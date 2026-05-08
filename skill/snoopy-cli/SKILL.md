---
name: snoopy-cli
description: Agent-exclusive skill for installing, configuring, and automating Snoopy CLI for Reddit conversation monitoring. Covers non-interactive workflows: setup, job creation, results consumption, feedback loops, diagnostics, and MCP integration. Agents use this skill to orchestrate Reddit monitoring pipelines without assuming prior Snoopy knowledge.
---

# Snoopy CLI Skill (Agent-Exclusive)

## What this skill does

Snoopy monitors Reddit conversations using AI-powered qualification. It scans subreddits on a schedule, qualifies posts and comments against natural-language criteria using an LLM (via OpenRouter), and surfaces high-intent results for downstream workflows.

This skill is **agent-exclusive**: it documents non-interactive command flows and programmatic workflows only. Agents use this skill to:
1. Install and configure Snoopy from scratch
2. Securely set up API credentials
3. Create and manage monitoring jobs
4. Consume and export qualified results
5. Run feedback loops to improve prompt quality
6. Diagnose issues and inspect errors/logs
7. Monitor job performance and costs

Use this skill to move from install → secure setup → daemon decision → job management → results consumption → feedback improvement → diagnostics, all via non-interactive CLI and MCP tools.

## Agent-Exclusive Design

This skill removes all interactive TUI workflows (settings prompts, interactive job creation, manual prompt editing). Agents use only non-interactive modes:

- **CLI flags:** `--json`, `--csv`, `--raw`, `--dry-run`, `--limit`
- **MCP tools:** 22 agent-callable tools (snoopy_job_add, snoopy_export, snoopy_feedback_*, etc.)
- **Environment variables:** For secure credential storage and CI/container deployments

This skill assumes **zero prior Snoopy knowledge**. Each workflow section includes:
- Plain-language description of what gets done
- Step-by-step commands with expected outputs
- Decision trees for agent logic
- Error handling and recovery patterns
- Guardrails to prevent risky auto-operations

---

## Installation & Setup

### 1. Installation Detection

**Check if Snoopy is installed:**

```bash
snoopy --version
```

Expected output: `Snoopy v<version>` (exit code 0 if installed, non-zero if missing)

**If not installed, install globally:**

```bash
npm install -g @telepat/snoopy
snoopy --version  # Verify success
```

Prerequisites:
- Node.js 20+
- npm 10+

### 2. Secure API Key Setup

Snoopy requires an OpenRouter API key for LLM qualification. Agent workflow:

**Step A: Detect environment**
```bash
snoopy doctor
```

This outputs a structured health report. If doctor shows `Keychain available: yes`, proceed to keychain storage. Otherwise, fall back to env var.

**Step B: Keychain storage (recommended for secure local deployments)**

Agent collects OpenRouter API key from user, then stores it:
```bash
snoopy settings set openrouter_api_key <API_KEY>
snoopy doctor  # Verify "API key configured: yes"
```

**Step C: Environment variable storage (for containers/headless)**

If keychain unavailable:
```bash
export SNOOPY_OPENROUTER_API_KEY=sk-or-...
snoopy doctor  # Verify "API key configured: yes"
```

**Get current API key status (non-destructive):**
```bash
snoopy settings get openrouter_api_key
```

Returns: `SET` (key is configured but not exposed) or `NOT_SET`

### 3. Daemon & Startup Registration Decision

Agent asks user ONE combined question:

> **Do you want Snoopy to run scheduled monitoring jobs automatically?**
> - **Yes:** Start daemon and register with OS auto-start (launchd/systemd/Task Scheduler)
> - **No:** Skip daemon; run jobs manually as needed

**If YES (scheduled jobs needed):**

```bash
# Start daemon (background process)
snoopy daemon start

# Register with OS auto-start
snoopy startup enable

# Verify both running
snoopy daemon status     # Should show: "running with PID xxx"
snoopy startup status    # Should show: "registered"
```

**If NO (manual jobs only):**

Proceed to job creation; user can run `snoopy job run <jobRef>` manually anytime.

### 4. Local Readiness Verification

Agent runs this diagnostic before major operations:

```bash
snoopy doctor
```

Expected output: All checks show `pass` (green).

Critical checks:
- CLI installed
- DB accessible
- API key configured
- Keychain available (warn if not on headless)
- Daemon running (if user chose scheduled jobs)
- Pending migrations (should be `pass`)

If doctor returns `healthy: false`, agent reviews failed checks and asks user which are blockers before proceeding.

## When to use this skill

Use this skill when an agent needs to:

- Set up Reddit monitoring from scratch (install → setup → ready)
- Create and manage monitoring jobs non-interactively
- Consume and export qualified results for downstream processing
- Improve job quality via feedback loops (review → submit → consolidate)
- Diagnose failed runs using errors, logs, and analytics
- Monitor job performance and detect cost outliers
- Check for Snoopy updates and upgrade when available
- Register Snoopy with agent frameworks (Claude, Cursor, VS Code)
- Start the Snoopy MCP server for agent integration

**Do not use this skill when:**

- You need a quick one-line command explanation (not a full workflow)
- You need to build Reddit bots (Snoopy only monitors; it does not post)
- You need architecture deep-dives without CLI execution
- You need interactive TUI workflows (this skill is non-interactive only)

## Agent Workflows Overview

This skill documents 12 core workflows organized by operation type:

### Core Workflows (7)

1. **Installation & Detection** — Check if installed, install from npm if needed
2. **Secure API Key Setup** — Configure OpenRouter credentials with fallback strategies
3. **Daemon & Startup Decision** — Enable scheduled jobs (optional, one decision)
4. **Job Management** — Create, list, enable/disable, delete jobs non-interactively
5. **Results Consumption** — Export snapshots or consume streaming results as JSON
6. **Feedback Loop** — Review → submit → consolidate workflow with guardrails
7. **Prompt Refinement** — Read and update qualification prompts programmatically

### Diagnostic Workflows (5)

8. **Doctor Health Checks** — Full system diagnostics before/after operations
9. **Errors & Logs Inspection** — Retrieve error patterns and detailed run logs
10. **Analytics & Monitoring** — Track performance, costs, and qualification rates
11. **Job Status & History** — View scheduling patterns and execution success rates
12. **Version Management** — Check for updates, upgrade when available

Each workflow includes:
- Plain-language purpose
- Step-by-step non-interactive commands
- Expected JSON/CSV output formats (where applicable)
- Error handling and recovery patterns
- Agent decision logic

---

## Job Creation Parameters (Required User Inputs)

When agents create a monitoring job, they collect these from the user:

| Parameter | Type | Required | Notes |
| --- | --- | --- | --- |
| Job name | string | Yes | Display name; can contain spaces |
| Subreddits | comma-separated list | Yes | Example: `subreddit1,subreddit2,subreddit3` |
| Qualification prompt | string | Yes | Plain-language criteria; e.g., "Looking for posts about X with buying intent" |
| Monitor comments | boolean | No | Default: `true`; monitor comments in addition to posts |
| Schedule (cron) | string | No | Default: `*/30 * * * *` (every 30 min); standard cron syntax |

---

## Core Workflows: Detailed Steps

### Workflow 1: Installation & Detection

**Purpose:** Ensure Snoopy CLI is installed globally and discoverable.

```bash
# Check if installed
snoopy --version

# Exit 0 = installed; non-zero = missing
# If exit 0, Snoopy is ready
# If non-zero, proceed to install:

npm install -g @telepat/snoopy
snoopy --version  # Verify success (should exit 0)
```

Agent decision logic:
- If `snoopy --version` exits 0 → proceed to Setup
- If install fails → report error and stop
- If version output is unexpected → report warning but continue

### Workflow 2: Secure API Key Setup

**Purpose:** Configure OpenRouter API key with automatic fallback for headless environments.

**Agent workflow:**

```bash
# Step 1: Detect environment capabilities
snoopy doctor  # Parse output for "Keychain available" field

# Step 2: If keychain available, store in keychain (recommended)
# Collect key from user (e.g., sk-or-...)
snoopy settings set openrouter_api_key <KEY>
snoopy doctor  # Verify "API key configured: yes"

# Step 2b: If keychain NOT available, use env var (containers/headless)
export SNOOPY_OPENROUTER_API_KEY=<KEY>
snoopy doctor  # Verify "API key configured: yes"

# Step 3: Verify success
snoopy settings get openrouter_api_key  # Should return "SET"
```

Agent guardrails:
- Never expose the actual API key in logs or output
- Always run doctor after setup to confirm
- If doctor shows `API key configured: no`, ask user to recheck the key
- Keychain failures should auto-route to env var fallback

### Workflow 3: Daemon & Startup Decision

**Purpose:** Enable optional background scheduling and OS-level auto-start.

**Agent workflow:**

```
Ask user: "Do you want scheduled monitoring jobs? (yes/no)"

If YES:
  snoopy daemon start           # Start background process
  snoopy startup enable         # Register with OS auto-start
  snoopy daemon status          # Verify "running with PID xxx"
  snoopy startup status         # Verify "registered"
  
  Confirm to user: "Daemon started and registered for auto-start"

If NO:
  Inform user: "Skipping daemon. You can run jobs manually with: snoopy job run <jobRef>"
```

Agent guardrails:
- ONE decision handles both daemon AND startup registration
- If daemon start fails, ask user to check logs: `snoopy logs` (most recent run)
- If startup fails, inform but don't block (some platforms may not support it)
- Ask explicitly before enabling auto-start (persistence decision)

### Workflow 4: Job Management

**Purpose:** Create, list, run, and manage monitoring jobs non-interactively.

#### 4a. Create Job (via MCP tool)

```bash
# Agent collects parameters from user:
# - name: "My Job"
# - subreddits: ["subreddit1", "subreddit2"]
# - qualificationPrompt: "Looking for X or Y"
# - monitorComments: true (default)
# - schedule: "*/30 * * * *" (optional, default)

# Call MCP tool: snoopy_job_add with JSON input:
{
  "name": "My Job",
  "subreddits": ["subreddit1", "subreddit2"],
  "qualificationPrompt": "Looking for buying intent signals",
  "monitorComments": true,
  "schedule": "*/30 * * * *"
}

# MCP output:
{
  "success": true,
  "jobId": "abc123xyz",
  "jobSlug": "my-job",
  "message": "Job created"
}
```

Agent responsibilities:
- Collect all required parameters before calling tool
- Validate non-empty subreddits list
- Validate non-empty qualification prompt
- Store jobRef (jobId or jobSlug) for later use

#### 4b. List Jobs

```bash
snoopy_job_list  # MCP tool

# Output: JSON array
{
  "jobs": [
    {
      "id": "abc123",
      "slug": "my-job",
      "name": "My Job",
      "subreddits": ["subreddit1"],
      "enabled": true,
      "lastRunTime": "2026-05-08T12:00:00Z",
      "nextScheduledTime": "2026-05-08T12:30:00Z",
      "totalRuns": 5,
      "totalQualified": 23
    },
    ...
  ]
}
```

#### 4c. Run Job Manually

```bash
snoopy job run <jobRef> --limit 5

# Output:
# Discovered: 50 items
# Qualified: 5 items (limited by --limit flag)
# Next scheduled run: 2026-05-08T14:30:00Z
# Exit code: 0 (success)
```

#### 4d. Enable/Disable Scheduling

```bash
snoopy job enable <jobRef>   # Enable scheduled runs
snoopy job disable <jobRef>  # Disable scheduled runs
snoopy daemon reload          # Hot-reload daemon schedules (required after enable/disable)
```

### Workflow 5: Results Consumption

**Purpose:** Retrieve qualified results for downstream processing.

#### 5a. Export (Read-Only Snapshot)

```bash
snoopy export <jobRef> --json --last-run

# Output: JSON array of results from last run
[
  {
    "id": "t3_abc123",
    "title": "Post title",
    "subreddit": "subreddit1",
    "author": "username",
    "score": 42,
    "url": "https://reddit.com/r/.../...",
    "createdAt": "2026-05-08T12:34:56Z",
    "qualificationReason": "Matched criteria: X",
    "consumed": false
  },
  ...
]
```

Agent use case:
- Snapshot results for immediate processing
- Does not mark results as consumed
- Safe to call repeatedly

#### 5b. Consume (Streaming with Mark)

```bash
snoopy consume <jobRef> --json --limit 50

# Output: JSON array of next 50 unconsumed results
[
  { "id": "...", "title": "...", ... },
  ...
]

# After agent processes results, they are implicitly marked consumed in next consume() call
```

Agent use case:
- Stream results one batch at a time
- Mark-as-consumed happens implicitly
- Use --limit to control batch size
- Use --dry-run to preview without marking

### Workflow 6: Feedback Loop (Atomic Workflow)

**Purpose:** Collect user feedback on qualified results and improve prompt quality.

**IMPORTANT:** Feedback loop is ONE atomic workflow. Agents MUST NOT skip consolidate step.

#### Step 1: Review Queue

```bash
snoopy feedback review <jobRef> --json --limit 10

# Output: JSON array of 10 unvalidated qualified results
[
  {
    "resultId": "feedback_uuid_1",
    "title": "Post title",
    "author": "username",
    "score": 42,
    "content": "Full post text here...",
    "qualificationReason": "Initial reason from prompt",
    "validated": false
  },
  ...
]
```

Agent responsibility:
- Display each result to user
- Collect explicit feedback: "Is this a good result for your criteria? (yes/no)"
- If "no", ask: "Why not? Please be specific." (reason required for invalid)

#### Step 2: Submit Feedback (Per Result)

```bash
# For each result with user verdict:

# If YES (valid):
snoopy feedback submit <resultId> --valid

# If NO (invalid, reason REQUIRED):
snoopy feedback submit <resultId> --invalid --reason "Not buying intent, just asking a question"

# Output: { "submitted": true, "resultId": "...", "verdict": "valid|invalid" }
```

Agent guardrails:
- NEVER skip collecting user judgment for any result
- NEVER fabricate a reason; user must provide it for invalid verdicts
- Invalid submissions WITHOUT --reason will fail; catch and re-prompt user

#### Step 3: Consolidate (Apply Learning)

```bash
snoopy feedback consolidate <jobRef>

# Standard console output now includes a per-job prompt diff section when prompt text changed.
# Agents should summarize that diff for the user.

# Optional machine-readable mode:
snoopy feedback consolidate <jobRef> --json

# Output (JSON mode): per-job consolidation status with prompt fields
{
  "totalPendingBefore": 3,
  "totalPendingAfter": 0,
  "totalConsolidated": 3,
  "requiresConsolidation": false,
  "jobs": [
    {
      "jobSlug": "my-job",
      "promptUpdated": true,
      "oldPrompt": "Original criteria...",
      "newPrompt": "Updated criteria...",
      "changeSummary": [
        "Added disqualifier for non-buying intent"
      ]
    }
  ],
  "requiresConsolidation": false
}
```

Agent flow after consolidate:
- In standard mode, read the end-of-run prompt diff and summarize concrete changes for the user.
- In JSON mode, compare `oldPrompt` and `newPrompt` (or `changeSummary`) and summarize concrete changes for the user.
- Confirm to user: "Prompt improved. Changes: [list]"
- Offer: "Run a test job to validate improved prompt? (yes/no)"
- If yes, go to Workflow 4c (run job manually)

**Workflow Guardrails:**
- Never interrupt between review and consolidate without asking: "Exit now? (This will lose feedback. Or consolidate first?)"
- Always run consolidate before ending a feedback session
- After consolidate, offer to re-run job to test quality

### Workflow 7: Prompt Refinement

**Purpose:** Read and update qualification prompts programmatically.

#### 7a. Read Current Prompt

```bash
snoopy prompt <jobRef> --raw

# Output: Plain text (no JSON), suitable for display or LLM processing
Looking for posts mentioning X or Y with buying intent signals. Exclude posts that are just questions.
```

Agent use case:
- Display current prompt to user
- Pass to LLM for suggestions
- Use as input for manual refinement

#### 7b. Update Prompt

```bash
snoopy prompt set <jobRef> "New plain-language criteria that are more specific"

# Output: { "success": true, "jobRef": "...", "message": "Prompt updated" }
```

Agent workflow:
- Collect refined prompt from user
- Call prompt set
- Confirm: "Prompt updated successfully. Next job run will use new criteria."

---

## Diagnostic Workflows: Detailed Steps

### Workflow 8: Doctor Health Checks

**Purpose:** Verify system health before operations, diagnose failures, gate risky workflows.

```bash
snoopy doctor

# Output: Structured health report
{
  "healthy": true|false,
  "checks": [
    { "name": "CLI installed", "status": "pass" },
    { "name": "DB accessible", "status": "pass" },
    { "name": "API key configured", "status": "pass"|"fail" },
    { "name": "Keychain available", "status": "pass"|"warn" },
    { "name": "Daemon running", "status": "pass"|"fail" },
    { "name": "Startup registered", "status": "pass"|"warn" },
    { "name": "Pending migrations", "status": "pass"|"fail" },
    ...
  ]
}
```

Agent decision tree:
- `healthy: true` → proceed to target workflow
- `healthy: false` → analyze failed checks
  - If API key missing → route to Workflow 2 (Setup)
  - If daemon running check failed → route to Workflow 3 (Daemon)
  - If DB inaccessible → critical failure, escalate to user
- Any `warn` → log warning, ask user if they want to continue

### Workflow 9: Errors & Logs Inspection

**Purpose:** Debug failed runs by inspecting error patterns and detailed logs.

#### 9a. View Recent Errors

```bash
snoopy errors <jobRef> --hours 48

# Output: JSON array of recent errors
[
  {
    "timestamp": "2026-05-08T11:30:00Z",
    "error": "API key invalid",
    "context": "During LLM qualification",
    "retryable": false
  },
  {
    "timestamp": "2026-05-08T11:00:00Z",
    "error": "Token limit exceeded",
    "context": "LLM response truncated",
    "retryable": true
  },
  ...
]
```

#### 9b. Retrieve Detailed Logs

```bash
snoopy logs <runId>

# Output: Raw log file content or structured JSON (if --raw not specified)
# Shows full execution trace, LLM requests/responses, job progress
```

Agent flow:
1. Run job → check exit code
2. If exit non-zero → `snoopy errors <jobRef> --hours 48`
3. Identify error pattern
4. If pattern is transient (retry) → offer retry
5. If pattern is persistent → offer diagnostic steps (check API key, logs, etc.)

### Workflow 10: Analytics & Monitoring

**Purpose:** Track job performance, costs, and qualification rates.

```bash
snoopy analytics <jobRef> --days 7

# Output: JSON with performance metrics
{
  "jobRef": "...",
  "period": "7 days",
  "stats": {
    "totalRuns": 14,
    "successfulRuns": 13,
    "failedRuns": 1,
    "totalItemsDiscovered": 450,
    "totalItemsQualified": 45,
    "qualificationRate": 0.10,
    "costEstimate": "$0.50",
    "tokensUsed": 12500,
    "avgRunTime": "2.3s",
    "nextScheduledRun": "2026-05-08T14:30:00Z"
  }
}
```

Agent use cases:
- Detect poor qualification rates (< 0.05 = prompt may be too strict)
- Detect cost outliers or excessive token usage
- Monitor success rate (all runs successful = healthy)
- Decide whether to trigger feedback loop for improvement

### Workflow 11: Job Status & History

**Purpose:** Understand execution patterns and identify problematic jobs.

```bash
# List all jobs with status
snoopy_job_list

# View specific job's run history
snoopy job runs <jobRef>

# Output: JSON array of runs
[
  {
    "runId": "run_123",
    "timestamp": "2026-05-08T12:30:00Z",
    "status": "success|failed",
    "itemsDiscovered": 50,
    "itemsQualified": 5,
    "executionTime": "2.3s",
    "errorMessage": null|"error text if failed"
  },
  ...
]
```

Agent use cases:
- Detect jobs with recent failures
- Route failed jobs to Workflow 9 (error inspection)
- Understand qualification trends over time

### Workflow 12: Version Management

**Purpose:** Check for updates and upgrade when available.

```bash
# Check current version
snoopy --version
# Output: Snoopy v2.5.3

# Check latest available
npm view @telepat/snoopy version
# Output: 2.5.4

# If newer available, offer upgrade
npm install -g @telepat/snoopy@latest
snoopy --version  # Verify upgrade
```

Agent workflow:
- On startup or periodically, check version
- If newer version available, offer: "Snoopy v2.5.4 available. Upgrade? (yes/no)"
- If yes, run install and verify
- If upgrade fails, report error but don't block operations

## MCP Server & Agent Integration

### Starting the MCP Server

```bash
snoopy mcp
```

This starts the Snoopy MCP (Model Context Protocol) server. Transport: stdio. Intended for direct agent integration.

### 22 Agent-Callable MCP Tools

All Snoopy operations are available as MCP tools for agent frameworks (Claude, Cursor, VS Code, etc.):

| Tool | Purpose | Use Case |
| --- | --- | --- |
| **Diagnostic** | | |
| `snoopy_doctor` | System health check | Before operations, troubleshooting |
| **Daemon Control** | | |
| `snoopy_daemon_status` | Check daemon status | Verify scheduling is running |
| `snoopy_daemon_start` | Start background daemon | Enable scheduled jobs |
| `snoopy_daemon_stop` | Stop daemon | Pause scheduled jobs |
| `snoopy_daemon_reload` | Hot-reload schedules | After enable/disable job |
| **Job Management** | | |
| `snoopy_job_list` | List all jobs | View available jobs, status |
| `snoopy_job_add` | Create new job (non-interactive) | Primary job creation tool |
| `snoopy_job_run` | Execute job immediately | Manual job trigger |
| `snoopy_job_runs` | View job run history | Check execution patterns |
| `snoopy_job_enable` | Enable job scheduling | Resume scheduled runs |
| `snoopy_job_disable` | Disable job scheduling | Pause scheduled runs |
| `snoopy_job_delete` | Delete job | Clean up jobs |
| **Results** | | |
| `snoopy_export` | Export results as JSON/CSV | Snapshot qualified items |
| `snoopy_consume` | Consume & mark results | Stream results with tracking |
| **Feedback** | | |
| `snoopy_feedback_review` | Review unvalidated results | Get feedback queue (JSON) |
| `snoopy_feedback_submit` | Submit verdict on result | Mark result valid/invalid |
| `snoopy_feedback_consolidate` | Rewrite prompt from feedback | Apply quality improvements |
| **Monitoring** | | |
| `snoopy_analytics` | Performance metrics | Track costs, qualification rates |
| `snoopy_errors` | Recent error list | Debug failed runs |
| `snoopy_logs` | Detailed run logs | Inspect full execution trace |
| **Settings** | | |
| `snoopy_settings_get` | Get configuration value | Read settings (non-destructive) |
| `snoopy_settings_set` | Set configuration value | Store API key, model choice |

### Agent Framework Registration

```bash
# Register Snoopy with agent framework
snoopy agent install <runtime>

# Supported runtimes:
# - claude (Claude desktop)
# - cursor (Cursor IDE)
# - vscode (VS Code Copilot)
# - chatgpt (OpenAI ChatGPT plugin interface)
# - gemini (Google Gemini agent)
# - and others

# Verify registration
snoopy agent status

# Unregister if needed
snoopy agent uninstall <runtime>
```

### MCP Usage Pattern

Agents call MCP tools with structured inputs. Example:

```json
{
  "tool": "snoopy_job_add",
  "input": {
    "name": "My Monitor",
    "subreddits": ["subreddit1", "subreddit2"],
    "qualificationPrompt": "Looking for X",
    "monitorComments": true,
    "schedule": "*/30 * * * *"
  }
}

// Returns:
{
  "success": true,
  "jobId": "abc123",
  "jobSlug": "my-monitor",
  "message": "Job created"
}
```

## Argument Semantics & Output Formats

### Non-Interactive Flags

All Snoopy commands support non-interactive flags for agent use:

| Flag | Commands | Purpose |
| --- | --- | --- |
| `--json` | export, consume, feedback review, feedback consolidate, analytics, errors | Output as JSON (machine-readable) |
| `--csv` | export | Output as CSV (default if not specified) |
| `--raw` | prompt, logs | Raw unformatted output (text-only) |
| `--dry-run` | consume | Preview without marking consumed |
| `--limit <count>` | job run, export, consume, feedback review, analytics | Limit result count (positive integer) |
| `--hours <count>` | errors | Lookback window for recent errors (default: 24) |
| `--days <count>` | analytics | Lookback period for metrics (default: 7) |
| `--last-run` | export | Restrict to latest job run only |

### Configuration Precedence

Settings resolution order (highest to lowest):

1. Command-line flags (--json, --limit, etc.)
2. Environment variables (`SNOOPY_OPENROUTER_API_KEY`, `SNOOPY_ROOT_DIR`)
3. Settings database (`~/.snoopy/snoopy.db`)
4. Built-in defaults (model: `deepseek/deepseek-v4-pro`, interval: 30 min, timeout: 10 min)

### Data Paths

- **Data directory:** `~/.snoopy/` (override with `SNOOPY_ROOT_DIR`)
- **Database:** `~/.snoopy/snoopy.db` (jobs, results, settings, feedback)
- **Logs:** `~/.snoopy/logs/run-<runId>.log` (auto-deleted after 5 days)
- **Results:** `~/.snoopy/results/` (qualified items cached between exports)
- **Daemon PID file:** `~/.snoopy/daemon.pid` (used to track running process)

### Exit Code Semantics

- `0` — Success (command completed as expected)
- `1` — Validation or runtime error (missing param, API failure, etc.)
- `130` — Interrupted by Ctrl+C (user cancelled)

### JSON Output Guarantees

When `--json` flag is used, output is always valid JSON. Example:

```json
{
  "success": true|false,
  "data": [...],
  "error": null|"error message"
}
```

For export/consume, output is a raw JSON array:

```json
[
  { "id": "...", "title": "...", "url": "..." },
  ...
]
```

---

## Critical Gotchas & Mitigations

### 1. Keychain Unavailable (Containers)

**Problem:** On headless or containerized systems, system keychain is unavailable. `snoopy settings set ...` will fail.

**Mitigation:** Detect with `snoopy doctor`. If keychain unavailable (or on CI/Docker), use environment variable:

```bash
export SNOOPY_OPENROUTER_API_KEY=sk-or-...
snoopy doctor  # Verify success
```

### 2. Daemon PID Staleness

**Problem:** If daemon crashes without cleanup, the PID file may reference a dead process.

**Mitigation:** `snoopy daemon start` automatically checks if the stored PID is alive. If not, it removes the stale file and starts fresh.

### 3. Token Truncation in Qualification

**Problem:** LLM responses may exhaust token limits, emitting incomplete structured output.

**Mitigation:** Snoopy detects truncation and retries automatically. Check logs if retries are exhausted: `snoopy logs <runId>`

### 4. Feedback Not Consolidated

**Problem:** After `snoopy feedback submit`, results are marked validated but prompt quality does NOT change until consolidate runs.

**Mitigation:** Always call `snoopy feedback consolidate` after collecting feedback. Workflow is atomic: review → submit → consolidate. After consolidate finishes, inform the user of the prompt diff/changes before ending the session.

### 5. Daemon Reload Required

**Problem:** After `snoopy job enable` or `snoopy job disable`, the daemon is not aware of the change.

**Mitigation:** Always run `snoopy daemon reload` after modifying job enabled state.

### 6. Log Auto-Deletion

**Problem:** Run logs are auto-deleted after 5 days. Old diagnostic data is lost.

**Mitigation:** Export results (`snoopy export`) for long-term retention. Use analytics for historical trends.

### 7. DB Locked Errors

**Problem:** Multiple processes accessing the same DB may cause "database locked" errors.

**Mitigation:** Retry after a brief pause. Snoopy uses SQLite with automatic locking; brief waits usually resolve conflicts.

### 8. Startup Registration Platform-Specific

**Problem:** `snoopy startup enable` may fail on unsupported platforms (e.g., non-standard Linux distros).

**Mitigation:** Inform user but don't block. Manual daemon start (`snoopy daemon start`) still works. Startup registration is optional.

---

## Agent Clarifying Questions for Risky Operations

### Before Creating a Job

1. **Which subreddits should this job monitor?** (Required; user specifies list)
2. **What qualification criteria should the LLM use?** (Required; ask for plain-language description; more specificity reduces false positives)
3. **Should comments also be monitored, or only posts?** (Optional; defaults to `true`)
4. **Do you want this job to run on a schedule or manually?** (Determines daemon need; route to Workflow 3 if yes)

### Before Enabling Daemon & Startup

1. **Do you want Snoopy to run monitoring jobs automatically in the background?** (Yes/No; gates Daemon setup)
2. **This will register Snoopy to start automatically when your computer restarts. Is that OK?** (Confirm before `startup enable`)

### During Feedback Workflow

1. **For each unvalidated result: Is this a good match for your criteria?** (User must provide explicit yes/no for each)
2. **If not a match: Why not? Please be specific.** (Required if user says no; use reason as disqualifier in updated prompt)
3. **Consolidate feedback into improved prompt now?** (Confirm before ending feedback session; never skip this step)

### Before Stopping Daemon

1. **Stop the daemon? This will pause any scheduled jobs in progress.** (Confirm before `daemon stop`)

### Before Deleting a Job

1. **Delete this job? All runs, results, and feedback for this job will be permanently removed.** (Confirm before `job delete`)

---

## Failure Handling Matrix

| Failure Scenario | Root Cause Check | Remediation |
| --- | --- | --- |
| `snoopy --version` not found | CLI not installed or not in PATH | Run `npm install -g @telepat/snoopy` |
| `snoopy doctor` shows "API key: fail" | OpenRouter key missing/invalid | Run Workflow 2 (Secure API Key Setup) |
| `snoopy doctor` shows "Daemon running: fail" | Daemon not started or crashed | Run `snoopy daemon start`; check logs if it fails |
| `snoopy job run` fails (exit 1) | Job error; check details | Run `snoopy errors <jobRef>` and `snoopy logs <runId>` |
| `snoopy feedback submit` fails | Missing `--reason` for invalid verdict | Include `--reason "..."` when using `--invalid` |
| `snoopy feedback consolidate` doesn't improve prompt | Insufficient validated feedback | Run another review → submit → consolidate cycle |
| `snoopy export --json` output is invalid | Parsing error on agent side | Verify JSON with `jq` tool; report if malformed |
| `snoopy settings set` fails (keychain error) | Keychain unavailable | Fall back to env var: `export SNOOPY_OPENROUTER_API_KEY=...` |
| Startup registration failed | Platform not supported | Inform user; daemon still works manually |
| Token truncation in LLM response | Model response too long | Workflow retries automatically; check logs if persistent |

**For all failures: Start with `snoopy doctor` to get full system health overview.**

---

## Verification Prompts

### Should Trigger This Skill

1. **Agent needs to set up Reddit monitoring from scratch (install → setup → ready to monitor)**
2. **Agent needs to create and run monitoring jobs non-interactively**
3. **Agent needs to improve job quality by running a feedback loop (review → submit → consolidate)**
4. **Agent needs to diagnose a failed job run using errors and logs**
5. **Agent needs to export and process qualified results downstream**
6. **Agent needs to monitor job performance and cost tracking**
7. **Agent needs to register Snoopy with Claude/Cursor/VS Code**
8. **Agent needs to run the Snoopy MCP server for integration**

### Should NOT Trigger This Skill

1. Quick explanation of one command flag or argument
2. Build a Reddit bot that posts/comments (Snoopy only monitors)
3. Summarize product architecture without executing CLI workflows
4. Setup interactive TUI workflows (e.g., `snoopy settings` TUI, interactive job creation)
5. Database-level access or advanced SQL queries (Snoopy is CLI-first)

---

## Companion Documentation

Detailed reference materials:

- [references/command-catalog.md](references/command-catalog.md) — Full command/argument matrix with non-interactive modes and MCP equivalents
- [references/troubleshooting.md](references/troubleshooting.md) — Detailed failure diagnostics and agent execution patterns

## Source Evidence Map

This skill is derived from repository evidence. Key claims are traceable:

| Claim | Source Path | Confidence |
| --- | --- | --- |
| 22 MCP tools available | `src/mcp/tools.ts` | High |
| Doctor command outputs structured health report | `src/cli/commands/doctor.ts` | High |
| Feedback review → submit → consolidate workflow | `src/cli/commands/feedback.ts`, `src/services/feedback/consolidationService.ts` | High |
| Keychain storage with env var fallback | `src/services/security/secretStore.ts` | High |
| Daemon PID staleness auto-handling | `src/services/daemonControl.ts` | High |
| Job creation via MCP tool (non-interactive) | `src/mcp/tools.ts`, `src/mcp/helpers.ts` | High |
| Export/consume with --json flag | `src/cli/commands/export.ts`, `src/cli/commands/consume.ts` | High |
| Prompt read (--raw) and update (set) | `src/cli/commands/prompt.ts` | High |
| Errors and logs inspection | `src/cli/commands/errors.ts`, `src/cli/commands/logs.ts` | High |
| Analytics with --days flag | `src/cli/commands/analytics.ts`, `src/services/analytics/analyticsService.ts` | High |
| Agent framework registration | `src/agent/install.ts` | High |
| Daemon reload after enable/disable | `src/services/daemonControl.ts`, gotchas section | High |
| Log auto-deletion (5 days) | Implementation default | High |
| Settings database precedence | `src/services/db/repositories/settingsRepo.ts` | High |
| Config from environment variables | `src/utils/paths.ts`, throughout CLI | High |

---

## Agent Workflow Decision Tree

```
START: Agent initialization
  ↓
1. Installation Check
   ├─ snoopy --version exits 0? YES → go to 2
   └─ NO → npm install -g @telepat/snoopy → go to 2
  ↓
2. Health Verification
   ├─ snoopy doctor healthy=true? YES → go to 3
   └─ NO → diagnose failed checks → fix or escalate → retry 2
  ↓
3. API Key Setup
   ├─ snoopy doctor shows "API key configured"? YES → go to 4
   └─ NO → run Workflow 2 (Secure API Key Setup) → go to 3
  ↓
4. Daemon Decision
   ├─ Ask user: "Want scheduled jobs?" 
   ├─ YES → run Workflow 3 (Daemon) → go to 5
   └─ NO → skip daemon → go to 5
  ↓
5. Choose Operation
   ├─ "Create job?" → Workflow 4a (create) → Workflow 4c (run) → Workflow 5 (export)
   ├─ "Improve quality?" → Workflow 6 (feedback loop) → Workflow 7 (prompt update)
   ├─ "Check health?" → Workflow 8 (doctor)
   ├─ "Debug error?" → Workflow 9 (errors/logs)
   ├─ "Monitor performance?" → Workflow 10 (analytics)
   └─ "View job status?" → Workflow 11 (status/history)
  ↓
END: Report outcome
```

---

## Implementation Checklist for Agents

**Before any operation:**
- [ ] Run `snoopy --version` to confirm installed
- [ ] Run `snoopy doctor` to confirm all checks pass
- [ ] Confirm API key configured (doctor output)

**Before creating a job:**
- [ ] Confirm all required parameters (name, subreddits, prompt)
- [ ] Use MCP tool `snoopy_job_add` or CLI equivalent
- [ ] Verify job created (list jobs, confirm in output)

**Before running a job:**
- [ ] Confirm job exists (list jobs)
- [ ] Confirm daemon running if scheduled (or run manually)
- [ ] Check exit code (0 = success)

**During feedback workflow:**
- [ ] Review queue (`feedback review --json`)
- [ ] Collect explicit user verdict for EACH result
- [ ] Submit each result (`feedback submit`)
- [ ] Run consolidate (`feedback consolidate`)
- [ ] Summarize prompt diff/changes to user after consolidate completes
- [ ] NEVER skip consolidate step

**After any failure:**
- [ ] Run `snoopy doctor`
- [ ] Run `snoopy errors <jobRef>` to see patterns
- [ ] Run `snoopy logs <runId>` if needed for detailed trace
- [ ] Fix root cause or escalate to user


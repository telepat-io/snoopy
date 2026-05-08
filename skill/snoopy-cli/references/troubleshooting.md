# Troubleshooting

Detailed failure diagnostics for Snoopy operations, including agent-specific error modes.

---

## Quick Diagnostics Command

For any problem, start with:

```bash
snoopy doctor
```

This runs full system health checks and provides recovery hints for failed checks.

---

## Agent Execution Failures

Failures specific to non-interactive agent workflows (MCP tools and CLI flags).

### API Key Not Configured (Agent Context)

**Symptom:**
- `snoopy_doctor` returns `{"checks": [{"name": "API key configured", "status": "fail"}]}`
- MCP tools return `{"error": "OpenRouter API key not configured"}`

**Causes:**
- Keychain not available (headless server, container, remote environment)
- Environment variable `SNOOPY_OPENROUTER_API_KEY` not set
- API key stored in keychain but agent can't access macOS Keychain from sandboxed context

**Recovery (Agent Logic):**

```
If doctor.checks["API key configured"] == "fail":
  1. Attempt env var fallback:
     Ask user: "Provide OpenRouter API key: "
     export SNOOPY_OPENROUTER_API_KEY=<user_value>
  
  2. Verify with doctor:
     snoopy doctor
     
  3. If still fails:
     Inform: "Headless environment detected. 
              Set SNOOPY_OPENROUTER_API_KEY in your container/CI env."
```

**User Fix (Headless/Container):**

```bash
# Export API key in container/CI environment
export SNOOPY_OPENROUTER_API_KEY=sk-or-...

# Verify
snoopy doctor
```

### Keychain Access Denied (Agent Context)

**Symptom:**
- Agent framework (e.g., Claude Desktop) runs in sandboxed context
- `snoopy doctor` shows `{"status": "warn", "check": "Keychain available"}`
- Agent cannot retrieve API key stored in macOS Keychain

**Causes:**
- Snoopy stored API key in secure keychain (correct behavior)
- Agent framework runs in restricted context (sandboxed macOS app, container)
- Fallback env var not set

**Recovery (Agent Logic):**

```
If doctor.checks["Keychain available"] in ["warn", "fail"]:
  1. Inform user: "Keychain not accessible from agent context.
                   Set SNOOPY_OPENROUTER_API_KEY environment variable."
  2. Guide user to store API key as env var in agent config
```

**User Fix:**

For sandboxed agent frameworks (Claude Desktop, Cursor, etc.), manually configure env var in framework settings:

**Claude Desktop:** Edit `~/.claude/config.json`:
```json
{
  "environment": {
    "SNOOPY_OPENROUTER_API_KEY": "sk-or-..."
  }
}
```

**Cursor:** Edit `.cursor/mcp.json`:
```json
{
  "environment": {
    "SNOOPY_OPENROUTER_API_KEY": "sk-or-..."
  }
}
```

### Daemon Not Running (Agent Context)

**Symptom:**
- Agent calls `snoopy_daemon_status` → `{"status": "not_running"}`
- Scheduled jobs are not executing

**Causes:**
- User never started daemon (if they chose manual-only mode, this is expected)
- Daemon crashed and wasn't auto-restarted
- Startup not registered, so daemon didn't auto-start on reboot

**Recovery (Agent Logic):**

```
If daemon_status == "not_running" AND user enabled scheduled jobs:
  1. Check if this is expected:
     snoopy job list
     Count jobs with enabled=true
     If count == 0: No scheduled jobs; daemon not needed
  
  2. If there ARE scheduled jobs:
     Agent: "Daemon not running but scheduled jobs exist. 
             Start daemon now? (yes/no)"
     If yes: snoopy_daemon_start
  
  3. Verify recovery:
     snoopy_daemon_status  # Should return running
```

**User Fix:**

```bash
# Start daemon
snoopy daemon start

# Verify it's running
snoopy daemon status

# (Optional) Register for auto-start
snoopy startup enable
```

### Daemon Startup Failure

**Symptom:**
- `snoopy daemon start` exits with non-zero code
- `snoopy_daemon_start` MCP tool returns `{"success": false, "error": "..."}`

**Causes:**
- Port conflict (unlikely; daemon uses PID file only)
- Database migration failed during startup
- Corrupted database requiring recovery
- Missing dependencies after npm upgrade

**Recovery (Agent Logic):**

```
If daemon_start fails:
  1. Attempt database recovery:
     snoopy doctor
     If checks show "Pending migrations: fail":
       Retry snoopy daemon start (runs auto-migration)
  
  2. If still fails:
     Agent: "Daemon failed to start. Run diagnostics? (yes/no)"
     If yes:
       snoopy logs <latest_run>
       Show user error details
```

**User Fix (Local):**

```bash
# Run daemon in foreground to see detailed errors
snoopy daemon run

# If DB migration issue:
snoopy doctor  # Auto-applies pending migrations

# Retry
snoopy daemon start
```

### JSON Parsing Error (Agent Context)

**Symptom:**
- MCP tool returns valid JSON but parser fails
- Agent receives output like: `{"items": "not valid json array"}`
- Agent code crashes trying to parse expected JSON

**Causes:**
- Output truncation (response exceeded max length)
- Invalid characters in JSON (embedded newlines without escaping)
- Malformed response from error handler

**Recovery (Agent Logic):**

```
When parsing MCP tool output:
  1. Attempt JSON.parse()
  2. If it fails:
     a. Check if output is truncated:
        If output.length > 4000 chars AND ends with "}":
          Likely truncated; ask user to reduce --limit
     b. Check for embedded newlines:
        If contains unescaped \n in string fields:
          Parse with lenient mode or use --raw flag
     c. If unknown error:
        Escalate: "Invalid response format. Run: 
                  snoopy logs <runId> to inspect"
```

**User Fix:**

```bash
# If response truncated, reduce result count
snoopy export <jobRef> --limit 10 --json  # Smaller batch

# If token issue, increase max tokens in settings
snoopy settings
# Set maxTokens to 1200+
```

### Token Truncation (Agent Context)

**Symptom:**
- Job qualification stops mid-response
- Logs show incomplete JSON from LLM
- Results count is much lower than expected

**Causes:**
- LLM model exhausted completion tokens mid-response
- Qualification prompt is too complex/verbose

**Recovery (Agent Logic):**

```
If totalItems >> qualifiedItems AND qualification rate < 0.01:
  1. Check logs for truncation pattern:
     snoopy logs <runId>
     Search for "token limit" or incomplete JSON
  
  2. If truncation detected:
     Agent: "Prompt may be too complex. 
             Simplify and retry? (yes/no)"
```

**User Fix:**

```bash
# Increase max tokens in settings
snoopy settings set maxTokens 1200

# Retry the job
snoopy job run <jobRef>

# If still failing, simplify the qualification prompt
snoopy prompt set <jobRef> "Simpler criteria..."
```

### Command Flag Mismatch (Agent Context)

**Symptom:**
- Agent calls: `snoopy feedback submit --valid --reason "test"`
- Returns error: `--reason not applicable for --valid`

**Causes:**
- Incorrect flag combination (--reason only valid with --invalid)
- Agent forgot mutual exclusivity constraint

**Prevention (Agent Logic):**

```
Before calling feedback submit:
  If verdict == "valid":
    Command: snoopy feedback submit <resultId> --valid
  
  Else if verdict == "invalid":
    Validate reason provided
    Command: snoopy feedback submit <resultId> --invalid --reason "<reason>"
    If reason is empty:
      Escalate: "Invalid verdict requires reason"
```

---

## Health Check Failures

General health check failures.

### OpenRouter API key missing

**Symptom:** `snoopy doctor` shows "OpenRouter API key: missing"

**Causes:**
- Key not yet configured
- Keychain storage unavailable (headless server, container)
- Key stored in keychain but env var not set for non-interactive context

**Fix:**
```bash
# Interactive (if keychain available)
snoopy settings

# Non-interactive (containers, CI)
export SNOOPY_OPENROUTER_API_KEY=sk-or-...
```

### Database not reachable

**Symptom:** `snoopy doctor` shows "DB error: ..."

**Causes:**
- Data directory missing or permissions issue
- Corrupted database file
- Concurrent write lock

**Fix:**
```bash
# Check data directory
ls -la ~/.snoopy/

# Override data directory if needed
SNOOPY_ROOT_DIR=/custom/path snoopy doctor
```

### Daemon not running

**Symptom:** `snoopy doctor` shows "Daemon not running"

**Fix:**
```bash
snoopy daemon start
snoopy daemon status  # verify
```

### Stale daemon PID

**Symptom:** `snoopy daemon status` shows PID but process is dead

**Fix:**
```bash
# Snoopy handles this automatically on next start
snoopy daemon start
```

---

## Job Run Failures

### Run status: failed

**Symptom:** `snoopy job runs <jobRef>` shows status "failed"

**Diagnosis:**
```bash
snoopy errors <jobRef>
snoopy logs <runId>
```

**Common causes:**
- OpenRouter API key invalid or expired
- Model returned empty/truncated response
- Reddit API rate limit hit
- Network timeout

### Token truncation

**Symptom:** Qualification decisions seem incomplete in logs

**Cause:** LLM exhausted completion tokens before emitting structured JSON output.

**Fix:** Increase `maxTokens` in settings:
```bash
snoopy settings  # Set max tokens to 1200+
```

### Active run conflict

**Symptom:** Error message about "A run is already active for job ..."

**Cause:** A previous run is still marked as `running` in the DB (possibly crashed mid-run).

**Fix:** The conflict resolves automatically when the stale run times out. Check `snoopy job runs <jobRef>` for stuck runs.

---

## Daemon Issues

### Daemon won't start

**Symptom:** `snoopy daemon start` fails or daemon dies immediately

**Diagnosis:**
```bash
# Run in foreground to see errors
snoopy daemon run
```

**Common causes:**
- Port/resource conflict (unlikely, daemon uses PID file only)
- Missing dependencies after npm upgrade
- DB migration failure

### Reload not taking effect

**Symptom:** `snoopy daemon reload` succeeds but schedule changes don't apply

**Fix:**
```bash
# Full restart
snoopy daemon stop
snoopy daemon start

# Verify schedule
snoopy job list
```

---

## Export Issues

### No results exported

**Symptom:** `snoopy export` produces empty files

**Causes:**
- No qualified items exist yet (job hasn't run or found no matches)
- `--last-run` flag used but latest run had no qualified items
- Wrong job reference

**Diagnosis:**
```bash
snoopy job runs <jobRef>   # Check if runs exist and have qualified items
snoopy analytics <jobRef>  # Check total qualified count
```

---

## Startup Registration Issues

### macOS: LaunchAgent not loading

**Symptom:** `snoopy startup status` shows enabled but daemon doesn't start on reboot

**Fix:**
```bash
# Check if plist is valid
plutil -lint ~/Library/LaunchAgents/com.snoopy.daemon.plist

# Reload the agent
launchctl unload ~/Library/LaunchAgents/com.snoopy.daemon.plist
launchctl load ~/Library/LaunchAgents/com.snoopy.daemon.plist
```

### Linux: systemd user service not starting

**Diagnosis:**
```bash
systemctl --user status snoopy-daemon.service
journalctl --user -u snoopy-daemon.service
```

### Windows: Task Scheduler not running

**Diagnosis:**
```powershell
Get-ScheduledTask -TaskName "SnoopyDaemon"
```

---

## MCP Server Issues

### Server exits immediately

**Symptom:** Agent framework reports MCP server connection failure

**Cause:** `snoopy mcp` must be run by an MCP client, not directly in a terminal.

**Fix:** Ensure the agent framework is configured correctly:
```bash
snoopy agent install claude  # or your framework
```

### Tools not appearing in agent

**Symptom:** Agent doesn't see Snoopy tools

**Causes:**
- Framework not restarted after registration
- `snoopy` not on PATH

**Fix:**
```bash
# Verify snoopy is on PATH
which snoopy

# Re-register
snoopy agent install <runtime>

# Restart the agent framework
```

### Auth errors in MCP tools

**Symptom:** MCP tools return errors about missing credentials

**Fix:**
```bash
snoopy doctor  # Check API key status
snoopy settings  # Configure if missing
```

---

## Agent Framework Registration

### Config file not found

**Symptom:** `snoopy agent install` fails with file not found

**Cause:** The target framework's config directory doesn't exist yet.

**Fix:** The installer creates directories automatically. If it still fails, create the directory manually and retry.

### Existing config overwritten

**Symptom:** Other MCP servers in the config are missing after install

**Cause:** This should not happen — the installer uses merge/update-in-place logic.

**Fix:** Check the config file and re-add missing entries. Report as a bug if reproducible.

---

## Performance Issues

### High token usage

**Symptom:** Analytics show unexpectedly high costs

**Diagnosis:**
```bash
snoopy analytics --days 7
# Check tokens per post, cost per post
```

**Mitigations:**
- Reduce scan interval (increase cron interval)
- Use a cheaper model
- Narrow subreddit scope
- Reduce `maxTokens` in settings

### Runs timing out

**Symptom:** Job runs show status "timed_out"

**Fix:**
```bash
snoopy settings  # Increase job timeout
```

---

## Non-Interactive Validation Checklist

Use this checklist to validate that your Snoopy setup is compatible with agent workflows.

### Pre-Workflow Checklist

Before running any agent workflow, ensure:

- [ ] **Snoopy installed** — `snoopy --version` returns v2.4+
- [ ] **Doctor passes** — `snoopy doctor` returns `{"healthy": true}`
- [ ] **API key configured** — `snoopy doctor` shows "API key configured: pass"
- [ ] **Database accessible** — `snoopy doctor` shows "DB accessible: pass"
- [ ] **No pending migrations** — `snoopy doctor` shows "Pending migrations: pass"

### Per-Workflow Checklist

#### Before Job Creation

- [ ] **Job name is unique** — No existing job with same slug
- [ ] **Subreddits exist** — Reddit confirms each subreddit is valid
- [ ] **Prompt is non-empty** — Qualification prompt provided (required)
- [ ] **Cron is valid** — Schedule is valid cron syntax (if provided; optional)

#### Before Job Execution

- [ ] **Job enabled** — `snoopy job list` shows enabled=true
- [ ] **Daemon running** — `snoopy daemon status` returns `{"status": "running"}` (if scheduling required)
- [ ] **API key fresh** — Last API call succeeded within last 24 hours

#### Before Feedback Workflow

- [ ] **Unvalidated results exist** — `snoopy feedback review --json --limit 1` returns at least 1 item
- [ ] **Reason field ready** — If submitting invalid feedback, reason text prepared
- [ ] **Consolidate flag clear** — No consolidate operation in progress (check `snoopy doctor`)

#### Before Exporting Results

- [ ] **Results exist** — `snoopy analytics <jobRef> --days 1` shows totalItems > 0
- [ ] **Qualified count > 0** — `snoopy analytics <jobRef>` shows qualifiedItems > 0
- [ ] **Output format selected** — `--json` or `--csv` specified (default: CSV)

#### After Any Operation

- [ ] **Exit code is 0** — Command completed successfully
- [ ] **No error lines in logs** — `snoopy logs <runId> --raw` contains no [ERROR] lines
- [ ] **JSON is parseable** — If using `--json` flag, output is valid JSON

### Validation Script (Agent Implementation)

```bash
#!/bin/bash
# Validate Snoopy for agent use

echo "=== Snoopy Non-Interactive Validation ==="

# 1. Version check
VERSION=$(snoopy --version 2>&1 | grep -o 'v[0-9.]*')
if [[ -z "$VERSION" ]]; then
  echo "❌ Snoopy not installed"
  exit 1
fi
echo "✅ Snoopy $VERSION installed"

# 2. Doctor check
DOCTOR=$(snoopy doctor)
if echo "$DOCTOR" | grep -q '"healthy": true'; then
  echo "✅ System health: PASS"
else
  echo "❌ System health: FAIL"
  echo "$DOCTOR" | grep -q '"API key configured", "status": "fail"' && \
    echo "   → Configure API key first"
  exit 1
fi

# 3. Job check
JOBS=$(snoopy_job_list)
JOB_COUNT=$(echo "$JOBS" | jq '.jobs | length')
echo "✅ $JOB_COUNT jobs configured"

# 4. Daemon check (optional)
DAEMON=$(snoopy_daemon_status)
if echo "$DAEMON" | jq -e '.status == "running"' > /dev/null 2>&1; then
  echo "✅ Daemon running"
else
  echo "⚠️  Daemon not running (OK if no scheduled jobs)"
fi

echo "✅ All checks passed"
exit 0
```

---



### OpenRouter API key missing

**Symptom:** `snoopy doctor` shows "OpenRouter API key: missing"

**Causes:**
- Key not yet configured
- Keychain storage unavailable (headless server, container)
- Key stored in keychain but env var not set for non-interactive context

**Fix:**
```bash
# Interactive (if keychain available)
snoopy settings

# Non-interactive (containers, CI)
export SNOOPY_OPENROUTER_API_KEY=sk-or-...
```

### Database not reachable

**Symptom:** `snoopy doctor` shows "DB error: ..."

**Causes:**
- Data directory missing or permissions issue
- Corrupted database file
- Concurrent write lock

**Fix:**
```bash
# Check data directory
ls -la ~/.snoopy/

# Override data directory if needed
SNOOPY_ROOT_DIR=/custom/path snoopy doctor
```

### Daemon not running

**Symptom:** `snoopy doctor` shows "Daemon not running"

**Fix:**
```bash
snoopy daemon start
snoopy daemon status  # verify
```

### Stale daemon PID

**Symptom:** `snoopy daemon status` shows PID but process is dead

**Fix:**
```bash
# Snoopy handles this automatically on next start
snoopy daemon start
```

## Job run failures

### Run status: failed

**Symptom:** `snoopy job runs <jobRef>` shows status "failed"

**Diagnosis:**
```bash
snoopy errors <jobRef>
snoopy logs <runId>
```

**Common causes:**
- OpenRouter API key invalid or expired
- Model returned empty/truncated response
- Reddit API rate limit hit
- Network timeout

### Token truncation

**Symptom:** Qualification decisions seem incomplete in logs

**Cause:** LLM exhausted completion tokens before emitting structured JSON output.

**Fix:** Increase `maxTokens` in settings:
```bash
snoopy settings  # Set max tokens to 1200+
```

### Active run conflict

**Symptom:** Error message about "A run is already active for job ..."

**Cause:** A previous run is still marked as `running` in the DB (possibly crashed mid-run).

**Fix:** The conflict resolves automatically when the stale run times out. Check `snoopy job runs <jobRef>` for stuck runs.

## Daemon issues

### Daemon won't start

**Symptom:** `snoopy daemon start` fails or daemon dies immediately

**Diagnosis:**
```bash
# Run in foreground to see errors
snoopy daemon run
```

**Common causes:**
- Port/resource conflict (unlikely, daemon uses PID file only)
- Missing dependencies after npm upgrade
- DB migration failure

### Reload not taking effect

**Symptom:** `snoopy daemon reload` succeeds but schedule changes don't apply

**Fix:**
```bash
# Full restart
snoopy daemon stop
snoopy daemon start

# Verify schedule
snoopy job list
```

## Export issues

### No results exported

**Symptom:** `snoopy export` produces empty files

**Causes:**
- No qualified items exist yet (job hasn't run or found no matches)
- `--last-run` flag used but latest run had no qualified items
- Wrong job reference

**Diagnosis:**
```bash
snoopy job runs <jobRef>   # Check if runs exist and have qualified items
snoopy analytics <jobRef>  # Check total qualified count
```

## Startup registration issues

### macOS: LaunchAgent not loading

**Symptom:** `snoopy startup status` shows enabled but daemon doesn't start on reboot

**Fix:**
```bash
# Check if plist is valid
plutil -lint ~/Library/LaunchAgents/com.snoopy.daemon.plist

# Reload the agent
launchctl unload ~/Library/LaunchAgents/com.snoopy.daemon.plist
launchctl load ~/Library/LaunchAgents/com.snoopy.daemon.plist
```

### Linux: systemd user service not starting

**Diagnosis:**
```bash
systemctl --user status snoopy-daemon.service
journalctl --user -u snoopy-daemon.service
```

### Windows: Task Scheduler not running

**Diagnosis:**
```powershell
Get-ScheduledTask -TaskName "SnoopyDaemon"
```

## MCP server issues

### Server exits immediately

**Symptom:** Agent framework reports MCP server connection failure

**Cause:** `snoopy mcp` must be run by an MCP client, not directly in a terminal.

**Fix:** Ensure the agent framework is configured correctly:
```bash
snoopy agent install claude  # or your framework
```

### Tools not appearing in agent

**Symptom:** Agent doesn't see Snoopy tools

**Causes:**
- Framework not restarted after registration
- `snoopy` not on PATH

**Fix:**
```bash
# Verify snoopy is on PATH
which snoopy

# Re-register
snoopy agent install <runtime>

# Restart the agent framework
```

### Auth errors in MCP tools

**Symptom:** MCP tools return errors about missing credentials

**Fix:**
```bash
snoopy doctor  # Check API key status
snoopy settings  # Configure if missing
```

## Agent framework registration

### Config file not found

**Symptom:** `snoopy agent install` fails with file not found

**Cause:** The target framework's config directory doesn't exist yet.

**Fix:** The installer creates directories automatically. If it still fails, create the directory manually and retry.

### Existing config overwritten

**Symptom:** Other MCP servers in the config are missing after install

**Cause:** This should not happen — the installer uses merge/update-in-place logic.

**Fix:** Check the config file and re-add missing entries. Report as a bug if reproducible.

## Performance issues

### High token usage

**Symptom:** Analytics show unexpectedly high costs

**Diagnosis:**
```bash
snoopy analytics --days 7
# Check tokens per post, cost per post
```

**Mitigations:**
- Reduce scan interval (increase cron interval)
- Use a cheaper model
- Narrow subreddit scope
- Reduce `maxTokens` in settings

### Runs timing out

**Symptom:** Job runs show status "timed_out"

**Fix:**
```bash
snoopy settings  # Increase job timeout
```

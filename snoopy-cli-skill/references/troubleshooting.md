# Troubleshooting

Detailed failure diagnostics for Snoopy operations.

## Health check failures

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

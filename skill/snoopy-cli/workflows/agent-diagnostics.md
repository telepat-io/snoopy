# Agent Diagnostics Workflow

## Overview

Complete diagnostic and troubleshooting workflows for verifying system health, debugging failures, monitoring performance, and tracking version updates.

These workflows enable agents to detect problems early and offer targeted recovery paths.

---

## Diagnostic 1: Doctor Health Checks

### Goal
Verify system health before major operations and diagnose failures.

### When to Run Doctor

- **Before initial setup** (Workflow 1, Step 4)
- **Before creating first job** (gate operation)
- **After any failure** (diagnosis)
- **Periodically** (health monitoring, e.g., once per session)
- **After setup changes** (new API key, daemon start, etc.)

### Commands

```bash
snoopy doctor
```

**Expected Output (Structured):**

```json
{
  "healthy": true|false,
  "timestamp": "2026-05-08T12:00:00Z",
  "checks": [
    { "name": "CLI installed", "status": "pass" },
    { "name": "DB accessible", "status": "pass" },
    { "name": "API key configured", "status": "pass"|"fail" },
    { "name": "Keychain available", "status": "pass"|"warn" },
    { "name": "Daemon running", "status": "pass"|"fail" },
    { "name": "Startup registered", "status": "pass"|"warn" },
    { "name": "Pending migrations", "status": "pass"|"fail" }
  ]
}
```

### Check Descriptions

| Check | Meaning | Pass/Fail/Warn Guidance |
| --- | --- | --- |
| CLI installed | `snoopy` command is discoverable | Fail = not installed; go to Workflow 1 Step 1 |
| DB accessible | SQLite DB at `~/.snoopy/snoopy.db` readable/writable | Fail = file system error; escalate |
| API key configured | OpenRouter key in keychain or env var | Fail = blocks qualification; go to Workflow 1 Step 2 |
| Keychain available | System keychain service available | Warn/Fail = expected on headless; use env var |
| Daemon running | Background process has active PID | Fail = daemon died; restart with `daemon start` |
| Startup registered | OS-level auto-start configured | Warn/Fail = optional; offer re-register if failed |
| Pending migrations | DB schema updates pending | Fail = migration error; run `doctor` again (auto-migration) |

### Agent Decision Logic

```
doctor_result = run snoopy doctor

If healthy == true:
  ✅ All checks passed
  → Proceed to target operation
  
Else if healthy == false:
  ❌ One or more checks failed
  → For each failed check:
    - If critical (API key, CLI, DB):
      Route to recovery workflow (setup, install, etc.)
    - If optional (daemon, startup):
      Inform user but allow continue
  → Retry doctor after fixes
```

### Critical vs Optional Checks

**Critical (must be PASS):**
- CLI installed
- DB accessible
- API key configured
- Pending migrations

**Optional (FAIL is acceptable):**
- Keychain available (use env var fallback)
- Daemon running (if user chose manual-only jobs)
- Startup registered (platform-dependent)

### Agent Workflow

**Before Creating Job:**

```bash
snoopy doctor

# Parse output
If API key check == "fail":
  Agent: "API key not configured. Setting up now..."
  → Workflow 1, Step 2
  
Elif daemon running check == "fail" AND job is scheduled:
  Agent: "Daemon not running. Start it? (yes/no)"
  → If yes: snoopy daemon start; retry doctor
  
Elif any other fail:
  Agent: "System check failed. Details: [failed check names]"
  → Escalate to user with recovery suggestions
```

**After a Failure:**

```bash
snoopy doctor

# Analyze failed checks
If same checks still failing:
  → Suggest user troubleshoot that check
  → Example: "DB error persists. Check disk space and ~/.snoopy/ permissions"
  
Else if different checks now failing:
  → Report new failure; ask if related to recent change
  
Else if all checks pass:
  → "System recovered. Retry the operation? (yes/no)"
```

### Agent Responsibility

- [ ] Run doctor before major operations
- [ ] Parse JSON output
- [ ] Identify critical vs optional failures
- [ ] Route to recovery workflows for critical failures
- [ ] Inform user of warnings but allow continue
- [ ] Retry doctor after recovery attempts

---

## Diagnostic 2: Errors & Logs Inspection

### Goal
Diagnose failed job runs by viewing error patterns and detailed logs.

### When to Use

- Job run exited with code 1 (failure)
- `snoopy analytics` shows failed runs
- User reports job not producing results
- Feedback loop is not working as expected

### Step 1: View Recent Errors

### Commands

```bash
snoopy errors <jobRef> --hours 48
```

**Expected Output (JSON array):**

```json
[
  {
    "timestamp": "2026-05-08T11:30:00Z",
    "runId": "run_123",
    "errorType": "APIError",
    "message": "OpenRouter API returned 401: Invalid API key",
    "context": "During LLM qualification of post t3_abc123",
    "retryable": false,
    "attemptedRetries": 0
  },
  {
    "timestamp": "2026-05-08T11:00:00Z",
    "runId": "run_122",
    "errorType": "TokenLimitError",
    "message": "LLM response truncated (max 4096 tokens reached)",
    "context": "Qualification of post t3_def456",
    "retryable": true,
    "attemptedRetries": 2
  }
]
```

### Agent Workflow: Error Pattern Analysis

```bash
# 1. Get recent errors
snoopy errors <jobRef> --hours 48

# 2. Parse and categorize
For each error:
  - Timestamp: When did it occur?
  - Error type: What kind of failure?
  - Message: What went wrong?
  - Retryable: Can we fix it by retrying?

# 3. Identify patterns
Count errors by type:
  - 10x "Invalid API key" → Likely API key problem
  - 3x "TokenLimitError" → Prompt might be too complex
  - 1x "DB locked" → Temporary; usually resolves
```

### Error Type Recovery Matrix

| Error Type | Likely Cause | Recovery |
| --- | --- | --- |
| APIError (401, 403) | Invalid/expired API key | Go to Workflow 1, Step 2; update API key |
| APIError (429) | Rate limit exceeded | Wait 60 seconds; retry run |
| TokenLimitError | Response too long | Simplify prompt; retry |
| DBLockedError | DB in use | Retry after brief pause |
| TimeoutError | Operation took too long | Check internet connection; retry |
| ValidationError | Invalid parameters | Check job config; fix and retry |
| NetworkError | Connection failed | Check internet; retry |

### Step 2: Retrieve Detailed Logs

### Commands

```bash
snoopy logs <runId>
```

**Expected Output (Raw log file):**

```
[2026-05-08T11:30:00.123Z] Run ID: run_123
[2026-05-08T11:30:00.456Z] Job: abc123 (my-job)
[2026-05-08T11:30:01.000Z] Starting Reddit scan on subreddit: technology
[2026-05-08T11:30:02.000Z] Discovered 50 posts in r/technology
[2026-05-08T11:30:02.500Z] Starting LLM qualification for post 1: "Should I buy..."
[2026-05-08T11:30:03.000Z] LLM request: prompt=[...], model=deepseek/deepseek-v4-pro
[2026-05-08T11:30:03.500Z] ERROR: OpenRouter API returned 401: Invalid API key
[2026-05-08T11:30:03.501Z] Aborting run. Error count: 1. Stopping further attempts.
[2026-05-08T11:30:03.502Z] Run completed with status: failed
```

### Agent Workflow: Log Analysis

```bash
# 1. Get detailed log
snoopy logs <runId>

# 2. Scan for ERROR lines
Search for patterns:
  - [ERROR] or [WARN] lines
  - Stack traces
  - Timestamps of failures

# 3. Correlate with error from Step 1
Match log error to categorized errors
Example:
  - Error from Step 1: "Invalid API key"
  - Log shows: "[ERROR] OpenRouter API returned 401: Invalid API key"
  → Confirms diagnosis: API key problem

# 4. Offer remediation
Based on error type and log content,
suggest specific recovery steps to user
```

### Agent Responsibility

- [ ] Fetch recent errors with `--hours` filter
- [ ] Parse error JSON array
- [ ] Categorize by error type
- [ ] For critical errors, fetch detailed logs
- [ ] Correlate log content with error patterns
- [ ] Suggest targeted recovery based on error type
- [ ] Offer retry after fixes applied

---

## Diagnostic 3: Analytics & Monitoring

### Goal
Track job performance, costs, and qualification rates to inform improvement decisions.

### When to Use

- Determine if job quality is acceptable
- Detect performance trends (improving or degrading)
- Understand cost allocation
- Decide whether to run feedback loop

### Commands

```bash
snoopy analytics <jobRef> --days 7
```

**Expected Output:**

```json
{
  "jobRef": "abc123",
  "jobName": "My Job",
  "period": "7 days",
  "stats": {
    "totalRuns": 14,
    "successfulRuns": 13,
    "failedRuns": 1,
    "failureRate": 0.071,
    "totalItemsDiscovered": 450,
    "totalItemsQualified": 45,
    "qualificationRate": 0.10,
    "avgRunTime": "2.3s",
    "tokensUsed": 12500,
    "costEstimate": "$0.50",
    "avgCostPerRun": "$0.036",
    "lastRunTime": "2026-05-08T12:30:00Z",
    "nextScheduledRun": "2026-05-08T13:00:00Z"
  }
}
```

### Agent Metrics Interpretation

| Metric | Good Range | Action if Out of Range |
| --- | --- | --- |
| failureRate | < 0.05 (< 5% failed) | If > 0.1, investigate failures (Diagnostic 2) |
| qualificationRate | 0.05–0.95 (5–95%) | If < 0.05, prompt too strict; if > 0.95, might be false positives; offer feedback loop |
| avgRunTime | 1–10 seconds | If > 10s, check internet/LLM latency; if < 1s, unusual (verify not truncating) |
| costEstimate | Depends on volume; typical $0.01–$1/week | If sudden spike, check qualificationRate (might be asking LLM for too much) |

### Agent Workflow: Performance Monitoring

```bash
# 1. Fetch analytics
snoopy analytics <jobRef> --days 7

# 2. Evaluate health
failureRate < 5%? YES ✅  →  Healthy
failureRate > 10%? YES ❌ →  Investigate failures

qualificationRate in [5%, 95%]? YES ✅  →  Healthy range
qualificationRate < 5%? YES ⚠️  →  Prompt too strict; offer feedback loop
qualificationRate > 95%? YES ⚠️  →  Might have false positives; offer feedback loop

# 3. Trend analysis
Compare current week vs previous week:
  - qualificationRate improved? ✅ Show user
  - costEstimate increased? ⚠️ Investigate why
  - failureRate degrading? ❌ Diagnose failures

# 4. Recommend action
If qualificationRate < 0.05:
  Agent: "Job is being too strict (5% qualification rate). 
          Would you like to review results and improve the prompt? (yes/no)"
  → If yes, route to Workflow 6 (Feedback Loop)

If failureRate > 0.1:
  Agent: "Job has 10%+ failures. Check error logs? (yes/no)"
  → If yes, route to Diagnostic 2 (Errors & Logs)
```

### Agent Responsibility

- [ ] Fetch analytics with relevant `--days` window
- [ ] Parse metrics
- [ ] Evaluate against healthy ranges
- [ ] Detect trends (improving vs degrading)
- [ ] Offer targeted recommendations (feedback loop, error investigation, etc.)
- [ ] Track improvements over time

---

## Diagnostic 4: Job Status & History

### Goal
Understand job execution patterns and detect problematic jobs.

### Commands

**List all jobs:**

```bash
snoopy_job_list

# Output: JSON array with job status, last run, next run
```

**View run history for specific job:**

```bash
snoopy job runs <jobRef>

# Output: JSON array of runs with status, counts, errors
```

### Agent Workflow: Status Monitoring

```bash
# 1. Get all jobs
snoopy_job_list

# 2. For each job, check:
For each job in jobs array:
  enabled? YES  → Actively scheduled
  enabled? NO   → Paused (manual-only)
  
  lastRunTime recent? YES  → Working
  lastRunTime old?    YES  → Might be failing
  
  totalRuns > 0? YES  → Has history
  totalRuns == 0? YES → Never run; offer: "Run now? (yes/no)"

# 3. Get detailed run history
snoopy job runs <jobRef>

# 4. Analyze runs
For each run:
  status == "success"? YES → ✅ Good
  status == "failed"?  YES → ❌ Investigate (Diagnostic 2)
  
  Calculate success_rate = successfulRuns / totalRuns
  If success_rate < 0.9:  → Recommend investigation
```

### Agent Responsibility

- [ ] List all jobs periodically
- [ ] Flag jobs that haven't run recently (if enabled)
- [ ] Fetch run history for suspicious jobs
- [ ] Detect recent failures and offer investigation
- [ ] Offer manual run for jobs that have never executed
- [ ] Suggest enabling disabled jobs if user wants to resume

---

## Diagnostic 5: Version Management

### Goal
Check for updates and facilitate upgrades.

### When to Run

- On agent startup (optional periodic check)
- When user asks "Are there updates?"
- After each session (offer upgrade)

### Commands

**Check current version:**

```bash
snoopy --version

# Output: Snoopy v2.5.3
```

**Check latest available:**

```bash
npm view @telepat/snoopy version

# Output: 2.5.4
```

### Agent Workflow: Update Checking

```
On startup:
  current = snoopy --version
  latest = npm view @telepat/snoopy version
  
  If current < latest:
    Agent: "Snoopy v{latest} available (you have v{current}).
            Upgrade? (yes/no)"
    
    If yes:
      npm install -g @telepat/snoopy@latest
      snoopy --version  # Verify
      Confirm: "✅ Upgraded to v{latest}"
      
    If no:
      Remind: "You can upgrade anytime with:
               npm install -g @telepat/snoopy@latest"
```

### Update Safety

- Upgrades are non-breaking within major version
- Jobs and settings are preserved across versions
- Upgrade does NOT require daemon restart (it will auto-detect new version)
- If upgrade fails, previous version remains functional

### Agent Responsibility

- [ ] Check version on startup
- [ ] Compare with latest available
- [ ] Offer upgrade if newer available
- [ ] Execute upgrade on user request
- [ ] Verify upgrade success
- [ ] Inform user of upgrade completion

---

## Diagnostic Workflow Decision Tree

```
Agent needs diagnostic info
  ↓
Choose diagnostic need:
  ├─ "Is system ready?" → Diagnostic 1 (Doctor)
  ├─ "Why did job fail?" → Diagnostic 2 (Errors & Logs)
  ├─ "How's job performing?" → Diagnostic 3 (Analytics)
  ├─ "Which jobs are active?" → Diagnostic 4 (Status/History)
  ├─ "Any updates available?" → Diagnostic 5 (Version)
  └─ "Multiple concerns?" → Run multiple diagnostics in sequence
```

---

## Complete Diagnostics Example

```
Agent: "Let's check system health"

1. DOCTOR CHECK
   └─ snoopy doctor
      Output: All checks pass ✅

2. JOB STATUS
   └─ snoopy_job_list
      Output: 3 jobs; 2 enabled, 1 disabled
      → Job "Tech Buyer" last ran 30 min ago (healthy)
      → Job "Old Monitor" last ran 5 days ago (stale; disabled)
      → Job "New Setup" never run (0 runs)

3. ANALYTICS FOR HEALTHY JOB
   └─ snoopy analytics abc123 --days 7
      Output: 10 runs, 95% success, 12% qualification rate
      → Healthy performance

4. RUN HISTORY FOR STALE JOB
   └─ snoopy job runs def456
      Output: 3 runs, all failed with "API key error"
      → Diagnosis: API key problem (now fixed?)

5. INVESTIGATE FAILED JOB
   └─ snoopy errors def456 --hours 168
      Output: All errors show "Invalid API key"
      → Confirm: API key was the blocker

6. OFFER RECOVERY
   Agent: "The 'Old Monitor' job failed due to API key issue 
           (now resolved). Re-enable and run now? (yes/no)"
   → If yes: snoopy job enable; snoopy job run

7. CHECK FOR UPDATES
   └─ snoopy --version vs npm view @telepat/snoopy version
      Output: v2.5.3 available (have v2.5.2)
      Agent: "Update available. Upgrade? (yes/no)"
```

All diagnostic workflows are non-interactive and agent-driven.

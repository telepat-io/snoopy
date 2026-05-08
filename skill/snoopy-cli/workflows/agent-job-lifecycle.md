# Agent Job Lifecycle

## Overview

Complete job management without interactive flows. Agents use non-interactive CLI commands and MCP tools to create, list, run, enable/disable, and delete monitoring jobs.

All operations use `--json` flags for machine-readable output where applicable.

---

## Job Lifecycle States

```
CREATE (agent-driven, non-interactive)
  ↓
ENABLE (optional scheduling, gated by daemon)
  ↓
RUN (manual or scheduled)
  ├─ Run immediately: snoopy job run
  └─ Scheduled: daemon picks up on interval
  ↓
CONSUME/EXPORT (retrieve results)
  ├─ Export: read-only snapshot
  └─ Consume: streaming with mark-as-consumed
  ↓
DISABLE (pause scheduling, optional)
  ↓
DELETE (cleanup, destructive)
```

---

## Operation 1: Create Job (Non-Interactive)

### Goal
Create a monitoring job with all required parameters.

### Prerequisites
- Agent has completed installation (Workflow 1)
- User has provided: job name, subreddits, qualification prompt

### Parameters Collect from User

| Parameter | Type | Required | Example |
| --- | --- | --- | --- |
| Job name | string | Yes | "My Tech Buyer Monitor" |
| Subreddits | list | Yes | ["subreddit1", "subreddit2", "subreddit3"] |
| Qualification prompt | string | Yes | "Looking for posts mentioning X with buying intent" |
| Monitor comments | boolean | No | true (default) |
| Schedule (cron) | string | No | "*/30 * * * *" (every 30 min, default) |

### Agent Workflow

**Step 1: Validate Parameters**

```bash
# Pseudo-code validation
if not job_name or len(job_name) == 0:
  error("Job name required")
  
if not subreddits or len(subreddits) == 0:
  error("At least one subreddit required")
  
if not qualification_prompt or len(qualification_prompt) == 0:
  error("Qualification prompt required (plain-language criteria)")
  
if subreddits contains invalid characters:
  error("Subreddit names must be alphanumeric (no leading /r/)")
```

**Step 2: Create Job via MCP Tool**

```bash
# Call MCP tool: snoopy_job_add
snoopy_job_add \
  --name "My Job" \
  --subreddits '["subreddit1","subreddit2"]' \
  --qualificationPrompt "Looking for X" \
  --monitorComments true \
  --schedule "*/30 * * * *"
```

**Expected Output (JSON):**

```json
{
  "success": true,
  "jobId": "abc123xyz",
  "jobSlug": "my-job",
  "name": "My Job",
  "message": "Job created successfully"
}
```

**Step 3: Store Job Reference**

Agent should store or display:
- `jobRef` = jobId or jobSlug (use either for future commands)
- Confirm to user: "✅ Job 'My Job' created. ID: abc123xyz"

### Failure Recovery

| Error | Cause | Action |
| --- | --- | --- |
| Validation error (missing param) | User didn't provide required input | Ask user again for missing param; validate; retry |
| MCP tool fails | Backend error | Report error message; offer retry or escalate |
| Job name conflicts | Name already used | Suggest unique name; retry with new name |
| Invalid subreddit | Subreddit doesn't exist on Reddit | Suggest correction; validate before retry |
| DB write fails | Database locked | Retry after brief pause (SQLite auto-locking) |

### Agent Responsibility

- [ ] Collect all required parameters from user
- [ ] Validate parameters (non-empty, valid format)
- [ ] Call MCP tool with validated params
- [ ] Parse JSON response
- [ ] Store jobRef for later use
- [ ] Confirm to user with job ID

---

## Operation 2: List Jobs

### Goal
View all monitoring jobs and their current status.

### Commands

```bash
snoopy_job_list
```

**Expected Output (JSON):**

```json
{
  "jobs": [
    {
      "id": "abc123",
      "slug": "my-job",
      "name": "My Job",
      "subreddits": ["subreddit1", "subreddit2"],
      "qualificationPrompt": "Looking for X",
      "enabled": true,
      "lastRunTime": "2026-05-08T12:00:00Z",
      "nextScheduledTime": "2026-05-08T12:30:00Z",
      "totalRuns": 5,
      "totalQualified": 23
    },
    {
      "id": "def456",
      "slug": "inactive-job",
      "name": "Inactive Job",
      "enabled": false,
      "lastRunTime": "2026-05-06T11:00:00Z",
      "totalRuns": 2,
      "totalQualified": 3
    }
  ]
}
```

### Agent Use Cases

1. **Show all jobs to user:** Display formatted table with name, status, last run, next run
2. **Find specific job:** Filter by jobId or slug
3. **Check job health:** Identify jobs with `totalRuns: 0` (never run) or recent failures
4. **Decide on action:** Based on enabled state and run history

### Agent Responsibility

- [ ] Call list tool
- [ ] Parse JSON array
- [ ] Display to user in readable format (table or prose)
- [ ] Offer actions: "Which job would you like to run/edit/delete?"

---

## Operation 3: Run Job Manually

### Goal
Execute a job immediately (without waiting for schedule).

### Prerequisites
- Job exists (from Operation 1 or 2)
- API key configured
- Daemon may or may not be running (manual runs work regardless)

### Commands

```bash
snoopy job run <jobRef> --limit 5

# Where <jobRef> is either jobId (abc123) or jobSlug (my-job)
```

**Expected Output:**

```
Discovered: 50 items
Qualified: 5 items (limited by --limit flag)
Next scheduled run: 2026-05-08T14:30:00Z

Exit code: 0 (success)
```

### Agent Workflow

**Step 1: Validate Job Exists**

```bash
snoopy_job_list | grep <jobRef>  # Or use agent logic to find job
```

**Step 2: Run Job**

```bash
snoopy job run <jobRef> --limit 5  # Limit to 5 items (or user preference)
```

**Step 3: Check Exit Code**

- **Exit 0:** Success; proceed to consume results
- **Exit 1:** Failure; route to Workflow 9 (Errors & Logs Inspection)

**Step 4: Display Results to User**

```
✅ Job 'My Job' executed successfully!
- Items discovered: 50
- Items qualified: 5
- Next scheduled run: 2026-05-08T14:30:00Z

Next: Would you like to view results? (yes/no)
```

### Agent Responsibility

- [ ] Confirm job exists before running
- [ ] Run with reasonable --limit (e.g., 5 or 10 for test runs)
- [ ] Check exit code
- [ ] Route to error diagnostics if exit non-zero
- [ ] Offer to export/consume results if successful

### Failure Recovery

| Error | Exit Code | Action |
| --- | --- | --- |
| Job not found | 1 | Verify jobRef is correct; list jobs to find it |
| API key invalid | 1 | Route to Workflow 2 (API Key Setup) |
| Job disabled | 1 | Enable job: `snoopy job enable <jobRef>` |
| Qualification timeout | 1 | Check logs; may indicate slow LLM; offer retry |
| No items discovered | 0 (success) | Report "no items matched criteria"; offer prompt refinement |

---

## Operation 4: Enable/Disable Scheduling

### Goal
Control whether a job runs on its schedule.

### Prerequisites
- Job exists
- Daemon is running (required for scheduling)

### Commands

**Enable scheduling:**

```bash
snoopy job enable <jobRef>

# Output: { "success": true, "jobRef": "...", "enabled": true }
```

**Disable scheduling (pause):**

```bash
snoopy job disable <jobRef>

# Output: { "success": true, "jobRef": "...", "enabled": false }
```

**Hot-reload daemon schedules (after enable/disable):**

```bash
snoopy daemon reload

# Output: Daemon receives SIGUSR2; hot-reloads schedules without restarting
```

### Agent Workflow

**Enable a job:**

1. Confirm job exists
2. Check daemon is running: `snoopy daemon status`
3. If daemon not running, offer: "Enable daemon first? (yes/no)" → Workflow 3
4. If daemon running, enable: `snoopy job enable <jobRef>`
5. Reload schedules: `snoopy daemon reload`
6. Confirm to user: "✅ Job scheduled. Next run at: [time]"

**Disable a job:**

1. Confirm job exists
2. Disable: `snoopy job disable <jobRef>`
3. Reload schedules: `snoopy daemon reload`
4. Confirm to user: "✅ Job paused. Manual runs still work with: snoopy job run <jobRef>"

### Agent Responsibility

- [ ] Validate job exists before enable/disable
- [ ] Verify daemon is running if enabling (for scheduling)
- [ ] Always call `daemon reload` after enable/disable changes
- [ ] Confirm to user with next run time (if enabled) or pause status (if disabled)

### Failure Recovery

| Error | Action |
| --- | --- |
| Job not found | Verify jobRef; list jobs |
| Daemon not running (enable requested) | Start daemon: `snoopy daemon start`; then enable |
| Enable/disable fails | Check DB; retry; escalate if persistent |

---

## Operation 5: View Job Run History

### Goal
Understand execution patterns and identify problems.

### Commands

```bash
snoopy job runs <jobRef>
```

**Expected Output (JSON array):**

```json
[
  {
    "runId": "run_123",
    "timestamp": "2026-05-08T12:30:00Z",
    "status": "success",
    "itemsDiscovered": 50,
    "itemsQualified": 5,
    "executionTime": "2.3s",
    "errorMessage": null
  },
  {
    "runId": "run_122",
    "timestamp": "2026-05-08T12:00:00Z",
    "status": "failed",
    "itemsDiscovered": 0,
    "itemsQualified": 0,
    "executionTime": "1.2s",
    "errorMessage": "API key invalid"
  }
]
```

### Agent Use Cases

1. **Check health:** All runs successful? Detect recent failures?
2. **Understand patterns:** Qualification rate over time (5/50 = 10%)
3. **Diagnose issues:** Route failed runs to error inspection (Workflow 9)
4. **Offer improvements:** If qualification rate is low, offer feedback loop (Workflow 6)

### Agent Workflow

```bash
# Get run history
snoopy job runs <jobRef>

# Parse JSON array
For each run:
  If status == "failed":
    Store runId for diagnostics
    Offer: "Job failed on [timestamp]. View error details? (yes/no)"
    → If yes, route to Workflow 9 (Errors & Logs)
    
  If status == "success":
    Calculate qualification_rate = itemsQualified / itemsDiscovered
    If qualification_rate < 0.05:
      Offer: "Low qualification rate. Refine prompt? (yes/no)"
      → If yes, route to Workflow 6 (Feedback Loop)
```

### Agent Responsibility

- [ ] Fetch run history
- [ ] Display to user (table format)
- [ ] Detect failed runs and offer diagnostics
- [ ] Detect low qualification rates and offer refinement
- [ ] Store runIds for error inspection if needed

---

## Operation 6: Delete Job (Destructive)

### Goal
Remove a monitoring job and all its data.

### Prerequisites
- Job exists

### Important
This operation is **destructive and irreversible**. All runs, results, and feedback for this job are permanently deleted.

### Agent Workflow

**Step 1: Confirm User Intent**

```
⚠️ Delete job 'My Job'?

This will permanently remove:
- All historical runs (5 runs)
- All qualified results (23 items)
- All feedback and validation data
- Job configuration

Are you absolutely sure? (yes/no)
```

**Step 2: Delete**

If user confirms "yes":

```bash
snoopy job delete <jobRef>

# Output: { "success": true, "jobRef": "...", "message": "Job deleted" }
```

**Step 3: Verify**

```bash
snoopy_job_list  # Confirm job no longer in list
```

### Agent Responsibility

- [ ] Display explicit warning with all consequences
- [ ] Require explicit user confirmation (yes/no)
- [ ] Only proceed after confirmation
- [ ] Verify deletion with list command
- [ ] Confirm to user: "✅ Job deleted and cannot be recovered"

### Failure Recovery

| Error | Action |
| --- | --- |
| User cancels delete | Proceed to next operation |
| Delete fails | Report error; offer retry; do NOT retry without user confirmation |

---

## Job Lifecycle Reference

### Quick Status Check

```bash
# See all jobs with status
snoopy_job_list

# See detailed run history for one job
snoopy job runs <jobRef>

# See next scheduled time
# (included in snoopy_job_list output in "nextScheduledTime" field)
```

### Scheduling Context

- Jobs can be **enabled** (runs on schedule) or **disabled** (manual-only)
- Scheduling requires **daemon running** (Workflow 3)
- After enable/disable, always call **`snoopy daemon reload`**
- Schedule is a **cron expression** (e.g., `*/30 * * * *` = every 30 min)

### Results Context

After running a job:
- Results are stored in `~/.snoopy/results/`
- Export results: Workflow 5a (read-only snapshot)
- Consume results: Workflow 5b (streaming with mark)
- Export does NOT mark consumed; Consume does

---

## Complete Job Lifecycle Example

```
Agent: "Let's create a monitoring job."

1. COLLECT PARAMS
   ├─ Job name: "Tech Buyer Monitor"
   ├─ Subreddits: ["technology", "buyitforlife"]
   └─ Prompt: "Looking for posts about tech purchases with buying intent"

2. CREATE JOB
   ├─ snoopy_job_add (MCP tool)
   ├─ Output: jobId = abc123
   └─ Confirm: "✅ Job created"

3. RUN MANUALLY (TEST)
   ├─ snoopy job run abc123 --limit 10
   ├─ Output: 50 discovered, 8 qualified
   └─ Confirm: "✅ Job ran successfully"

4. VIEW RESULTS
   ├─ snoopy export abc123 --json --last-run
   ├─ Output: JSON array of 8 items
   └─ Process: Agent displays to user

5. ENABLE SCHEDULING
   ├─ snoopy job enable abc123
   ├─ snoopy daemon reload
   └─ Confirm: "✅ Job will run every 30 minutes"

6. MONITOR OVER TIME
   ├─ snoopy analytics abc123 --days 7
   ├─ Output: Performance metrics
   └─ Detect: Low qualification rate → offer Workflow 6 (Feedback)

7. REFINE PROMPT (OPTIONAL)
   ├─ snoopy feedback review abc123 --json --limit 10
   ├─ Collect user feedback
   ├─ snoopy feedback submit (per result)
   ├─ snoopy feedback consolidate
   └─ Confirm: "✅ Prompt improved"

8. CLEAN UP (OPTIONAL)
   ├─ snoopy job delete abc123 (if no longer needed)
   └─ Confirm: "✅ Job deleted"
```

All job lifecycle operations are non-interactive and agent-driving.

---
title: Agent Operations
sidebar_position: 7
---

# Agent Operations

This guide is for AI agents and automation scripts operating Snoopy end-to-end. It covers installation, credential setup, every command available, and direct database access patterns for cases where the CLI is not sufficient.

---

## 1. Installation

**Requirements:** Node.js 20+, npm 10+

**From npm (recommended for production use):**

```bash
npm install -g @telepat/snoopy
snoopy --help
```

**From source (development / modified builds):**

```bash
npm install
npm run build
npm link
snoopy --help
```

**Verify installation:**

```bash
snoopy --version
snoopy --help
```

The data directory is created automatically on first run at `~/.snoopy/` (macOS and Linux) or `C:\Users\<you>\.snoopy\` (Windows).

Set `SNOOPY_ROOT_DIR` to override the data directory location entirely:

```bash
SNOOPY_ROOT_DIR=/custom/path snoopy doctor
```

---

## 2. Credentials

### OpenRouter API Key (required)

Snoopy uses [OpenRouter](https://openrouter.ai) to qualify Reddit posts and comments against your job prompts. Without an API key, job runs will fail.

**How it is stored:** The key is saved to the system keychain (macOS Keychain, Linux Secret Service, Windows Credential Manager) via `keytar`. If the keychain is unavailable, an AES-256-CBC encrypted fallback file is used at `~/.snoopy/secrets.enc`.

**Set the key interactively:**

```bash
snoopy settings
```

Navigate to **OpenRouter API Key**, enter your key, and save.

The key is also prompted automatically the first time you run `snoopy job add` if it is not yet configured.

**Verify the key is configured:**

```bash
snoopy doctor
```

Look for `OpenRouter API key: configured` in the output.

### Reddit Credentials (optional)

Snoopy uses Reddit's public API by default. If you need to use OAuth credentials (for higher rate limits or private subreddits), configure them via `snoopy settings`:

- **Reddit App Name**
- **Reddit Client ID**
- **Reddit Client Secret**

These are optional and only needed in specific deployment scenarios.

---

## 3. First-Time Setup

The fastest path to a running system:

```bash
# 1. Install (if not already done)
npm install -g @telepat/snoopy

# 2. Create your first monitoring job
#    This will prompt for your OpenRouter key if not yet set,
#    then walk through job configuration, start the daemon, and run an initial scan.
snoopy job add

# 3. Verify everything is healthy
snoopy doctor
```

Alternatively, to set the API key before creating a job:

```bash
snoopy settings    # Set OpenRouter API key first
snoopy job add     # Then create a job
```

---

## 4. Job Management

A **job** defines what Snoopy monitors: which subreddits, what qualifies a post or comment, and how often to scan.

`<jobRef>` throughout this section accepts either the job **ID** or **slug**.

### Create a job

```bash
snoopy job add
# Short alias:
snoopy add
```

Interactive flow — collects:
- Job name and description
- Target subreddits
- Qualification prompt (plain-language criteria for the AI)
- Model settings (model, temperature, max tokens, topP)
- Whether to monitor comments in addition to posts
- Whether to register startup on reboot
- Trigger an immediate first scan

The job starts **disabled** until the first run completes. The scheduler then activates it automatically.

### List jobs

```bash
snoopy job list
# Aliases:
snoopy jobs list
snoopy list
```

Displays all jobs with their state (on/off), ID, slug, and subreddits.

### Enable / disable scheduling

```bash
snoopy job enable <jobRef>    # Alias: snoopy start <jobRef>
snoopy job disable <jobRef>   # Alias: snoopy stop <jobRef>
```

After toggling, send a daemon reload so the change takes effect immediately without a restart:

```bash
snoopy daemon reload
```

### Run a job immediately

```bash
snoopy job run <jobRef>
snoopy job run <jobRef> --limit 5   # Cap new items qualified (useful for smoke tests)
# Alias:
snoopy jobs run <jobRef>
```

Options:
- `-l, --limit <count>` — Maximum new posts/comments to qualify in this run (positive integer)

Output includes: run ID, items discovered/new/qualified, token usage, estimated cost USD, log file path.

### View run history

```bash
snoopy job runs             # All recent runs across all jobs
snoopy job runs <jobRef>    # Runs for one job (up to 20 latest)
```

Each run card shows: run ID, status, duration, items discovered/new/qualified, tokens, cost, log path.

### Delete a job

```bash
snoopy job delete <jobRef>
# Alias:
snoopy job remove <jobRef>
# Short alias:
snoopy delete <jobRef>
```

**Cascading delete:** removes all `scan_items`, all `job_runs`, all run log files, and the job record itself — in a single DB transaction.

---

## 5. Daemon Lifecycle

The daemon runs in the background and executes jobs on their cron schedules.

```bash
snoopy daemon start     # Start daemon in background; writes PID to ~/.snoopy/.pid
snoopy daemon stop      # Send SIGTERM to daemon; removes PID file
snoopy daemon status    # Check whether daemon is running (and show PID)
snoopy daemon reload    # Send SIGUSR2 to hot-reload job schedules without restart
snoopy daemon run       # Run daemon in foreground (useful for debugging/logging)
```

**Typical agent pattern:**

```bash
# Ensure daemon is running
snoopy daemon status || snoopy daemon start

# After enabling/disabling a job, reload schedules
snoopy daemon reload
```

---

## 6. Startup on Reboot

Register Snoopy to start automatically when the machine reboots or the user logs in.

```bash
snoopy startup enable     # Install and enable startup registration
snoopy startup disable    # Remove startup registration
snoopy startup status     # Show current startup state and method
```

Aliases (equivalent):

```bash
snoopy reboot enable
snoopy reboot disable
snoopy reboot status
```

Platform-specific implementations:
- **macOS** — LaunchAgent plist (`~/Library/LaunchAgents/`)
- **Linux** — systemd user service or cron entry
- **Windows** — Task Scheduler entry

**Typical agent pattern:**

```bash
snoopy startup status || snoopy startup enable
```

---

## 7. Health Checks — doctor

`snoopy doctor` is the canonical way to verify a system is fully operational.

```bash
snoopy doctor
```

Output covers:
- Platform and Node.js version
- Database location and accessibility
- OpenRouter API key: configured / missing
- Total jobs and how many are enabled
- Daemon: running (with PID) or stopped
- Startup on reboot: enabled/disabled and method
- Recent job errors: failed or errored runs from the last 24 hours with diagnostics

**Remediation flow for an agent:**

```bash
snoopy doctor
# If API key missing:        snoopy settings
# If daemon not running:     snoopy daemon start
# If startup not registered: snoopy startup enable
```

---

## 8. Errors and Logs

### Inspect recent errors for a job

```bash
snoopy errors <jobRef>              # Default: last 24 hours
snoopy errors <jobRef> --hours 48   # Extend window
```

Output:
- Failed runs and runs that logged errors within the time window
- Run datetime, status, run ID, status message
- Latest error entry printed in full detail

### View raw log for a run

```bash
snoopy logs <runId>
```

Streams the full raw log file for the given run. Logs contain JSON event payloads for each lifecycle step: requests, responses, qualification decisions, errors.

**Log storage:**
- Location: `~/.snoopy/logs/run-<runId>.log`
- Auto-deleted after **5 days**

---

## 9. Analytics

```bash
snoopy analytics                     # All jobs, last 30 days (default)
snoopy analytics --days 7            # All jobs, custom window
snoopy analytics <jobRef>            # Single job
snoopy analytics <jobRef> --days 90  # Single job, extended window
```

Output metrics:
- Run count and window size
- Total items discovered, new, and qualified
- Total and average prompt/completion/total tokens
- Total and average estimated cost (USD)
- Tokens per post, cost per post
- Per-subreddit breakdown (posts, comments, tokens, cost, daily averages)
- Individual run cards with full detail

---

## 10. Export Qualified Results

Export qualified scan items to CSV for downstream processing.

```bash
snoopy export csv <jobRef>   # One job
snoopy export csv            # All jobs
```

Output files are written to `~/.snoopy/results/<job-slug>.csv`. Files are regenerated from the database on each call (not incremental). The command prints row count and file path on completion.

CSV columns include: item ID, type (post/comment), subreddit, author, title, URL, body snippet, reddit_posted_at, qualified, qualification_reason, viewed, validated, processed, created_at.

---

## 11. Settings Reference

```bash
snoopy settings
```

All settings are stored in the database (`settings` table). Secrets (API key, Reddit client secret) are stored in the system keychain or the encrypted fallback file.

| Setting | Default | Notes |
|---|---|---|
| OpenRouter API Key | (required) | Stored in system keychain / encrypted file |
| Default Model | `moonshotai/kimi-k2.5` | LLM model used for qualification |
| Temperature | `0.0` | Range 0.0–2.0 |
| Max Tokens | — | Per-request token limit |
| Top P | — | Nucleus sampling, range 0.0–1.0 |
| Scan Interval | `30` (minutes) | Converted to `*/N * * * *` cron expression |
| Job Timeout | `10` (minutes) | Per-job run timeout; 0 = no timeout |
| Desktop Notifications | `true` | OS notifications on run events |
| Reddit App Name | (optional) | OAuth fallback |
| Reddit Client ID | (optional) | OAuth fallback |
| Reddit Client Secret | (optional) | Stored in system keychain / encrypted file |

---

## 12. DB Direct Access (Appendix)

For automation that cannot use the interactive CLI, most reads and lifecycle flag updates can go directly to the SQLite database.

**Database location:**

```
~/.snoopy/snoopy.db                          # default (macOS / Linux)
C:\Users\<you>\.snoopy\snoopy.db             # default (Windows)
$SNOOPY_ROOT_DIR/snoopy.db                   # when override is set
```

**Open with sqlite3:**

```bash
sqlite3 ~/.snoopy/snoopy.db
```

### List jobs

```sql
SELECT id, slug, name, enabled, monitor_comments, schedule_cron, created_at
FROM jobs
ORDER BY datetime(created_at) DESC;
```

- `enabled = 1` → scheduler will run it
- `monitor_comments = 1` → comment qualification is active

### Insert a job directly (non-interactive)

```sql
INSERT INTO jobs (
  id, slug, name, description,
  qualification_prompt, subreddits_json,
  schedule_cron, enabled, monitor_comments,
  created_at, updated_at
) VALUES (
  lower(hex(randomblob(16))),
  'lead-monitor-saas',
  'Lead Monitor SaaS',
  'Track high-intent SaaS buying questions',
  'Qualify only if the user is actively seeking SaaS recommendations or alternatives.',
  '["startups","entrepreneur","SaaS"]',
  '*/30 * * * *',
  1, 1,
  datetime('now'), datetime('now')
);
```

- `slug` must be unique (`idx_jobs_slug`).
- `subreddits_json` must be a valid JSON array string.
- Use `BEGIN TRANSACTION; ... COMMIT;` for multi-statement writes.

### Read recent runs for a job

```sql
SELECT
  id, status, message,
  started_at, finished_at,
  items_discovered, items_new, items_qualified,
  prompt_tokens, completion_tokens, estimated_cost_usd,
  created_at
FROM job_runs
WHERE job_id = '<job-id>'
ORDER BY datetime(created_at) DESC
LIMIT 20;
```

### Get qualified results for a job

```sql
SELECT
  id, run_id, type, subreddit, author,
  title, url, body,
  qualified, qualification_reason,
  viewed, validated, processed,
  reddit_posted_at, created_at
FROM scan_items
WHERE job_id = '<job-id>'
  AND qualified = 1
ORDER BY datetime(reddit_posted_at) DESC, datetime(created_at) DESC;
```

### Update result lifecycle flags

```sql
-- Mark one item reviewed and validated
UPDATE scan_items
SET viewed = 1, validated = 1
WHERE id = '<item-id>';

-- Mark all qualified items from a run as processed
UPDATE scan_items
SET processed = 1
WHERE run_id = '<run-id>'
  AND qualified = 1;

-- Count unprocessed backlog for a job
SELECT COUNT(*) AS unprocessed_qualified
FROM scan_items
WHERE job_id = '<job-id>'
  AND qualified = 1
  AND processed = 0;
```

**Lifecycle flag semantics:**
- `viewed = 1` — result has been reviewed by an operator or agent
- `validated = 1` — result has been quality-checked and accepted
- `processed = 1` — result has been handed off to a downstream workflow

For the full table schema including all columns, indexes, and constraints, see [Database Schema](../reference/database-schema.md).

---

## 13. Minimal Agent Runbook

1. Install snoopy and confirm `snoopy --help` works.
2. Run `snoopy doctor` — resolve any issues shown (missing key, daemon stopped, startup not registered).
3. Create a job with `snoopy job add` (or insert directly into the DB for non-interactive setups).
4. Confirm daemon is running: `snoopy daemon status` → if not, `snoopy daemon start`.
5. Confirm startup is registered: `snoopy startup status` → if not, `snoopy startup enable`.
6. Trigger a test run: `snoopy job run <jobRef> --limit 5`.
7. Check results: `snoopy job runs <jobRef>` and `snoopy errors <jobRef>`.
8. Export or query qualified results as needed.
9. Update lifecycle flags (`viewed`, `validated`, `processed`) as your workflow advances.

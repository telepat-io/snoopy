# Agent Installation Flow

## Overview

Deterministic 7-step setup procedure to take a user from zero to ready-to-monitor on their first run.

This workflow is **atomic**: agents proceed sequentially. Each step gates the next. If any step fails, agent troubleshoots before proceeding.

---

## Step 1: Installation Detection & Setup

### Goal
Ensure Snoopy CLI is installed globally and accessible.

### Commands

```bash
# Check if already installed
snoopy --version
```

### Decision Logic

- **Exit 0 with version output** → Snoopy is installed; proceed to Step 2
- **Exit non-0 or command not found** → Not installed; proceed to install
- **Output does not match version pattern** → Unexpected output; report warning but continue

### If Not Installed

```bash
npm install -g @telepat/snoopy
snoopy --version  # Verify success
```

### Agent Responsibility

- [ ] Detect if `snoopy --version` works
- [ ] If missing, run npm install
- [ ] Confirm version output after install
- [ ] Report success or error to user before proceeding

---

## Step 2: Secure API Key Setup

### Goal
Configure OpenRouter API credentials with automatic fallback for headless environments.

### Agent Workflow

**Step 2a: Detect Environment**

```bash
snoopy doctor
```

Parse output for:
- `Keychain available: yes|no` → determines storage strategy
- `API key configured: yes|no` → gates this step (skip if already configured)

**Step 2b: Choose Storage Method**

```
If keychain_available:
  → Recommend keychain (secure, recommended)
  → Ask user for OpenRouter API key
  → Store in keychain
  
Else (headless/container):
  → Recommend env var (required for headless)
  → Ask user for OpenRouter API key
  → Instruct user to export: TELEPAT_OPENROUTER_KEY
```

**Step 2c: Store Credentials**

**If keychain available:**

```bash
# Collect key from user (e.g., sk-or-...)
snoopy settings set openrouter_api_key <KEY>

# Verify success
snoopy doctor  # Check "API key configured: yes"
```

**If headless/env var fallback:**

```bash
# Instruct user
export TELEPAT_OPENROUTER_KEY=sk-or-...

# Verify success
snoopy doctor  # Check "API key configured: yes"
```

**Step 2d: Verify Setup**

```bash
snoopy settings get openrouter_api_key
# Output: "SET" (key configured but not exposed)
# or "NOT_SET" (key not configured)
```

If output is "NOT_SET", retry collection and storage.

### Agent Responsibility

- [ ] Run doctor to detect keychain availability
- [ ] Collect OpenRouter API key from user (once)
- [ ] Choose appropriate storage method (keychain vs env var)
- [ ] Store credentials
- [ ] Verify with doctor (API key configured: yes)
- [ ] Never expose actual API key in logs or output

### Failure Recovery

| Failure | Cause | Action |
| --- | --- | --- |
| Keychain unavailable | Headless/containerized environment | Fall back to env var; instruct user on export |
| Settings set fails | Storage error | Check disk space; retry once; escalate if persistent |
| Doctor still shows API key missing | Credential not persisted | Ask user to re-enter key; verify storage path |

---

## Step 3: Daemon & Startup Decision

### Goal
Enable optional background scheduling and OS-level auto-start (required only if user wants scheduled jobs).

### Agent Workflow

**Step 3a: Ask User**

```
Present choice:
"Do you want Snoopy to run monitoring jobs automatically in the background?
 - YES: Enable daemon and register for auto-start on reboot
 - NO: Skip daemon; you can run jobs manually anytime"
```

**Step 3b: If YES (Scheduled Jobs)**

```bash
# Start daemon (background process)
snoopy daemon start

# Verify running
snoopy daemon status  # Should output: "running with PID xxx"

# Register with OS auto-start (launchd/systemd/Task Scheduler)
snoopy startup enable

# Verify registration
snoopy startup status  # Should output: "registered"
```

Confirm to user: ✅ "Daemon started and registered. Monitoring will resume after reboot."

**Step 3c: If NO (Manual Jobs Only)**

Skip daemon setup. Inform user: "You can run jobs manually anytime with: `snoopy job run <jobRef>`"

### Agent Responsibility

- [ ] Ask explicitly before enabling daemon (persistent background process decision)
- [ ] Ask explicitly before enabling startup (OS-level auto-start decision)
- [ ] Execute BOTH daemon start and startup enable if user chooses YES
- [ ] Verify both succeeded (daemon status, startup status both pass)
- [ ] Inform user of implications (always-running process, auto-restart on reboot)

### Failure Recovery

| Failure | Cause | Action |
| --- | --- | --- |
| Daemon start fails | Port conflict, permissions | Check logs: `snoopy logs`; offer manual skip and manual-only setup |
| Startup registration fails | Platform not supported | Inform user; daemon still works manually; continue anyway |
| PID file stale | Previous crash | `snoopy daemon start` auto-cleans stale PID; retry |

---

## Step 4: Local Readiness Verification

### Goal
Confirm all prerequisites are met before user starts monitoring.

### Commands

```bash
snoopy doctor
```

### Decision Logic

Expected output: All checks should show `pass` or `warn`.

Critical checks that must be `pass`:
- CLI installed ✓
- DB accessible ✓
- API key configured ✓
- Pending migrations ✓

Optional checks (warn is acceptable):
- Keychain available (fail is OK if using env var)
- Daemon running (fail is OK if user chose manual-only)
- Startup registered (fail is OK if platform not supported)

### If Healthy

```
All checks pass → Proceed to Step 5
```

### If Not Healthy

For each failed check, determine if it's a blocker:

| Check | Fail = Blocker? | Recovery |
| --- | --- | --- |
| CLI installed | YES | Go back to Step 1 |
| DB accessible | YES | Report file system error; escalate |
| API key configured | YES | Go back to Step 2 |
| Keychain available | NO | Use env var fallback (Step 2c) |
| Daemon running | NO (if user chose YES) | Run `snoopy daemon start`; verify with doctor again |
| Startup registered | NO | Inform user; daemon still works manually |
| Pending migrations | YES | Wait for auto-run on next DB access; retry doctor |

### Agent Responsibility

- [ ] Run doctor
- [ ] Parse all checks
- [ ] Identify blockers vs warnings
- [ ] Route to recovery workflows as needed
- [ ] Re-run doctor after fixes to confirm all green (or acceptable)
- [ ] Block proceeding to Step 5 if blockers remain

---

## Step 5: Confirm Ready to Monitor

### Agent Workflow

Display to user:

```
✅ Installation complete!

Summary:
- Snoopy version: [version]
- API key: Configured
- Daemon: [enabled/disabled]
- Auto-start: [enabled/disabled]
- Database: Ready

You are ready to create monitoring jobs!

Next steps:
1. Create your first job (Workflow 4a)
2. Set it to run immediately for a test (Workflow 4c)
3. Check results (Workflow 5a)
```

### Proceed To

User now has 2 choices:
- **Create first monitoring job** → Workflow 4 (Job Management)
- **View diagnostics** → Workflow 8 (Doctor Health Checks)

---

## Troubleshooting Matrix (Installation Flow)

| Error | Symptom | Recovery |
| --- | --- | --- |
| npm not found | `npm: command not found` | User must install Node.js first |
| npm permission denied | `EACCES: permission denied` | Use `sudo npm install -g` or fix npm permissions |
| Snoopy install fails | `npm ERR! 404 Not Found` | Check npm registry; retry; report if persistent |
| DB initialization fails | `Database error` | Check disk space; check ~/.snoopy/ permissions |
| API key rejected | `Invalid API key` | Verify key is from OpenRouter (not ChatGPT/other service) |
| Keychain operations fail on Linux | `keychain: unsupported` | Expected on Linux; use env var fallback |
| Daemon refuses to start | `Unable to start daemon` | Check for port conflicts; check system logs |
| Doctor shows migrations pending | `DB needs migration` | Doctor will auto-migrate; retry after doctor completes |

---

## Complete Installation Flow Checklist

Use this checklist to verify installation completion:

- [ ] Step 1: `snoopy --version` works
- [ ] Step 2: `snoopy doctor` shows `API key: pass`
- [ ] Step 2: `snoopy settings get openrouter_api_key` returns "SET"
- [ ] Step 3: User explicitly chose daemon/no-daemon
- [ ] Step 3: If daemon chosen, `snoopy daemon status` shows running
- [ ] Step 3: If startup enabled, `snoopy startup status` shows registered
- [ ] Step 4: `snoopy doctor` shows all critical checks `pass`
- [ ] Step 5: User is informed and ready to proceed

**Installation is complete** when all checkboxes are checked and doctor shows healthy.

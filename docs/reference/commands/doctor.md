---
title: doctor
sidebar_position: 10
---

# `doctor`

The `doctor` command runs a quick health check across the local Snoopy environment.

```bash
snoopy doctor
```

## Current Checks

- platform and Node version
- SQLite database reachability
- OpenRouter API key presence
- total/enabled job counts
- daemon health
- startup registration state and method
- recent job run failures or logged errors from the last 24 hours

## Fix Suggestions

When a check fails, `doctor` prints a suggested command to resolve the problem:

| Issue | Suggested fix |
|---|---|
| Daemon not running | `snoopy daemon start` |
| OpenRouter API key missing | `snoopy settings` |
| Database unreachable | Inspect the DB file path shown |
| Recent job run errors | `snoopy job` / `snoopy logs <runId>` |

## Typical Use

Run `doctor` after:

- initial setup
- changing credentials
- enabling startup registration
- daemon failures
- smoke-test failures

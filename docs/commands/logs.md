---
title: logs
sidebar_position: 8
---

# `logs <runId>`

Use `logs` to print the raw per-run log for a specific job execution.

```bash
snoopy logs <runId>
```

What it shows:

- run metadata
- the full raw log file content
- detailed request/response payloads for Reddit and OpenRouter calls
- run lifecycle events and errors

Notes:

- run logs live under `~/.snoopy/logs/`
- files are named `run-<runId>.log`
- older runs may not have a log file if they predate detailed run logging

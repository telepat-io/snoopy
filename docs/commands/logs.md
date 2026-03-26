---
title: logs
sidebar_position: 8
---

# `logs <runId>`

Use `logs` to inspect one run with a human-friendly timeline by default.

```bash
snoopy logs <runId>
snoopy logs <runId> --raw
```

Default (`snoopy logs <runId>`) shows:

- run metadata
- post/comment text snippets
- qualification result and justification for both qualified and not-qualified items
- clickable post/comment links
- key run lifecycle events and errors

Raw mode (`--raw`) shows:

- the full raw log file content
- detailed Reddit/OpenRouter request and response payloads
- all lifecycle entries exactly as written to disk

Notes:

- run logs live under `~/.snoopy/logs/`
- files are named `run-<runId>.log`
- older runs may not have a log file if they predate detailed run logging
- terminals without hyperlink support still show full URLs so links can be copied
- results CSV files are exported separately under `~/.snoopy/results/` via `snoopy export csv`

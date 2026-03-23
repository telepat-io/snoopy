---
title: errors
sidebar_position: 9
---

# `errors <jobRef>`

Use `errors` to show recent failed or errored runs for one job.

```bash
snoopy errors <jobRef>
snoopy errors <jobRef> --hours 48
```

Arguments:

- `<jobRef>`: job ID or slug

Options:

- `--hours <count>`: look back this many hours, default `24`

What it shows:

- runs with `failed` status
- runs whose log file contains `[ERROR]` entries
- the latest error block found for each matching run

Typical use:

- investigate one noisy job
- confirm whether a daemon-run job has been failing recently
- inspect recent failures before opening the full `logs <runId>` output

---
title: jobs
sidebar_position: 3
---

# `jobs`

`jobs` is an alias command group for common job operations.

## Supported Commands

- `jobs list`
- `jobs enable <jobRef>`
- `jobs disable <jobRef>`
- `jobs remove <jobRef>`
- `jobs delete <jobRef>`
- `jobs run <jobRef> [--limit N]`
- `jobs runs [jobRef]`

## Examples

```bash
snoopy jobs list
snoopy jobs run my-job --limit 5
snoopy jobs delete my-job
```

Use `jobs` when you prefer a plural group for operational commands. Behavior matches the corresponding `job` commands.

For results file generation, use the top-level export command:

```bash
snoopy export csv
snoopy export csv <jobRef>
```

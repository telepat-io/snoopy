---
title: Quick Start
---

# Quick Start

This guide runs the minimum path to validate Snoopy end-to-end.

## 1. Create a Job

```bash
snoopy job add
```

## 2. Check Jobs

```bash
snoopy jobs list
```

## 3. Run a Small Validation Scan

```bash
snoopy job run --limit 5
snoopy job run <jobRef> --limit 5
```

## 4. Inspect Results

```bash
snoopy job runs <jobRef>
snoopy analytics <jobRef> --days 7
```

## 5. Start Background Scheduling

```bash
snoopy daemon start
snoopy startup status
```

## 6. Export Qualified Results

```bash
snoopy export csv
snoopy export csv <jobRef>
```

## Next

- Read [Scheduling and Startup](../guides/scheduling-and-startup.md) for durable operations.
- Use [CLI Reference](../reference/cli-reference.md) for full command details.
- Run [Doctor](../reference/commands/doctor.md) if anything looks off.

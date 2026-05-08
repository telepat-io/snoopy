---
slug: /features
title: "Find High-Intent Conversations In Any Online Community"
description: What Snoopy can do for founders, marketers, and sales teams.
keywords: [snoopy, features, conversation monitoring, ai qualification, lead generation]
sidebar_label: Features
sidebar_position: 1
---

# Find High-Intent Conversations In Any Online Community

Snoopy monitors online conversations for high-intent signals that match your business goals. Define what you care about in plain language, and Snoopy continuously scans and qualifies conversations so you can focus on response and outreach.

Built for founders, marketers, and sales teams who need to find genuine opportunities without manually scrolling and judging every post.

---

## Plain Language Job Definitions

Describe what you're looking for in plain language. Snoopy builds an AI-assisted monitoring job from your criteria — no regex, no keyword configs, no boolean filters. Just tell it what you care about.

```bash
snoopy job add
```

Snoopy asks clarifying questions, refines your criteria, and produces a structured monitoring job ready to run.

---

## AI Qualification, Not Keyword Matching

Conversations are evaluated against your intent, not just keyword-matched. Snoopy understands context — it knows the difference between someone *complaining about* your product and someone *looking to buy* your product.

Configure your qualification prompt once. Snoopy applies it to every post and comment it discovers.

---

## Feedback-Driven Prompt Learning

Snoopy now supports a full feedback loop so qualification quality improves over time:

1. Review recent unvalidated qualified results
2. Submit valid/invalid feedback per result
3. Consolidate that feedback to produce a smarter qualification prompt

```bash
snoopy feedback review --json
snoopy feedback submit <resultId> --invalid --reason "Not actually buying intent"
snoopy feedback consolidate
```

For interactive reviews, Snoopy asks whether to run consolidation before exiting early, so prompt updates are not forgotten.

---

## Continuous Daemon Monitoring

Once configured, Snoopy scans on cron schedules in the background. Set your cadence and let it run. Trigger manual scans for quick validation.

```bash
snoopy daemon start        # start background daemon
snoopy job run --limit 5   # quick manual scan
snoopy job runs <ref>      # view run history
```

---

## Code-Driven Efficiency

Snoopy handles scraping, scheduling, state management, and result persistence with deterministic code. Your tokens go toward qualification intelligence — understanding whether a conversation matches your intent — not toward infrastructure overhead.

No context windows burned on pagination logic. No tokens wasted on serialization and storage. Just precise qualification where it counts.

---

## Local & Private

Results are stored in a local SQLite database. No cloud dependency. Your monitoring data and search criteria stay on your machine.

```bash
snoopy export --json --last-run   # structured export
snoopy consume --json             # mark results as consumed
```

Direct SQLite access available for agents and integrations. Full schema documentation in the [Database Schema](./reference/database-schema.md) reference.

---

## Cost-Aware Analytics

Track discovered, new, and qualified items per run. Token usage and cost estimates built into every analytics view.

```bash
snoopy analytics --days 7
snoopy analytics <jobRef> --days 30
```

Know exactly what each monitoring job costs to run over time.

---

## Agent & CI Ready

- **MCP server** — `snoopy mcp` exposes tools over stdio for Claude Code, ChatGPT, Gemini, or any MCP host
- **Direct SQLite access** — Agents can insert jobs, query results, and update lifecycle flags directly against `~/.snoopy/snoopy.db`
- **Non-interactive mode** — Pass job refs directly for zero-prompt execution
- **Machine-readable output** — `--json` flag on export, consume, and analytics
- **Environment variable config** — `SNOOPY_OPENROUTER_API_KEY`, `SNOOPY_REDDIT_CLIENT_SECRET`, `SNOOPY_ROOT_DIR`

---

## Cross-Platform & Always On

Runs on macOS, Linux, and Windows. Register for startup-on-reboot so monitoring never stops.

```bash
snoopy startup install
snoopy startup status
snoopy doctor               # health check
```

---

## Ready to Find Your Conversations?

[Get Started →](./getting-started/installation.md)

Or jump straight to the [Quickstart](./getting-started/quickstart.md) and [CLI Reference](./reference/cli-reference.md).

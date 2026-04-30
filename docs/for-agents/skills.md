---
title: Skills
sidebar_position: 4
description: Snoopy skill packages for AI agent workflows.
keywords:
  - skills
  - SKILL.md
  - agent skills
  - monitoring
---

# Skills

Snoopy ships a skill package that provides AI agents with zero-context workflow guidance for Reddit monitoring.

## Primary skill package

The `snoopy-cli-skill/` package is the installable skill bundle for Snoopy.

- **Location**: `snoopy-cli-skill/SKILL.md` (repository root)
- **Purpose**: Guides agents through install, setup, job management, debugging, and MCP integration
- **Format**: Agent Skills specification compliant

### Use cases

- Install and configure Snoopy from scratch
- Create and manage monitoring jobs
- Debug failed runs using errors and logs
- Register Snoopy with agent frameworks (Claude, Cursor, VS Code, etc.)
- Use MCP server for programmatic access
- Export qualified results for downstream processing

### Core file

`snoopy-cli-skill/SKILL.md` contains:

- Installation and setup instructions (interactive + non-interactive)
- Deterministic workflow for all operations
- MCP tool set documentation
- Argument semantics and constraints
- Gotchas and sharp edges
- Failure handling matrix
- Source evidence map

### Companion references

- `references/command-catalog.md` — full command/argument matrix
- `references/troubleshooting.md` — failure diagnostics

## Installation locations

### Project scope

- `.agents/skills/snoopy-cli-skill/`
- `.github/skills/snoopy-cli-skill/`
- `.cursor/skills/snoopy-cli-skill/`

### User scope

- `~/.agents/skills/snoopy-cli-skill/`
- `~/.copilot/skills/snoopy-cli-skill/`
- `~/.claude/skills/snoopy-cli-skill/`

## Required skill contract

Each shipped skill must document:

1. **Name**: `snoopy-cli-skill` (kebab-case, matches directory)
2. **Inputs**: OpenRouter API key, subreddits, qualification prompt, job name, schedule
3. **Guardrails**: always require API key, daemon must be running for scheduled jobs
4. **Outputs**: job runs, qualified results, analytics, error reports
5. **Failure modes**: missing API key, daemon not running, token truncation, DB locked
6. **Verification prompts**: should-trigger and should-not-trigger examples

## Publication rules

- Canonical page: `docs/for-agents/skills.md`
- Links to human docs: `docs/getting-started/installation.md`, `docs/getting-started/quickstart.md`
- Concrete examples: all command examples are copy-paste safe
- Sync requirements: skill updates must happen in same change as CLI behavior changes

## Sync and drift policy

When MCP tool surface changes, update in the same change:

1. `src/mcp/tools.ts` (schemas and contracts)
2. `src/mcp/server.ts` (handlers)
3. `docs/for-agents/mcp-server.md` (MCP docs)
4. `snoopy-cli-skill/SKILL.md` (skill docs)

When agent install targets change, update:

1. `src/agent/install.ts` (install logic)
2. `docs/for-agents/agent-setup.md` (setup docs)
3. `snoopy-cli-skill/SKILL.md` (skill docs)

## Related pages

- [MCP Server](./mcp-server.md) — MCP server documentation
- [Agent Setup](./agent-setup.md) — framework registration instructions
- [For Agents](./index.md) — agent constraints and decision flow

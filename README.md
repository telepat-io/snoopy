<p align="center"><img src="./snoopy-logo.webp" width="128" alt="Snoopy"></p>
<h1 align="center">Snoopy</h1>
<p align="center"><em>Sniff out the conversations that matter.</em></p>

<p align="center">
  <a href="https://docs.telepat.io/snoopy">📖 Docs</a>
  · <a href="./README.md">🇺🇸 English</a>
  · <a href="./README.zh-CN.md">🇨🇳 简体中文</a>
</p>

<p align="center">
  <a href="https://github.com/telepat-io/snoopy/actions/workflows/ci.yml"><img src="https://github.com/telepat-io/snoopy/actions/workflows/ci.yml/badge.svg?branch=main" alt="Build"></a>
  <a href="https://codecov.io/gh/telepat-io/snoopy"><img src="https://codecov.io/gh/telepat-io/snoopy/graph/badge.svg" alt="Codecov"></a>
  <a href="https://www.npmjs.com/package/@telepat/snoopy"><img src="https://img.shields.io/npm/v/@telepat/snoopy" alt="npm"></a>
  <a href="https://github.com/telepat-io/snoopy/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-yellow.svg" alt="License"></a>
</p>

Snoopy helps you monitor Reddit for high-intent conversations that match your business goals.

Define what you care about in plain language, let Snoopy create a monitoring job, and continuously scan and qualify posts and comments so you can focus on response and outreach.

## What It Solves

- Turn broad Reddit traffic into a focused stream of opportunities.
- Define qualification logic once, then run continuously.
- Trigger manual runs when you want quick validation.
- Track run analytics (discovered, new, qualified items, token usage, cost estimate).
- Run cross-platform with startup-on-reboot support.

## Quick Start

Requirements: Node.js 20+, npm 10+.

```bash
npm install -g @telepat/snoopy
```

1. Create your first monitoring job:

```bash
snoopy job add
```

2. Run a quick test scan:

```bash
snoopy job run --limit 5
```

3. Start the background daemon:

```bash
snoopy daemon start
```

4. View results:

```bash
snoopy results
snoopy export --json --last-run
```

For full onboarding, see [Installation & Setup](https://docs.telepat.io/snoopy/getting-started/installation) and [Quick Start](https://docs.telepat.io/snoopy/getting-started/quickstart).

## Requirements

- Node.js 20+
- npm 10+
- macOS, Linux, or Windows

## How It Works

Snoopy uses Reddit public JSON endpoints (with optional OAuth fallback) to scan posts and comments against an AI-assisted qualification prompt. Matches are stored in a local SQLite database. The built-in daemon runs jobs on cron schedules, and results can be exported as CSV or JSON on demand.

## Using With AI Agents

Snoopy is built for headless automation and agent-driven monitoring:

- **Non-interactive CLI** — Most commands support omitting `<jobRef>` to get an interactive picker, but automation can pass refs directly for zero-prompt execution.
- **Machine-readable output** — `snoopy export --json --last-run` and `snoopy consume --json` produce structured data for downstream agents.
- **Direct database access** — SQLite at `~/.snoopy/snoopy.db` (or `$SNOOPY_ROOT_DIR/snoopy.db`) with a documented schema. Agents can insert jobs, query results, and update lifecycle flags directly.
- **Environment variables** — `SNOOPY_OPENROUTER_API_KEY`, `SNOOPY_REDDIT_CLIENT_SECRET`, and `SNOOPY_ROOT_DIR` remove all interactive credential prompts.
- **Agent docs** — [Agent Operations](https://docs.telepat.io/snoopy/guides/agent-operations) provides a complete runbook for automation, including SQL schema, lifecycle flags, and recommended workflows.

## Security And Trust

- Secrets are stored in the OS keychain by default (via `keytar`). Falls back to an encrypted file if keychain is unavailable.
- Environment variables override stored secrets and are recommended for CI and containerized environments.
- Reddit OAuth credentials are optional; public JSON endpoints are used by default.
- Run logs older than 5 days are deleted automatically.

To report a security issue, open a private report through the repository security flow.

## Documentation And Support

- [Documentation site](https://docs.telepat.io/snoopy)
- [Installation & Setup](https://docs.telepat.io/snoopy/getting-started/installation)
- [Quick Start](https://docs.telepat.io/snoopy/getting-started/quickstart)
- [CLI Reference](https://docs.telepat.io/snoopy/reference/cli-reference)
- [Agent Operations](https://docs.telepat.io/snoopy/guides/agent-operations)
- [Scheduling & Daemon](https://docs.telepat.io/snoopy/guides/scheduling-and-startup)
- [Security](https://docs.telepat.io/snoopy/technical/security)
- Language support: English and Simplified Chinese
- [Repository](https://github.com/telepat-io/snoopy)
- [npm package](https://www.npmjs.com/package/@telepat/snoopy)

## Contributing

Contributions are welcome. See [Development](https://docs.telepat.io/snoopy/contributing/development) for setup, workflow, and quality gates.

## License

MIT. See [LICENSE](./LICENSE).

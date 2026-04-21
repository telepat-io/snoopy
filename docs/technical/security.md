---
title: Security
sidebar_position: 5
---

# Security and Secret Storage

This document describes how Snoopy stores secrets and operational data.

## Secret Types

Snoopy handles these high-value secrets directly:

- OpenRouter API key
- Reddit OAuth client secret (optional fallback mode)

## High-Value Secret Storage

Snoopy uses the same storage strategy for OpenRouter API keys and Reddit OAuth client secrets.

Primary path:

- OS credential store via `keytar`

Fallback path:

- environment variables
	- `SNOOPY_OPENROUTER_API_KEY`
	- `SNOOPY_REDDIT_CLIENT_SECRET`

Default root directory:

- `~/.snoopy`

## Reddit OAuth Fallback Metadata

Non-secret Reddit fallback metadata is stored in SQLite settings:

- app name
- client ID

The Reddit client secret is not stored in SQLite.

## Data at Rest

Primary local files:

- `snoopy.db` (job configs, run analytics, scan items, Reddit app name/client ID metadata)
- `logs/snoopy.log`
- `daemon.pid`

All stored under the app root directory (default `~/.snoopy`).

## Logging

Snoopy writes plain log lines to:

- `<root>/logs/snoopy.log`

Operational guidance:

- Avoid logging secrets in custom patches.
- Treat logs as potentially sensitive because titles/bodies and error payloads may include user/business context.

## Threat Model Notes

Current design is optimized for local developer/operator usage:

- Single-user machine assumptions
- No multi-tenant authorization layer
- No remote control plane

## Hardening Recommendations

- Use a dedicated machine/user account for production-like operation.
- Restrict filesystem permissions for app root.
- Prefer environments where keytar works, or inject secrets at runtime via environment variables.
- Rotate OpenRouter key periodically.
- Rotate Reddit OAuth client secret if fallback credentials are used.
- Back up DB securely if you rely on historical qualification data.
- Consider full-disk encryption on host.

## Incident Response Quick Steps

If a key is suspected compromised:

1. Revoke/rotate impacted key(s) in provider console(s) (OpenRouter and/or Reddit app).
2. Run `snoopy settings` and update credentials.
3. Update runtime environment variables if your deployment uses env-based secret injection.
4. Review logs for accidental key leakage.

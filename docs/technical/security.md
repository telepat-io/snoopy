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

- encrypted local file at `<root>/secrets.enc`

Default root directory:

- `~/.snoopy`

## Reddit OAuth Fallback Metadata

Non-secret Reddit fallback metadata is stored in SQLite settings:

- app name
- client ID

The Reddit client secret is not stored in SQLite.

Legacy note:

- Older local installs may still contain `reddit_client_secret` in `settings`.
- Snoopy migrates that value into secure secret storage on access and removes the DB key.

## Fallback Encryption Details

- Cipher: AES-256-CBC
- Random IV per write
- Key derivation: SHA-256 hash from machine/user-derived string

Notes:

- This is best-effort local protection, not HSM-grade security.
- If local account is compromised, fallback protection should not be treated as a strong boundary.

## Data at Rest

Primary local files:

- `snoopy.db` (job configs, run analytics, scan items, Reddit app name/client ID metadata)
- `secrets.enc` (only when keytar unavailable; contains encrypted high-value secrets)
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
- Prefer environments where keytar works.
- Rotate OpenRouter key periodically.
- Rotate Reddit OAuth client secret if fallback credentials are used.
- Back up DB securely if you rely on historical qualification data.
- Consider full-disk encryption on host.

## Incident Response Quick Steps

If a key is suspected compromised:

1. Revoke/rotate impacted key(s) in provider console(s) (OpenRouter and/or Reddit app).
2. Run `snoopy settings` and update credentials.
3. Remove fallback file if present (`secrets.enc`).
4. Review logs for accidental key leakage.

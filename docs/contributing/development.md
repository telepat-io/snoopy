---
title: Development
---

# Contributing: Development

Contributions are welcome. Use this guide for local development and quality gates.

## Local Setup

```bash
npm ci
npm run build
npm test
```

## Required Validation Order

Before opening a PR, run checks in this order:

```bash
npm run lint
npm run build
npm test
```

If docs/site files changed, also run:

```bash
npm run docs:build
```

## Test Expectations

- Add or update tests for meaningful behavior changes.
- Keep changes scoped and explicit.
- Preserve cross-platform behavior for startup/daemon commands.

## Helpful References

- [E2E Smoke Testing](../technical/e2e-testing.md)
- [Security](../technical/security.md)
- [CLI Reference](../reference/cli-reference.md)

---
title: Releasing and Docs Deploy
---

# Releasing and Docs Deploy

Snoopy uses release-please automation and npm publishing workflows.

## Release Automation

- `release-please.yml` manages versioning/changelog on `main`.
- When a release is created, publish runs with quality gates and npm provenance.

## Manual Publish Workflow

- `npm-publish.yml` is available for manual `workflow_dispatch` publishing.
- It validates tag format, package metadata, and main-branch ancestry before publish.

## Docs Deploy

Docs deploy to GitHub Pages via `docs-pages.yml`.

Local docs checks:

```bash
npm run docs:build
```

## References

- [Getting Started](../getting-started/overview.md)
- [CLI Reference](../reference/cli-reference.md)

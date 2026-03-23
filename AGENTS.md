# AGENTS

Scope: concise operating guide for future AI/code agents in this repo.

## Always Run Before Finishing

- npm run lint
- npm run build
- npm test

If docs/site files changed, also run:

- npm run docs:build

Keep test coverage high. Add tests for all meaningful behavior changes.

## Database and Schema Rules

- If schema changes are needed, add/update SQL migration files.
- Keep runtime DB bootstrap and migration SQL aligned.
- Preserve backward compatibility for existing local DBs.

## Command Surface Discipline

Before adding features, review existing commands and aliases to decide whether behavior should also apply there.

Current command areas to check:
- job / jobs
- start / stop
- daemon
- startup / reboot
- settings
- doctor

## Documentation Policy

- Update README.md for any user-visible feature, workflow, command, or config change.
- Keep README.md user-facing; put exhaustive technical detail under `docs/`.
- Docusaurus site lives under `website/` and renders the root `docs/` folder.
- Update AGENTS.md only when needed:
  - architectural shifts
  - new recurring engineering rules
  - major feature patterns worth preserving
- Keep AGENTS.md updates extremely concise.

## Implementation Notes

- Prefer small, explicit changes over broad refactors.
- Preserve cross-platform behavior (macOS/Linux/Windows) for startup and daemon flows.
- Keep job references supporting both ID and slug where applicable.
- For quick live end-to-end verification, run `npm run e2e:smoke` (create temp job -> manual run limit 5 -> delete job and related analytics).
- Qualification reliability: this model may exhaust completion tokens before emitting tool/json output; preserve truncation-aware retries when touching OpenRouter qualification flow.

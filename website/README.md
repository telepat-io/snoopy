# Snoopy Docs Site

Local development:

```bash
npm install
npm run docs:start
```

Build static site:

```bash
npm run docs:build
npm run docs:serve
```

GitHub Pages deployment:

```bash
GITHUB_OWNER=cozymantis GITHUB_REPO=snoopy npm run docs:deploy
```

Optional overrides:

- `DOCS_URL`
- `DOCS_BASE_URL`
- `GH_PAGES_BRANCH`
- `DOCS_LOCAL=true`

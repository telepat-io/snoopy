---
title: settings
sidebar_position: 5
---

# `settings`

The `settings` command opens an interactive settings menu.

```bash
snoopy settings
```

## What You Can Configure

- OpenRouter API key
- Default model ID
- Model settings:
  - temperature
  - max tokens
  - top-p
- Reddit OAuth fallback credentials (optional):
  - app name (defaults to generated `snoopy-<random>`, editable)
  - client ID
  - client secret (stored as high-value secret, not plaintext DB)

All settings are visible at once in a navigable menu. Use Up/Down arrows and press Enter to jump directly to the setting you want to edit, then return to the menu.

Secret-like values are shown in masked form in the menu:

- API key: partially masked
- Reddit client ID: partially masked
- Reddit client secret: shown only as configured/missing (never printed)

Choose `Save changes` to persist updates, or `Cancel`/`Esc` to exit without saving.

## When to Use It

Use `settings` when:

- first configuring Snoopy
- changing the model
- rotating API credentials
- configuring or rotating optional Reddit OAuth fallback credentials

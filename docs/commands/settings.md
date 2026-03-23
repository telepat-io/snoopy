---
title: settings
sidebar_position: 5
---

# `settings`

The `settings` command opens the interactive settings flow.

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

## When to Use It

Use `settings` when:

- first configuring Snoopy
- changing the model
- rotating API credentials
- configuring or rotating optional Reddit OAuth fallback credentials

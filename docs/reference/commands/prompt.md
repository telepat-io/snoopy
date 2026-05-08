---
title: Prompt
sidebar_position: 12
description: CLI reference for viewing and updating job qualification prompts.
keywords: [reddit, monitoring, cli, ai, prompt, qualification]
---

# `prompt`

Use `prompt` to inspect and update the qualification prompt used by a specific job.

## `prompt <jobRef>`

Show the current qualification prompt for one job.

Arguments:

- `<jobRef>`: Job ID or slug

Options:

- `--raw`: Print only prompt text and exit (best for shell scripts)

```bash
snoopy prompt lead-monitor
```

Interactive mode behavior:

- Shows job metadata and current prompt.
- Prompts whether to edit the prompt now.
- If confirmed, opens a multiline editor:
  - `Enter` submits
  - `Shift+Enter` inserts newline
  - arrow keys move cursor (`Up` and `Down` included)
  - `Esc` cancels

Non-interactive prompt text retrieval:

```bash
snoopy prompt lead-monitor --raw
```

## `prompt set <jobRef> <prompt>`

Set a new qualification prompt directly without opening interactive edit mode.

Arguments:

- `<jobRef>`: Job ID or slug
- `<prompt>`: New prompt text

Options:



```bash
snoopy prompt set lead-monitor "Find users actively comparing Stripe alternatives"
```

## Notes

- `<jobRef>` accepts either UUID or slug.
- Prompt updates apply on subsequent runs. To apply immediately, run `snoopy job run <jobRef>`.

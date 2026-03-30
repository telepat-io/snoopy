---
title: Results
sidebar_position: 8
---

# Results

Browse a job's scanned items (qualified and unqualified) in an interactive TUI viewer.

## Command

```bash
snoopy results [jobRef]
```

- `<jobRef>` accepts either job UUID or slug.
- If omitted in TTY mode, Snoopy prompts you to select a job.

## Behavior

- Results are ordered newest first.
- Includes both qualified and not-qualified items.
- Post items show title and body content.
- Comment items show the stored thread chain from root comment to target comment when available.

## Keys

- `←` / `→`: previous/next result item
- `↑` / `↓`: scroll within current item content
- `q` or `Esc`: quit

## Displayed Fields

- Item type (`post` or `comment`)
- Qualification status and justification
- Subreddit and posting author
- Link to original content
- Link to posting user profile
- Posted timestamp
- Run ID and scan item ID
- Lifecycle flags (`viewed`, `validated`, `processed`)
- Token/cost metadata

## Notes

- In non-rich terminals, Snoopy falls back to flat text output.
- Older comment records may not include stored thread lineage; Snoopy will show `Thread unavailable for this item.` for those records.

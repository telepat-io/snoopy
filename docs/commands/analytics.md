---
title: analytics
sidebar_position: 8
---

# analytics

Use analytics to inspect scanning volume and AI usage metrics at global or per-job scope.

## Usage

```bash
snoopy analytics
snoopy analytics <jobRef>
snoopy analytics --days 7
snoopy analytics <jobRef> --days 14
```

Arguments:

- `<jobRef>`: optional job ID or slug

Options:

- `-d, --days <count>`: look back this many days (default: 30)

## What It Shows

Global mode (`snoopy analytics`):

- system totals for new posts/comments scanned
- prompt/completion/total token usage
- estimated total cost
- averages per day for posts/comments/tokens/cost
- job-level and subreddit-level breakdowns
- recent run cards with duration, per-run new posts/comments, token totals, cost, and per-post ratios

Job mode (`snoopy analytics <jobRef>`):

- totals and averages for that single job
- subreddit-level breakdown for that job
- recent runs for that job

Cost values are labeled as estimates and use Snoopy's current static token-pricing heuristic.

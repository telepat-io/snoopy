---
title: Prompt
sidebar_position: 12
description: CLI-Referenz zum Anzeigen und Aktualisieren von Job-Qualifizierungs-Prompts.
keywords: [reddit, monitoring, cli, ai, prompt, qualification]
---

# `prompt`

Verwenden Sie `prompt`, um den Qualifizierungs-Prompt eines bestimmten Jobs einzusehen und zu aktualisieren.

## `prompt <jobRef>`

Zeigt den aktuellen Qualifizierungs-Prompt für einen Job an.

Argumente:

- `<jobRef>`: Job-ID oder Slug

Optionen:

- `--raw`: gibt nur den Prompt-Text aus und beendet (optimal für Shell-Skripte)

```bash
snoopy prompt lead-monitor
```

Verhalten des interaktiven Modus:

- Zeigt Job-Metadaten und den aktuellen Prompt an.
- Fragt, ob der Prompt jetzt bearbeitet werden soll.
- Bei Bestätigung wird ein mehrzeiliger Editor geöffnet:
  - `Enter` übermittelt
  - `Shift+Enter` fügt einen Zeilenumbruch ein
  - Pfeiltasten bewegen den Cursor (einschließlich `Up` und `Down`)
  - `Esc` bricht ab

Nicht-interaktive Prompt-Text-Ausgabe:

```bash
snoopy prompt lead-monitor --raw
```

## `prompt set <jobRef> <prompt>`

Setzt einen neuen Qualifizierungs-Prompt direkt, ohne den interaktiven Bearbeitungsmodus zu öffnen.

Argumente:

- `<jobRef>`: Job-ID oder Slug
- `<prompt>`: neuer Prompt-Text

Optionen:



```bash
snoopy prompt set lead-monitor "Find users actively comparing Stripe alternatives"
```

## Hinweise

- `<jobRef>` akzeptiert entweder UUID oder Slug.
- Prompt-Änderungen werden bei nachfolgenden Durchläufen wirksam. Zur sofortigen Anwendung führen Sie `snoopy job run <jobRef>` aus.

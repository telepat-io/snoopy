---
title: Ergebnisse
sidebar_position: 8
description: CLI-Referenz für den Results-Befehl zum Durchsuchen von Reddit-Überwachungs-Scan-Elementen in einem interaktiven Betrachter.
keywords: [reddit, monitoring, cli, ai, results, viewer]
---

# Ergebnisse

Durchsuchen Sie die gescannten Elemente eines Jobs (qualifiziert und nicht qualifiziert) in einem interaktiven TUI-Betrachter.

## Befehl

```bash
snoopy results [jobRef]
```

- `<jobRef>` akzeptiert entweder Job-UUID oder Slug.
- Wenn weggelassen im TTY-Modus, fordert Snoopy Sie auf, einen Job auszuwählen.

## Verhalten

- Ergebnisse sind nach neuestem sortiert.
- Enthält sowohl qualifizierte als auch nicht-qualifizierte Elemente.
- Beitrags-Elemente zeigen Titel und Inhaltsinhalt.
- Kommentar-Elemente zeigen die gespeicherte Threadkette vom Wurzelkommentar zum Zielkommentar, wenn verfügbar.

## Tasten

- `←` / `→`: Vorheriges/nächstes Ergebniselement
- `↑` / `↓`: Im aktuellen Elementinhalt scrollen
- `q` oder `Esc`: Beenden

## Angezeigte Felder

- Elementtyp (`post` oder `comment`)
- Qualifizierungsstatus und Begründung
- Subreddit und autor
- Link zum Originalinhalt
- Link zum Benutzerprofil des Autors
- Zeitstempel der Veröffentlichung
- Lauf-ID und Scan-Element-ID
- Lebenszyklus-Flags (`viewed`, `validated`, `processed`)
- Token/Kosten-Metadaten

## Hinweise

- In nicht-rich-Terminals fällt Snoopy auf flache Textausgabe zurück.
- Ältere Kommentaraufzeichnungen enthalten möglicherweise keine gespeicherte Thread-Abstammung; Snoopy zeigt in diesen Fällen `Thread unavailable for this item.` an.

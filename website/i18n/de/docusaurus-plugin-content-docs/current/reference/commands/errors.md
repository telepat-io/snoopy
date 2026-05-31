---
title: errors
sidebar_position: 9
description: CLI-Referenz für den Errors-Befehl zum Anzeigen fehlgeschlagener oder fehlerhafter Reddit-Überwachungsläufe.
keywords: [reddit, monitoring, cli, errors, debugging, runs]
---

# `errors [jobRef]`

Verwenden Sie `errors`, um kürzliche fehlgeschlagene oder fehlerhafte Läufe für einen Job anzuzeigen.

```bash
snoopy errors
snoopy errors <jobRef>
snoopy errors <jobRef> --hours 48
```

Argumente:

- `[jobRef]`: optionale Job-ID oder Slug

Optionen:

- `--hours <count>`: Um这么多 Stunden zurückblicken, Standard `24`

Was es anzeigt:

- Läufe mit `failed`-Status
- Läufe, deren Protokolldatei `[ERROR]`-Einträge enthält
- Den neuesten Fehlerblock für jeden passenden Lauf

Wenn `jobRef` weggelassen wird, zeigt Snoopy alle Jobs und lässt Sie einen mit Auf/Ab-Pfeilen und Enter auswählen.

Typische Verwendung:

- Einen lauten Job untersuchen
- Bestätigen, ob ein daemon-gesteuerter Job kürzlich fehlgeschlagen ist
- Kürzliche Fehler überprüfen, bevor die vollständige `logs <runId>`-Ausgabe geöffnet wird

## Verwandte Laufzustände

- Wenn ein Job bereits eine aktive `running`-Zeile hat, wird ein neuer `job run`-Versuch als `skipped` mit einer `already active`-Meldung aufgezeichnet.
- Doppelte Scan-Kandidaten (gleicher Job + Beitrags-/Kommentar-Identität) werden als vorhandene Elemente behandelt und lassen den Lauf nicht fehlschlagen.

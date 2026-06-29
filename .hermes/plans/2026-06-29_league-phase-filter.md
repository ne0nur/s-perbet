# Liga-Tabelle: Spieltag/Phase-Filter mit Turnier-Erkennung

> **Status:** Die Kernlogik existiert bereits. Nur das Phasen-Labeling ist auf CL hardcodiert.

**Goal:** In der Liga-Rangliste korrekte Phasen-Labels („Achtelfinale" statt „4.") für alle Turniere anzeigen, sodass der Filter nach Spieltag/Phase turnierübergreifend sinnvoll funktioniert.

**Architecture:** `getPhaseLabel()` in `LeaguePage.tsx` mit `useTournamentStore` verbinden, statt Hardcode für CL.

---

## IST-Zustand (was schon funktioniert)

- `viewSpieltag` State: `'gesamt' | number` → filtert Tipps auf einen Spieltag ✅
- `spieltag_punkte` pro MitgliedRow → Punkte nur für diesen Spieltag ✅
- Sortierung: Bei `viewSpieltag !== 'gesamt'` wird nach `spieltag_punkte` sortiert ✅
- Tabs: Zeigen Labels aus `getPhaseLabel(st, viewTournament)` ✅
- Turnier-Filter: `viewTournament` filtert Matches ✅

## PROBLEM

`getPhaseLabel` in `src/pages/LeaguePage.tsx:467-478`:

```typescript
const getPhaseLabel = (st: number, tournament: string) => {
    if (tournament === 'Champions League') { ... }  // Nur CL!
    return `${st}.`  // WM zeigt "4." statt "Achtelfinale"
}
```

## FIX (1 Task)

### Task 1: `getPhaseLabel` turnierfähig machen

**Datei:** `src/pages/LeaguePage.tsx`

**Schritt 1:** `getTournamentConfig` aus `useTournamentStore` importieren (bereits importiert auf Zeile 4)

**Schritt 2:** `getPhaseLabel` ersetzen:

```typescript
const getPhaseLabel = (st: number, tournament: string) => {
  const config = useTournamentStore.getState().getTournament(tournament)
  
  if (config?.has_knockout) {
    const gs = config.group_stage_matchdays
    if (st <= gs) return t('clRoundLeague', { st })
    
    const koRound = st - gs
    const isWC = tournament.toLowerCase().includes('world cup') || tournament.toLowerCase().includes('wm')
    
    if (isWC) {
      const wmPhases: Record<number, string> = {
        1: 'Achtelfinale', 2: 'Viertelfinale', 3: 'Halbfinale', 4: 'Finale'
      }
      return wmPhases[koRound] || `Runde ${koRound}`
    }
    
    // CL-Style
    const clPhases: Record<number, string> = {
      1: t('clRoundPlayoffs'), 2: t('clRoundLast16'), 
      3: t('clRoundQuarter'), 4: t('clRoundSemi'), 5: t('clRoundFinal')
    }
    return clPhases[koRound] || `Runde ${koRound}`
  }
  
  // Liga: "1.", "2.", ...
  return `${st}.`
}
```

**Schritt 3:** Build & Deploy

---

## Verfikation

1. Liga öffnen → Turnier „World Cup 2026" wählen
2. Tabs zeigen: `Gesamt | Gruppe 1 | Gruppe 2 | Gruppe 3 | Achtelfinale | Viertelfinale | ...`
3. Auf „Achtelfinale" klicken → Tabelle zeigt nur Punkte aus dieser Phase
4. Zurück zu Süper Lig → Tabs zeigen `Gesamt | 1. | 2. | 3. | ...`

---

**Geschätzte Dauer:** 5 Minuten (1 Task, ~20 Zeilen)

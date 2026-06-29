# 🔥 ULTRA-PROMPT: Smart Tournament Context System

> **Für Hermes/Entwickler:** Dieses Dokument ist die vollständige Spezifikation. Jeder Abschnitt beschreibt WAS gebaut werden muss und WARUM. Kein Rate-Spiel — alles ist hier definiert.

---

## 🎯 ZIEL

Die App wird von einem "chaotischen Ein-Turnier-Denken" zu einem **Multi-Turnier-Kontextsystem** umgebaut. Der User soll zu JEDER Zeit wissen:
- In welchem **Turnier** er sich befindet
- Welcher **Spieltag / Phase** aktuell ist (pro Turnier intelligent erkannt)
- Dass **alle Turniere immer sichtbar** sind (nichts verschwindet)

**Mantra:** *"Turniere verschwinden nie. Spieltage starten nie bei 1. Der Kontext ist immer klar."*

---

## 📐 ARCHITEKTUR-ÄNDERUNG

### Vorher (kaputt):
```
matchStore:
  aktuellerSpieltag: number  ← EIN Wert für ALLE Turniere
  aktuelleSaison: number     ← EIN Wert für ALLE Turniere
  ladeMatches(spieltag)      ← Lädt ohne Tournament-Filter
```

### Nachher (smart):
```
matchStore:
  turnierContext: Record<string, TurnierContext>  ← Pro Turnier ein Context
  selectedTournament: string                       ← Welches Turnier ist aktiv
  selectedSpieltag: number                         ← Spieltag im aktiven Turnier

TurnierContext {
  aktuellerSpieltag: number    // Smart erkannt (live > upcoming > latest)
  maxSpieltag: number          // Dynamisch aus DB
  saison: number               // Pro Turnier
  phasenInfo: PhasenInfo       // Für CL, WM etc.
}
```

**ABER:** Kein kompletter Rewrite! Der Store wird graduell erweitert, nicht weggeworfen. Bestehende Funktionalität (Cache, Realtime) bleibt erhalten.

---

## 🔧 IMPLEMENTIERUNG (5 Phasen)

---

### Phase 1: Turnier-Registry — Quelle der Wahrheit

**Ziel:** Alle Turniere kommen aus der DB (`tournament_configs`), nicht aus geladenen Matches. Turniere verschwinden NIE.

#### Task 1.1: `useTournamentStore` erstellen

```
📁 src/stores/tournamentStore.ts (NEU)
```

```typescript
import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export interface TournamentConfig {
  id: number
  name: string           // 'Süper Lig', 'Champions League', 'World Cup 2026'
  emoji: string
  season: number
  has_table: boolean
  has_knockout: boolean
  group_stage_matchdays: number
  // ... weitere Felder aus tournament_configs
}

interface TournamentState {
  tournaments: TournamentConfig[]
  isLaden: boolean
  ladeTournaments: () => Promise<void>
  getTournament: (name: string) => TournamentConfig | undefined
}

export const useTournamentStore = create<TournamentState>((set, get) => ({
  tournaments: [],
  isLaden: false,

  ladeTournaments: async () => {
    set({ isLaden: true })
    const { data, error } = await supabase
      .from('tournament_configs')
      .select('*')
      .order('name')
    
    if (!error && data) {
      set({ tournaments: data as TournamentConfig[], isLaden: false })
    } else {
      // Fallback: Hardcoded defaults wenn DB leer
      set({
        tournaments: [
          { id: 0, name: 'Süper Lig', emoji: '🇹🇷', season: 2026, has_table: true, has_knockout: false, group_stage_matchdays: 100 },
          { id: 1, name: 'Champions League', emoji: '⭐', season: 2026, has_table: true, has_knockout: true, group_stage_matchdays: 8 },
        ],
        isLaden: false
      })
    }
  },

  getTournament: (name: string) => get().tournaments.find(t => t.name === name),
}))
```

#### Task 1.2: `getTournamentLogo()` erweitern

```
📁 src/lib/utils.ts (ÄNDERN)
```

**Füge Fallback-Logik hinzu:**
```typescript
export function getTournamentLogo(tournamentName: string): string {
  const base = import.meta.env.BASE_URL || '/'
  const cleanName = tournamentName ? tournamentName.toLowerCase() : ''
  
  // Exakte Matches
  if (cleanName === 'champions league') return `${base}logos/UEFA_Champions_League_logo.png`
  if (cleanName === 'süper lig') return `${base}logos/Süper_Lig.png`
  if (cleanName === 'europa league') return `${base}logos/UEFA_Europa_League_logo.png`
  
  // Teil-Matches (für "World Cup 2026", "FIFA World Cup" etc.)
  if (cleanName.includes('world cup') || cleanName.includes('wm')) {
    return `${base}logos/FIFA_World_Cup_logo.png`
  }
  if (cleanName.includes('europa')) return `${base}logos/UEFA_Europa_League_logo.png`
  
  // Fallback: Erstes Wort extrahieren für Dateinamen
  const firstWord = tournamentName?.split(' ')[0] || 'soccer_ball'
  return `${base}logos/${firstWord}.png`  // Browser handled 404 → onError Fallback
}
```

#### Task 1.3: In `App.tsx` Turniere beim Mount laden

```
📁 src/App.tsx (ÄNDERN — eine Zeile im useEffect)
```

```typescript
useEffect(() => {
  useTournamentStore.getState().ladeTournaments()
}, [])
```

---

### Phase 2: Smart Spieltag-Detection PRO TURNIER

**Ziel:** Wenn User Turnier wechselt, springt der Spieltag auf den RICHTIGEN Wert (nicht 1).

#### Task 2.1: `matchStore` um `selectedTournament` + `smartSelectSpieltag()` erweitern

```
📁 src/stores/matchStore.ts (ÄNDERN)
```

**Füge zum Interface hinzu:**
```typescript
interface MatchState {
  // ... bestehende Felder ...
  
  selectedTournament: string           // NEU: 'Süper Lig' | 'Champions League' | ...
  
  // NEUE Methoden:
  setSelectedTournament: (name: string) => Promise<void>  // Setzt Turnier + smarten Spieltag
  smartSelectSpieltag: (tournament: string) => Promise<number>
}
```

**Implementierung `smartSelectSpieltag`:**

```typescript
smartSelectSpieltag: async (tournament: string) => {
  const season = get().aktuelleSaison
  
  // 1. Live-Spiel in diesem Turnier?
  let liveQuery = supabase.from('matches').select('spieltag')
    .eq('status', 'live').eq('tournament', tournament).limit(1)
  if (season) liveQuery = liveQuery.eq('season', season)
  const { data: liveData } = await liveQuery
  if (liveData?.length) {
    set({ aktuellerSpieltag: liveData[0].spieltag })
    return liveData[0].spieltag
  }
  
  // 2. Nächstes upcoming-Spiel?
  let upcomingQuery = supabase.from('matches').select('spieltag')
    .eq('status', 'upcoming').eq('tournament', tournament)
    .order('anpfiff', { ascending: true }).limit(1)
  if (season) upcomingQuery = upcomingQuery.eq('season', season)
  const { data: upcomingData } = await upcomingQuery
  if (upcomingData?.length) {
    set({ aktuellerSpieltag: upcomingData[0].spieltag })
    return upcomingData[0].spieltag
  }
  
  // 3. Höchster existierender Spieltag im Turnier
  let maxQuery = supabase.from('matches').select('spieltag')
    .eq('tournament', tournament)
    .order('spieltag', { ascending: false }).limit(1)
  if (season) maxQuery = maxQuery.eq('season', season)
  const { data: maxData } = await maxQuery
  if (maxData?.length) {
    set({ aktuellerSpieltag: maxData[0].spieltag })
    return maxData[0].spieltag
  }
  
  // 4. Fallback
  set({ aktuellerSpieltag: 1 })
  return 1
},

setSelectedTournament: async (name: string) => {
  set({ selectedTournament: name })
  const st = await get().smartSelectSpieltag(name)
  // Jetzt Matches für diesen Spieltag + Turnier laden
  await get().ladeMatches(st)
}
```

---

### Phase 3: DashboardPage umbauen

**Ziel:** Turnier-Buttons verschwinden nie, Spieltag/Phase ist immer smart, Kontext ist klar.

#### Task 3.1: Turnier-Buttons aus `tournamentStore` statt aus Matches

```
📁 src/pages/DashboardPage.tsx (ÄNDERN)
```

**Ersetze Zeile 34-44:**
```typescript
// VORHER (kaputt):
const availableTournaments = useMemo(() => {
  const list = new Set<string>()
  matches.forEach(m => { if (m.tournament) list.add(m.tournament) })
  if (list.size === 0) { list.add('Süper Lig'); list.add('Champions League') }
  return Array.from(list).sort()
}, [matches])

// NACHHER (smart):
const tournaments = useTournamentStore(s => s.tournaments)
const isTournamentsLoaded = useTournamentStore(s => !s.isLaden)

// Fallback während Laden — zeigt die 2 Defaults, nie leer
const availableTournaments = useMemo(() => {
  if (tournaments.length > 0) return tournaments.map(t => t.name)
  return ['Süper Lig', 'Champions League']  // Fallback NIE leer
}, [tournaments])
```

#### Task 3.2: Turnierwechsel smart statt `setSpieltag(1)`

**Ersetze Zeile 253:**
```typescript
// VORHER:
onClick={() => { setSelectedTournament(tName); setSpieltag(1); }}

// NACHHER:
onClick={() => {
  setSelectedTournament(tName)
  useMatchStore.getState().setSelectedTournament(tName)
}}
```

#### Task 3.3: Phasen-Label aus `tournamentStore` holen

**Ersetze `getPhaseLabel` (Zeile 220-229):**
```typescript
const getPhaseLabel = (st: number, tournament: string) => {
  const config = useTournamentStore.getState().getTournament(tournament)
  
  // CL / KO-Turniere: Zeige Phase statt "Spieltag X"
  if (config?.has_knockout) {
    if (st <= config.group_stage_matchdays) {
      return t('clRoundLeague', { st })
    }
    // Berechne K.o.-Runde aus Spieltag-Nummer
    const koRound = st - config.group_stage_matchdays
    const koLabels: Record<number, string> = {
      1: t('clRoundPlayoffs'),
      2: t('clRoundLast16'),
      3: t('clRoundQuarter'),
      4: t('clRoundSemi'),
      5: t('clRoundFinal'),
    }
    return koLabels[koRound] || `K.o. Runde ${koRound}`
  }
  
  // Liga-Turniere: Zeige "Spieltag X" im Liga-Stil
  return t('slRoundLabel', { st })
}
```

#### Task 3.4: Kontext-Indikator im Header

**Füge direkt unter dem Turnier-Selector ein:**
```tsx
{/* Kontext-Indikator — zeigt wo der User ist */}
{selectedTournament && (
  <div className="flex items-center gap-2 px-3 py-1.5 bg-primary-container/10 border border-primary/10 rounded-full text-[10px] font-mono text-on-surface-variant">
    <img src={getTournamentLogo(selectedTournament)} alt="" className="w-4 h-4" />
    <span className="text-primary font-black">{selectedTournament}</span>
    <span className="text-on-surface-variant/40">·</span>
    <span>{getPhaseLabel(aktuellerSpieltag, selectedTournament)}</span>
    {aktuellerSpieltag > 0 && (
      <>
        <span className="text-on-surface-variant/40">·</span>
        <span className="text-on-surface-variant/50">Saison {aktuelleSaison}</span>
      </>
    )}
  </div>
)}
```

---

### Phase 4: "ALLE" reparieren

**Ziel:** "ALLE" (Spieltag 0) zeigt ALLE Turniere, nicht nur das selektierte.

#### Task 4.1: `matchesByTournament` Logik fixen

```
📁 src/pages/DashboardPage.tsx (ÄNDERN, Zeile 415-418)
```

```typescript
// VORHER:
.filter(([tournamentName]) => tournamentName === selectedTournament)

// NACHHER:
// Wenn aktuellerSpieltag === 0 ("ALLE"): zeige ALLE Turniere
// Sonst: zeige nur selektiertes Turnier
.filter(([tournamentName]) => {
  if (aktuellerSpieltag === 0) return true  // ALLE Turniere
  return tournamentName === selectedTournament
})
```

---

### Phase 5: Logo & visuelle Feinschliffe

#### Task 5.1: Logo-Fallback in `MatchCard`

```
📁 src/components/MatchCard.tsx (ÄNDERN)
```

Stelle sicher, dass jedes Turnier-Logo einen `<img onError>` Fallback hat:
```tsx
<img 
  src={getTournamentLogo(tournamentName)} 
  onError={(e) => { (e.target as HTMLImageElement).src = `${base}logos/soccer_ball.png` }}
  alt={tournamentName}
/>
```

#### Task 5.2: WM 2026 in `tournament_configs` seeden

```sql
INSERT INTO tournament_configs (name, emoji, season, has_table, has_knockout, group_stage_matchdays)
VALUES ('World Cup 2026', '🌍', 2026, true, true, 3)
ON CONFLICT (name) DO UPDATE SET season = 2026, has_knockout = true, group_stage_matchdays = 3;
```

WM 2026 hat:
- 3 Gruppen-Spieltage (group_stage_matchdays: 3)
- K.o.-Phase ab Spieltag 4 (Achtelfinale = 4, Viertelfinale = 5, Halbfinale = 6, Finale = 7)

---

## 🧪 TEST-SZENARIEN

Nach der Implementierung muss folgendes funktionieren:

| # | Test | Erwartet |
|---|------|----------|
| 1 | App öffnen | Alle Turniere (Süper Lig, CL, WM) als Buttons sichtbar |
| 2 | Auf "World Cup 2026" klicken | Spieltag springt auf erstes Live-/Upcoming-Spiel (z.B. 4 = Achtelfinale), nicht auf 1 |
| 3 | Zurück zu "Süper Lig" | Spieltag springt auf aktuellen Süper-Lig-Spieltag |
| 4 | "ALLE" klicken | ALLE Turniere werden untereinander angezeigt, nicht nur eins |
| 5 | Kontext-Indikator | Zeigt immer: [Logo] Turniername · Phase · Saison |
| 6 | Turnier ohne Matches (z.B. Europa League) | Button bleibt sichtbar, Klick zeigt "Keine Spiele" |
| 7 | Logo für WM | WM-Logo wird korrekt geladen oder Fallback (Fußball-Icon) |

---

## ⚠️ PITFALLS & FALLSTRICKE

1. **Nicht den ganzen Store rewriten!** `matchStore` hat funktionierenden Cache + Realtime — nur ERWEITERN, nicht ersetzen.
2. **`ladeMatches()` muss Turnier-Filter respektieren.** Wenn der Store `selectedTournament` hat, muss `ladeMatches` mit `.eq('tournament', tournament)` filtern. Sonst sieht User Matches aus falschem Turnier.
3. **`initialisiereSpieltag()` beim ersten Mount:** Sollte das DEFAULT-Turnier nehmen (erstes in der Liste, z.B. "Süper Lig") und DAFÜR den smarten Spieltag ermitteln, nicht global.
4. **Dashboard `useEffect` (Zeile 56-61) sollte `setSelectedTournament` nutzen statt `initialisiereSpieltag`**.
5. **Phase-Labels sind pro Turnier anders.** CL: "Ligaphase", "Playoffs", "Achtelfinale". WM: "Gruppe", "Achtelfinale". Süper Lig: "Spieltag 1" etc. Das muss die `getPhaseLabel`-Funktion dynamisch aus `tournament_configs` ableiten.

---

## 📦 DATEIEN (Übersicht)

| Aktion | Datei |
|--------|-------|
| **NEU** | `src/stores/tournamentStore.ts` |
| **ÄNDERN** | `src/stores/matchStore.ts` — `selectedTournament`, `smartSelectSpieltag`, `setSelectedTournament`, Turnier-Filter in `ladeMatches` |
| **ÄNDERN** | `src/pages/DashboardPage.tsx` — Turnier-Buttons, Kontext-Indikator, "ALLE" Fix, Phasen-Label |
| **ÄNDERN** | `src/lib/utils.ts` — `getTournamentLogo()` mit WM und Fallback |
| **ÄNDERN** | `src/components/MatchCard.tsx` — Logo onError Fallback |
| **ÄNDERN** | `src/App.tsx` — `ladeTournaments()` im Mount |
| **NEU** | `supabase/migrations/038_seed_worldcup_tournament.sql` — WM in tournament_configs |
| **NEU** | `public/logos/FIFA_World_Cup_logo.png` — WM Logo (falls vorhanden) |

---

## 🎨 ERGEBNIS-VISION

Wenn alles fertig ist, sieht der Dashboard-Header so aus:

```
┌─────────────────────────────────────────────────────────┐
│  [🇹🇷 Süper Lig]  [⭐ CL]  [🌍 WM 2026]  [🏆 Europa]    │
│                                                         │
│  🌍 World Cup 2026 · Achtelfinale · Saison 2026        │
│                                                         │
│  [ALLE] │ [Gruppe 1] [Gruppe 2] [Gruppe 3] [AF] [VF]  │
│                                                         │
│  [Alle Spiele]  [Nur Live]           🟢 Live (15:32)   │
└─────────────────────────────────────────────────────────┘
```

Kein Turnier verschwindet. Der Spieltag ist immer der richtige. Der Kontext ist immer klar.

---

> **Status:** 📋 Spezifikation fertig — bereit zur Implementierung
> **Priorität:** 🔥 KRITISCH (User kann App aktuell nicht sinnvoll nutzen)
> **Geschätzte Dauer:** 2-3 Stunden (5 Phasen, ca. 15 Tasks)

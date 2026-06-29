# WM 2026: Korrekte Gruppen & Phasen in der Tabelle

> **Goal:** StandingsPage zeigt 12 echte WM-Gruppen (A-L) + korrekte Phasen-Labels (Sechzehntelfinale etc.) in allen Views.

**Problem:** Aktuell werden Teams alphabetisch in 12 Fake-Gruppen einsortiert. Phasen-Labels fehlen oder sind falsch (kein "Sechzehntelfinale").

---

## Analyse: Was stimmt nicht?

### 1. Gruppen-Zuordnung (kaputt)
`StandingsPage.tsx:482-492` — `getTeamGroup()` teilt Teams alphabetisch in 12 Gruppen:
```
Team 1-4  → "Group A"
Team 5-8  → "Group B"
...
```
**Realität laut Spielplan:**
```
Group A: Mexiko, Südafrika, Südkorea, Tschechien
Group B: Schweiz, Kanada, Bosnien-Herzegowina, Katar
...
Group L: England, Kroatien, Ghana, Panama
```

### 2. Phasen-Labels (falsch/fehlend)
| Quelle | Spieltag 4 | Was es zeigt | Was es zeigen soll |
|--------|-----------|-------------|-------------------|
| DashboardPage `getPhaseLabel` | Sechzehntelfinale | "Play-offs" (clRoundPlayoffs) | "Sechzehntelfinale" |
| LeaguePage `getPhaseLabel` | Sechzehntelfinale | "Achtelfinale" (koPhase16) | "Sechzehntelfinale" |
| StandingsPage tabs | Sechzehntelfinale | "Sechzehntelfinale" ✅ | schon korrekt |

### 3. WM-Phasen (korrekte Struktur)
```
Spieltag 1-3:  Gruppenphase (12 Gruppen à 4 Teams)
Spieltag 4:    Sechzehntelfinale (16 Spiele, 32 Teams)
Spieltag 5:    Achtelfinale (8 Spiele)
Spieltag 6:    Viertelfinale (4 Spiele)  
Spieltag 7:    Halbfinale (2 Spiele)
Spieltag 8:    Spiel um Platz 3 + Finale
```

---

## Implementierung

### Task 1: WM-Gruppen-Mapping (Backend)

**Datei:** `src/lib/wmGroups.ts` (NEU)

```typescript
// Echte WM 2026 Gruppen-Zuordnung (laut Spielplan)
export const WM_GROUPS: Record<string, string> = {
  // Group A
  'Mexiko': 'A', 'Südafrika': 'A', 'Südkorea': 'A', 'Tschechien': 'A',
  // Group B
  'Schweiz': 'B', 'Kanada': 'B', 'Bosnien-Herzegowina': 'B', 'Katar': 'B',
  // Group C
  'Brasilien': 'C', 'Marokko': 'C', 'Schottland': 'C', 'Haiti': 'C',
  // Group D
  'USA': 'D', 'Australien': 'D', 'Paraguay': 'D', 'Türkei': 'D',
  // Group E
  'Deutschland': 'E', 'Elfenbeinküste': 'E', 'Ecuador': 'E', 'Curaçao': 'E',
  // Group F
  'Niederlande': 'F', 'Japan': 'F', 'Schweden': 'F', 'Tunesien': 'F',
  // Group G
  'Belgien': 'G', 'Ägypten': 'G', 'Iran': 'G', 'Neuseeland': 'G',
  // Group H
  'Spanien': 'H', 'Kap Verde': 'H', 'Uruguay': 'H', 'Saudi-Arabien': 'H',
  // Group I
  'Frankreich': 'I', 'Norwegen': 'I', 'Senegal': 'I', 'Irak': 'I',
  // Group J
  'Argentinien': 'J', 'Österreich': 'J', 'Algerien': 'J', 'Jordanien': 'J',
  // Group K
  'Kolumbien': 'K', 'Portugal': 'K', 'DR Kongo': 'K', 'Usbekistan': 'K',
  // Group L
  'England': 'L', 'Kroatien': 'L', 'Ghana': 'L', 'Panama': 'L',
}

export function getWMGroup(teamName: string): string | null {
  return WM_GROUPS[teamName] || null
}
```

### Task 2: StandingsPage — echte Gruppen verwenden

**Datei:** `src/pages/StandingsPage.tsx`

**Schritt 2a:** Import hinzufügen:
```typescript
import { getWMGroup } from '../lib/wmGroups'
```

**Schritt 2b:** `getTeamGroup` ersetzen (Zeile 482-492):
```typescript
const getTeamGroup = (team: string) => {
  if (!isGrouped) return 'Tabelle'
  
  // WM: echte Gruppen aus Mapping
  if (viewTournament === 'World Cup 2026') {
    return getWMGroup(team) || 'Ungruppiert'
  }
  
  // CL: alphabetische Gruppen (wie bisher)
  const allTeams = standings.map(r => r.team)
  const teamIndex = allTeams.indexOf(team)
  const numGroups = 8
  const teamsPerGroup = Math.ceil(allTeams.length / numGroups)
  const groupIndex = Math.floor(teamIndex / teamsPerGroup) % numGroups
  return `Group ${String.fromCharCode(65 + groupIndex)}`
}
```

**Schritt 2c:** Gruppen-Namen in der UI anzeigen (Zeile 510):
```typescript
// Statt "Group A" → "Gruppe A"
{groupName.replace('Group ', 'Gruppe ')}
```

### Task 3: Phasen-Labels in DashboardPage + LeaguePage fixen

**Datei:** `src/pages/DashboardPage.tsx` (bereits tournament-aware, aber Labels falsch)

```typescript
// Im getPhaseLabel, WM-Block:
if (isWC) {
  const wmPhases: Record<number, string> = {
    1: 'Sechzehntelfinale', 2: 'Achtelfinale', 
    3: 'Viertelfinale', 4: 'Halbfinale', 5: 'Finale'
  }
  return wmPhases[koRound] || `Runde ${koRound}`
}
```

**Datei:** `src/pages/LeaguePage.tsx` (gleich wie DashboardPage)
→ Gleiche WM-Phasen-Map. koRound 1 = Sechzehntelfinale.

### Task 4: Build + Deploy

---

## Verifikation

1. Tabelle → WM 2026 → Gruppenphase:
   - 12 Gruppen (A-L) mit je 4 Teams
   - Gruppe A: Mexiko, Südafrika, Südkorea, Tschechien ✅
2. Phasen-Tabs: Sechzehntelfinale | Achtelfinale | Viertelfinale | Halbfinale | Finale
3. Dashboard: Spieltag 4 = "Sechzehntelfinale" (nicht "Play-offs")
4. Liga: Spieltag-Filter zeigt "Sechzehntelfinale" statt "Achtelfinale"

---

**Geschätzt:** 4 Tasks, ~15 Minuten

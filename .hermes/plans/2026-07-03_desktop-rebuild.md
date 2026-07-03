# Desktop Rebuild: SüperBET — Premium Dashboard 2026

> **Für Hermes:** Nutze Subagents (delegate_task) zur parallelen Implementierung. Mobile UNBERÜHRT — alle Änderungen nur mit `md:` Breakpoints. **KEINE Sidebar, keine AI-Sloppy-Elemente.**

**Goal:** Desktop-Ansicht vom "Mobile-in-Groß"-Syndrom befreien. Jede Page bekommt ein durchdachtes Desktop-Layout mit Grids, Panels und echter Raumnutzung — kein gestrecktes Phone-UI.

**Architecture:** 
- **Erhalten:** Top Bar (HeaderLogo + ShinyText), Floating Dock, ColorBends-Hintergrund — diese sind bereits premium
- **Neu:** Page-spezifische Desktop-Layouts mit Multi-Column-Grids, Split-Panels, GlassSurface-Containern
- **Prinzip:** Jede Page nutzt den horizontalen Raum sinnvoll — Cards im Grid, Tabellen mit Detail-Panel, Leaderboard mit Podium

**Tech Stack:** React 19, Tailwind CSS 4, Framer Motion, GlassSurface (vorhanden), Lucide Icons

---

## Page-Layouts im Detail

### 1. DashboardPage — Match-Grid + Detail-Panel

**Aktuell:** Eine Spalte MatchCards, Spieltag-Slider, Turnier-Dropdown — alles untereinander.
**Ziel:** Desktop = 2–3-spaltiges Match-Grid (abhängig von Turnier), MatchDetailPanel als Slide-in-Panel rechts statt Overlay.

**Layout:**
```
┌─────────────────────────────────────────────────┐
│ [Turnier-Tabs] [Phase-Slider] [Live-Filter]     │  ← horizontal toolbar
├──────────────────────────┬──────────────────────┤
│                          │                      │
│  MatchCard  MatchCard    │  MatchDetailPanel    │  ← nur sichtbar wenn Match selektiert
│  MatchCard  MatchCard    │  (Tipps, Chat)       │
│  MatchCard  MatchCard    │                      │
│                          │                      │
└──────────────────────────┴──────────────────────┘
```

**Grid-Logik:**
- WM 2026 (Gruppenphase, 4 Teams/Gruppe, 2 Spiele/Spieltag): 2-spaltig — passt perfekt
- Süper Lig (9-10 Spiele/Spieltag): 3-spaltig
- CL (8 Spiele/Spieltag): 3-spaltig
- KO-Phasen (weniger Spiele): 2-spaltig, zentriert

**Detail-Panel:** Statt Fullscreen-Overlay → Slide-in von rechts (w-96, ~380px), MatchCard-Grid shifted nach links. Mobile: Overlay wie bisher.

**Files:**
- Modify: `src/pages/DashboardPage.tsx` — Grid-Layout, Panel-Logik
- Modify: `src/components/MatchDetailPanel.tsx` — Desktop: Slide-in statt Overlay (neue Prop: `variant?: 'overlay' | 'panel'`)

---

### 2. StandingsPage — Tabelle + TeamInspector Side-by-Side

**Aktuell:** Tabelle volle Breite, TeamInspector als separates Overlay.
**Ziel:** Desktop = Tabelle (2/3) + TeamInspector (1/3) als persistentes Panel. Click auf Team → Inspector rechts aktualisiert sich.

**Layout:**
```
┌─────────────────────────────────────────────────┐
│ [Turnier-Tabs] [Phase-Tabs]                     │
├──────────────────────────┬──────────────────────┤
│                          │  TeamInspector       │
│  Tabelle                 │  - Logo, Stats       │
│  (scrollbar)             │  - Form, Spiele      │
│                          │  - Platzierung       │
│                          │                      │
└──────────────────────────┴──────────────────────┘
```

**Files:**
- Modify: `src/pages/StandingsPage.tsx` — Zwei-Spalten-Layout, selectedTeam-State
- Modify: `src/components/TeamInspector.tsx` — Desktop: Panel-Mode (kein Overlay)

---

### 3. GlobalPage — Podium + Leaderboard

**Aktuell:** Podium oben, Leaderboard-Tabelle darunter — schon ganz okay, aber kein echtes Desktop-Layout.
**Ziel:** Podium horizontal (Top 3 nebeneinander), Leaderboard mit RivalInspector als Modal.

**Layout:**
```
┌─────────────────────────────────────────────────┐
│                                                 │
│         🥇 Podium (Top 3 horizontal)            │
│         [2nd]  [1st]  [3rd]                     │
│                                                 │
├─────────────────────────────────────────────────┤
│  Leaderboard-Tabelle (sticky header, scroll)    │
│  #  Spieler        Punkte  Level  Trend         │
│  ─────────────────────────────────────────────  │
│  1  Max Mustermann  142    12     ↑2            │
│  ...                                            │
└─────────────────────────────────────────────────┘
```

**Verbesserungen:**
- Podium-Karten: GlassSurface-Container, LevelBadge, PodiumBadge
- Tabelle: sticky header, zebra-striping, hover-highlight
- RivalInspector: Modal (unverändert, funktioniert gut)

**Files:**
- Modify: `src/pages/GlobalPage.tsx` — Desktop-Podium-Layout, Tabellen-Styling

---

### 4. LeaguePage — Liga-Selector + Tabelle + Chat

**Aktuell:** Alles untereinander.
**Ziel:** Liga-Selector oben, dann Tabelle (2/3) + Chat (1/3) nebeneinander.

**Layout:**
```
┌─────────────────────────────────────────────────┐
│ [Liga-Selector] [Invite] [Create]               │
├──────────────────────────┬──────────────────────┤
│                          │  💬 LeagueChat       │
│  Tabelle                 │  - Nachrichten       │
│  (Spieltag-Tabs)         │  - Input             │
│                          │                      │
└──────────────────────────┴──────────────────────┘
```

**Files:**
- Modify: `src/pages/LeaguePage.tsx` — Split-Layout
- Modify: `src/components/LeagueChat.tsx` — Desktop: Panel-Mode

---

### 5. ProfilePage — Grid-Dashboard

**Aktuell:** Abschnitte untereinander.
**Ziel:** Zweispaltiges Grid — Stats links, Achievements/Admin rechts.

**Layout:**
```
┌─────────────────────────────────────────────────┐
│  [Avatar + Username + Level]                    │
├──────────────────────┬───────────────────────────┤
│  StatsGrid           │  AchievementsSection      │
│  PointsChart         │  BonusTippsCard           │
│  TippsFreigabeToggle │  AdminSection             │
│  Theme-Picker        │                           │
│  UserInfoSettings    │                           │
└──────────────────────┴───────────────────────────┘
```

**Files:**
- Modify: `src/pages/ProfilePage.tsx` — Grid-Layout

---

## Design-Richtlinien

1. **GlassSurface** für alle Container auf Desktop (`blur={20} opacity={0.12}`)
2. **Keine harten Farben** — nur `primary-fixed-dim`, `primary-container` etc.
3. **Mobile UNBERÜHRT** — alle neuen Layouts in `hidden md:...` oder `md:` Prefix
4. **Keine Sidebar** — Navigation bleibt Dock (unten) + Top Bar (oben)
5. **Scroll-Verhalten:** Panels und Tabellen bekommen `overflow-y-auto` mit `max-h-[calc(100dvh-...)]`
6. **Animationen:** Framer Motion `layout` für Panel-Transitions, keine übertriebenen Effekte

---

## Implementierungs-Plan

### Phase 1: DashboardPage Desktop Grid + Panel
**Subagent A:** DashboardPage umbauen
- Match-Grid (2-3 Spalten je nach Turnier/Phase)
- MatchDetailPanel als Slide-in (nicht Overlay)
- Toolbar horizontal (Turnier, Phase, Filter)

### Phase 2: StandingsPage + TeamInspector Panel
**Subagent B:** StandingsPage umbauen
- Zwei-Spalten: Tabelle | TeamInspector
- Click-to-select Team → Inspector updated
- TeamInspector Desktop-Mode (kein Overlay)

### Phase 3: GlobalPage Podium + Leaderboard
**Subagent C:** GlobalPage verfeinern
- Podium horizontal (Top 3)
- Leaderboard-Tabelle mit sticky header
- GlassSurface-Container

### Phase 4: LeaguePage Split + ProfilePage Grid
**Subagent D:** LeaguePage + ProfilePage
- LeaguePage: Tabelle | Chat
- ProfilePage: Grid-Layout

### Phase 5: Integration & Polish
- Alle Pages zusammen testen
- GlassSurface-Konsistenz
- Build + TypeScript-Check

---

## Verifikation

```bash
cd ~/Projekte/fussball-tipprunde
npx tsc --noEmit        # TypeScript
npm run build           # Build
# Mobile: npm run dev → iPhone-Viewport → unverändert
# Desktop: npm run dev → 1440px+ → neues Layout
```

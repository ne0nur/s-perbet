# SüperBET UX & Performance Optimierung — Implementation Plan

> **Für Hermes:** Tasks nacheinander ausführen. Commit nach jeder Task.

**Goal:** 14 UX/Performance-Optimierungen + PWA Tab-Wechsel-Fix umsetzen

**Tech Stack:** React 19, Vite, Tailwind 4, Zustand, Supabase, vite-plugin-pwa

---

## Task 1: Badge-Counter auf PWA-Icon bei neuen Ergebnissen

**Objective:** Wenn Matches von `live` → `finished` wechseln, zeige einen Badge-Counter auf dem App-Icon

**Files:**
- Modify: `src/stores/matchStore.ts` — im `starteLiveMatchPoll` nach dem match-update
- Modify: `src/custom-sw.js` — Badge-Handling ist client-seitig, nicht im SW

**Step 1: Badge-Logic in matchStore.ts einbauen**

Im `starteLiveMatchPoll()`, nachdem neue Matches gefetched wurden und bevor das State-Update kommt:

```ts
// Nach dem erfolgreichen Fetch der Live-Matches:
const prevFinishedIds = new Set(
  get().matches.filter(m => m.status === 'finished').map(m => m.id)
)
// Nach dem Merge:
const newlyFinished = freshMatches.filter(
  m => m.status === 'finished' && !prevFinishedIds.has(m.id)
)
if (newlyFinished.length > 0 && 'setAppBadge' in navigator) {
  // Gesamtanzahl neu beendeter Spiele als Badge
  const currentBadge = (await navigator.getAppBadge?.()) ?? 0
  await (navigator as any).setAppBadge?.(currentBadge + newlyFinished.length)
}
```

**Step 2: Badge beim Öffnen der App clearen**

In `DashboardPage.tsx` beim Mount:

```ts
useEffect(() => {
  if ('clearAppBadge' in navigator) {
    (navigator as any).clearAppBadge?.()
  }
}, [])
```

**Step 3: Build & Commit**

```bash
npm run build && git add -A && git commit -m "feat: PWA badge counter for newly finished matches"
```

---

## Task 2: Pull-to-Refresh im Dashboard

**Objective:** Wisch-Geste auf Mobile zum manuellen Aktualisieren der Spiele

**Files:**
- Modify: `src/pages/DashboardPage.tsx` — Pull-to-Refresh-Wrapper
- Create: `src/components/ui/PullToRefresh.tsx`

**Step 1: PullToRefresh-Komponente bauen**

```tsx
// src/components/ui/PullToRefresh.tsx
import { useState, useRef, useCallback, type ReactNode } from 'react'

interface Props {
  onRefresh: () => Promise<void>
  children: ReactNode
}

export function PullToRefresh({ onRefresh, children }: Props) {
  const [refreshing, setRefreshing] = useState(false)
  const touchStartY = useRef(0)
  const [pullDistance, setPullDistance] = useState(0)
  const THRESHOLD = 80

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (window.scrollY === 0) touchStartY.current = e.touches[0].clientY
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (window.scrollY === 0 && touchStartY.current > 0) {
      const dist = Math.max(0, e.touches[0].clientY - touchStartY.current)
      setPullDistance(Math.min(dist * 0.5, 120))
    }
  }, [])

  const handleTouchEnd = useCallback(async () => {
    if (pullDistance > THRESHOLD && !refreshing) {
      setRefreshing(true)
      try { await onRefresh() } finally {
        setRefreshing(false)
        setPullDistance(0)
        touchStartY.current = 0
      }
    } else {
      setPullDistance(0)
      touchStartY.current = 0
    }
  }, [pullDistance, refreshing, onRefresh])

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="min-h-full"
    >
      {/* Pull Indicator */}
      <div
        className="flex justify-center transition-all duration-200"
        style={{ height: pullDistance, opacity: pullDistance / THRESHOLD }}
      >
        <div className={`mt-2 w-6 h-6 border-2 border-primary-fixed-dim border-t-transparent rounded-full ${refreshing ? 'animate-spin' : ''}`} />
      </div>
      {children}
    </div>
  )
}
```

**Step 2: In DashboardPage einbauen**

```tsx
// DashboardPage.tsx — Wrapper um die Scroll-Area
import { PullToRefresh } from '../components/ui/PullToRefresh'

const handleManualRefresh = async () => {
  await useMatchStore.getState().ladeMatches(
    useMatchStore.getState().selectedTournament,
    useMatchStore.getState().aktuellerSpieltag
  )
}

return (
  <PullToRefresh onRefresh={handleManualRefresh}>
    <div className="overflow-y-auto ...">
      {/* existing dashboard content */}
    </div>
  </PullToRefresh>
)
```

**Step 3: Build & Commit**

```bash
npm run build && git add -A && git commit -m "feat: pull-to-refresh on dashboard"
```

---

## Task 3: Persistent Offline-Banner (kein Toast)

**Objective:** Wenn offline → persistentes Banner am oberen Rand, kein flüchtiger Toast

**Files:**
- Modify: `src/App.tsx` — Offline-Listener → Banner-State
- Modify: `src/components/AppShell.tsx` — Banner-Rendering
- Remove: Toast-Calls in `src/App.tsx:80-85`

**Step 1: Banner in AppShell einbauen**

```tsx
// In AppShell.tsx, direkt unter dem Header:
const isOnline = useNetworkStore(s => s.isOnline)

{!isOnline && (
  <div className="sticky top-0 z-[60] bg-red-500/90 backdrop-blur-sm text-white text-[11px] font-mono font-bold text-center py-2 px-4 flex items-center justify-center gap-2">
    <WifiOff size={14} />
    <span>{t('offlineWarning')}</span>
  </div>
)}
```

**Step 2: Toast-Calls aus App.tsx entfernen**

```tsx
// App.tsx — Online/Offline-Handler vereinfachen:
const handleOnline = () => useNetworkStore.getState().setIsOnline(true)
const handleOffline = () => useNetworkStore.getState().setIsOnline(false)
// Entferne: useToastStore.getState().toast(...)
```

**Step 3: Build & Commit**

```bash
npm run build && git add -A && git commit -m "fix: persistent offline banner instead of toast"
```

---

## Task 4: Empty States mit Illustration + Call-to-Action

**Objective:** Leere Zustände (keine Spiele, keine Liga, keine Tipps) visuell aufwerten

**Files:**
- Create: `src/components/ui/EmptyState.tsx`
- Modify: `src/pages/DashboardPage.tsx`
- Modify: `src/pages/LeaguePage.tsx`
- Modify: `src/pages/GlobalPage.tsx`
- Modify: `src/utils/translations.ts`

**Step 1: EmptyState-Komponente**

```tsx
// src/components/ui/EmptyState.tsx
import type { ReactNode } from 'react'
import { motion } from 'framer-motion'

interface Props {
  icon: ReactNode
  title: string
  description: string
  action?: { label: string; onClick: () => void }
}

export function EmptyState({ icon, title, description, action }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 px-6 text-center"
    >
      <div className="w-16 h-16 rounded-2xl bg-surface-container flex items-center justify-center mb-4 text-on-surface-variant/40">
        {icon}
      </div>
      <h3 className="text-sm font-bold text-on-surface mb-1.5">{title}</h3>
      <p className="text-xs text-on-surface-variant/60 max-w-[240px] leading-relaxed mb-4">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="px-5 py-2.5 bg-primary/10 border border-primary/20 rounded-xl text-primary-fixed-dim text-xs font-bold font-mono hover:bg-primary/15 transition-colors cursor-pointer"
        >
          {action.label}
        </button>
      )}
    </motion.div>
  )
}
```

**Step 2: Übersetzungen hinzufügen**

In `src/utils/translations.ts` für alle 3 Sprachen:
```ts
emptyNoMatches: 'Keine Spiele in dieser Phase',
emptyNoMatchesDesc: 'Sobald der Spielplan veröffentlicht ist, erscheinen hier die Spiele.',
emptyNoLeagues: 'Noch keine Liga',
emptyNoLeaguesDesc: 'Erstelle eine Liga und lade deine Freunde ein!',
emptyCreateLeague: 'Liga erstellen',
emptyNoTips: 'Noch keine Tipps abgegeben',
```

**Step 3: In DashboardPage einbauen**

```tsx
{matches.length === 0 && !isLaden && (
  <EmptyState
    icon={<Trophy size={28} />}
    title={t('emptyNoMatches')}
    description={t('emptyNoMatchesDesc')}
  />
)}
```

**Step 4: Build & Commit**

```bash
npm run build && git add -A && git commit -m "feat: empty states with illustrations and CTAs"
```

---

## Task 5: `loading="lazy"` auf Team-Logos

**Objective:** Team-Logos außerhalb des Viewports nicht sofort laden → bessere Ladezeit

**Files:**
- Modify: `src/components/MatchCard.tsx`
- Modify: `src/pages/StandingsPage.tsx`
- Modify: `src/pages/LeaguePage.tsx`
- Modify: `src/pages/GlobalPage.tsx`

**Step 1: In allen Logo-Img-Tags `loading="lazy"` hinzufügen**

Systematisch in allen Dateien nach `<img` suchen und `loading="lazy"` ergänzen:

```tsx
// Vorher:
<img src={getTeamLogo(team)} alt={team} className="w-8 h-8" />

// Nachher:
<img src={getTeamLogo(team)} alt={team} className="w-8 h-8" loading="lazy" />
```

**Step 2: Build & Commit**

```bash
npm run build && git add -A && git commit -m "perf: lazy loading for team logos"
```

---

## Task 6: Auto-Save Tipps nach jeder Änderung (Debounce)

**Objective:** Tipp wird 1.5s nach letzter Änderung automatisch gespeichert — kein Save-Button nötig

**Files:**
- Modify: `src/components/MatchCard.tsx` — Debounce-Logik
- Modify: `src/utils/translations.ts` — "Tipp gespeichert" Toast

**Step 1: Debounce-Hook in MatchCard**

```tsx
// In MatchCard.tsx, useRef für Timer:
const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

const debouncedSave = (heim: number, gast: number, matchId: string) => {
  if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
  saveTimerRef.current = setTimeout(async () => {
    try {
      await useTipStore.getState().tippSpeichern(matchId, heim, gast)
      useToastStore.getState().toast(t('tipsSavedSuccess'), 'success')
    } catch (e) {
      // silent — user kann manuell speichern
    }
  }, 1500)
}
```

**Step 2: Stepper onChange → debouncedSave aufrufen**

```tsx
// Im Stepper onChange:
const handleHeimChange = (v: number) => {
  setHeimTipp(v)
  if (!istUpcoming) return
  debouncedSave(v, gastTipp, match.id)
}
```

**Step 3: Cleanup im useEffect**

```tsx
useEffect(() => {
  return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current) }
}, [])
```

**Step 4: Build & Commit**

```bash
npm run build && git add -A && git commit -m "feat: auto-save tips with 1.5s debounce"
```

---

## Task 7: Desktop-Navigations-Buttons (statt Tastatur)

**Objective:** Pfeil-Buttons für Spieltag/Turnier-Navigation auf Desktop

**Files:**
- Modify: `src/pages/DashboardPage.tsx` — Prev/Next Buttons
- Modify: `src/pages/StandingsPage.tsx` — Prev/Next Buttons

**Step 1: Navigations-Pfeile in DashboardPage**

```tsx
{/* Spieltag-Navigation Pfeile auf Desktop */}
<div className="hidden md:flex items-center gap-1">
  <button
    onClick={() => setAktuellerSpieltag(s => Math.max(1, s - 1))}
    className="p-1.5 rounded-lg hover:bg-surface-container transition-colors cursor-pointer"
  >
    <ChevronLeft size={18} className="text-on-surface-variant" />
  </button>
  <span className="text-xs font-mono font-bold text-on-surface min-w-[60px] text-center">
    {getPhaseLabel(aktuellerSpieltag, selectedTournament)}
  </span>
  <button
    onClick={() => setAktuellerSpieltag(s => s + 1)}
    className="p-1.5 rounded-lg hover:bg-surface-container transition-colors cursor-pointer"
  >
    <ChevronRight size={18} className="text-on-surface-variant" />
  </button>
</div>
```

**Step 2: Build & Commit**

```bash
npm run build && git add -A && git commit -m "feat: desktop prev/next navigation buttons"
```

---

## Task 8: Bundle Splitting — AchievementsSection & Seiten lazy-loaden

**Objective:** `AchievementsSection` (377KB) und schwere Seiten aus dem Main-Bundle auslagern

**Files:**
- Modify: `src/pages/ProfilePage.tsx` — `React.lazy()` für AchievementsSection
- Modify: `src/App.tsx` — Seiten auf `React.lazy()` umstellen wo noch nicht

**Step 1: AchievementsSection lazy-loaden**

```tsx
// In ProfilePage.tsx:
const AchievementsSection = React.lazy(() => import('../components/profile/AchievementsSection'))

// Beim Rendern:
<Suspense fallback={<div className="animate-pulse bg-surface-container rounded-xl h-48" />}>
  <AchievementsSection ... />
</Suspense>
```

**Step 2: Prüfen welche Seiten noch nicht lazy sind**

```bash
rg "React.lazy|import.*Page" src/App.tsx
```

Falls GlobalPage, LeaguePage, StandingsPage nicht lazy sind → umstellen.

**Step 3: Build & Commit**

```bash
npm run build && git add -A && git commit -m "perf: lazy-load AchievementsSection and heavy pages"
```

---

## Task 9: Bild-Optimierung (WebP-Support, srcset)

**Objective:** Team-Logos in WebP konvertieren, responsive `srcset` für verschiedene Auflösungen

**Files:**
- Create: `scripts/convert-logos-webp.sh`
- Modify: `public/logos/` — WebP-Versionen hinzufügen
- Modify: `src/lib/teamLogos.ts` — WebP-Pfade + srcset

**Step 1: WebP-Konvertierungsskript**

```bash
#!/bin/bash
# scripts/convert-logos-webp.sh
for f in public/logos/*.png; do
  base=$(basename "$f" .png)
  cwebp -q 80 "$f" -o "public/logos/${base}.webp"
done
```

**Step 2: teamLogos.ts aktualisieren**

```ts
export function getTeamLogo(team: string, size: 'sm' | 'md' = 'md'): string {
  const normalized = normalizeName(team)
  const base = `/s-perbet/logos/${normalized}`
  // Versuche WebP, falle zurück auf PNG
  return `${base}.webp` // Browser handled fallback via <picture> oder onError
}
```

**Step 3: Build & Commit**

```bash
npm run build && git add -A && git commit -m "perf: webp team logos with srcset"
```

---

## Task 10: Supabase Queries bündeln (Promise.all)

**Objective:** Mehrere Supabase-Calls parallelisieren statt sequentiell

**Files:**
- Modify: `src/stores/matchStore.ts`
- Modify: `src/pages/DashboardPage.tsx`

**Step 1: matchStore.ladeMatches() parallelisieren**

```ts
const [matchResult, settingsResult] = await Promise.all([
  supabase.from('matches').select('*').eq('tournament', tournament).eq('spieltag', spieltag),
  supabase.from('app_settings').select('key,value').in('key', ['last_sync', 'sync_label', 'tipps_freigeschaltet']),
])
```

**Step 2: DashboardPage initial load bündeln**

```ts
const [matches, tips, tournaments] = await Promise.all([
  matchStore.ladeMatches(tournament, spieltag),
  tipStore.ladeTipps(),
  tournamentStore.ladeTournaments(),
])
```

**Step 3: Build & Commit**

```bash
npm run build && git add -A && git commit -m "perf: parallelize supabase queries with Promise.all"
```

---

## Task 11: PWA Tab-Wechsel-Refresh fixen

**Objective:** App soll beim Tab-Wechsel NICHT refreshen. Ursache: `registerType: 'autoUpdate'` + Service Worker `skipWaiting()` killt den aktuellen State.

**Files:**
- Modify: `vite.config.ts` — `registerType` ändern
- Modify: `src/custom-sw.js` — `skipWaiting()` entfernen
- Modify: `src/App.tsx` — Update-Flow anpassen

**Step 1: registerType auf 'prompt' ändern**

```ts
// vite.config.ts
VitePWA({
  registerType: 'prompt', // statt 'autoUpdate' — kein automatischer Reload
  // ... rest
})
```

**Step 2: skipWaiting() aus custom-sw.js entfernen**

```js
// src/custom-sw.js — ENTFERNE diese Zeilen:
// self.addEventListener('install', () => { self.skipWaiting() })
```

**Step 3: Update-Flow über den bestehenden Update-Button**

Die App hat bereits einen Update-Button in ProfilePage. Bei `registerType: 'prompt'` wird der neue SW installiert aber nicht aktiviert. Der User kann manuell über den Button updaten.

**Step 4: Build & Commit**

```bash
npm run build && git add -A && git commit -m "fix: prevent app refresh on tab switch (PWA prompt mode)"
```

---

## Final Step: Alles pushen & deployen

```bash
git push origin main
# CI deploy läuft automatisch
```

---

## Checklist

- [ ] Task 1: PWA Badge Counter
- [ ] Task 2: Pull-to-Refresh
- [ ] Task 3: Persistent Offline-Banner
- [ ] Task 4: Empty States
- [ ] Task 5: `loading="lazy"` Logos
- [ ] Task 6: Auto-Save Tipps (Debounce)
- [ ] Task 7: Desktop Nav-Buttons
- [ ] Task 8: Bundle Splitting
- [ ] Task 9: WebP Logos
- [ ] Task 10: Parallel Queries
- [ ] Task 11: Tab-Wechsel-Fix

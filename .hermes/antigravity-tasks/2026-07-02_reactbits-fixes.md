# SÜPERBET — Antigravity Task: ReactBits Integration Fix & Optimization

> **Für Google AI Studio (Gemini).** Dieses Dokument beschreibt ALLE ausstehenden Fixes
> und Optimierungen für die ReactBits-Komponenten in SüperBET.
> Lies das ganze Dokument, dann fang mit Task 1 an.

---

## PROJEKT-CONTEXT

- **Repo**: `~/Projekte/fussball-tipprunde`
- **Branch**: `main`
- **Stack**: React 19 · Vite · Tailwind CSS 4 · TypeScript · Zustand · framer-motion · THREE.js
- **Deploy**: `npm run build && npx gh-pages -d dist`
- **Theme-System**: `useThemeStore(s => s.theme)` → 5 Farben (default/blue/red/pink/teal). Hex via `THEME_PRIMARY` aus `src/lib/themeColors.ts`.
- **WICHTIG**: Mobile UNBERÜHRT lassen. Alle neuen Styles mit `md:` prefix oder `hidden md:block`/`md:hidden` wrappen. Mobile ist `iPhone` — primäres Device.

### Theme → Hex Mapping

| Theme | Primary Hex |
|---|---|
| default | `#f9bd22` (gold) |
| blue | `#60a5fa` |
| red | `#f87171` |
| pink | `#f472b6` |
| teal | `#2dd4bf` |

### Wichtige Dateien

| Datei | Zweck |
|---|---|
| `src/components/ui/ColorBends.tsx` | WebGL-Hintergrund (aktiv, Desktop+Mobile) |
| `src/components/ui/Dock.tsx` | macOS-Style Navigation (Desktop only) |
| `src/components/ui/Lightning.tsx` | WebGL-Blitz hinter PodiumBadge #1 |
| `src/components/ui/PodiumBadge.tsx` | Rang-Zahlen (1/2/3) mit Partikeln |
| `src/components/ui/GlassSurface.tsx` | Glas-Hintergrund für BottomNav |
| `src/components/BottomNav.tsx` | Mobile Navigation (5 Icons) |
| `src/components/AppShell.tsx` | App-Rahmen: Header, Dock, Content |
| `src/pages/GlobalPage.tsx` | Leaderboard mit Podium |
| `src/stores/themeStore.ts` | Theme-Store (default/blue/red/pink/teal) |
| `src/lib/themeColors.ts` | `THEME_PRIMARY`, `THEME_CONTAINER`, `hexToHue()`, `useAppColor()` |

---

## TASK 1: BottomNav JSX Fehler fixen ⚠️ KRITISCH

**Datei**: `src/components/BottomNav.tsx`

**Problem**: Zeile 33 enthält einen literal `\n` String im JSX — der Patch ist falsch gelaufen:

```tsx
// FALSCH (Zeile 33):
<div className="flex justify-center items-center h-[52px] px-1 relative">\n        {tabs.map(({

// RICHTIG:
<div className="flex justify-center items-center h-[52px] px-1 relative">
        {tabs.map(({
```

**Fix**: Entferne das `\n` und stelle die korrekte JSX-Struktur wieder her. Das `</GlassSurface>` muss das `</div>` umschließen. Die Struktur muss sein:

```tsx
<nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden select-none pb-3 pt-1 px-2">
  <GlassSurface blur={16} opacity={0.25} saturation={1.8} className="rounded-2xl">
    <div className="flex justify-center items-center h-[52px] px-1 relative">
      {tabs.map(({ to, icon: Icon, label }, index) => {
        // ...
      })}
    </div>
  </GlassSurface>
</nav>
```

---

## TASK 2: Lightning Blitz-Effekt — Rechteck statt Kreis, Position fixen

**Dateien**: `src/components/ui/Lightning.tsx`, `src/components/ui/PodiumBadge.tsx`

**Problem 1**: Lightning Canvas hat `rounded-full overflow-hidden` → schneidet den Blitz als Kreis ab. Der Blitz soll RECHTECKIG hinter der Zahl sein.

**Problem 2**: Der Blitz soll breiter sichtbar sein und hinter der Podium-Zahl (nicht drüber) liegen.

### Fix Lightning.tsx (Zeile ~192):

```tsx
// FALSCH:
<canvas
  ref={canvasRef}
  className="absolute inset-0 w-full h-full rounded-full overflow-hidden"
  style={{ opacity: 0.85 }}
/>

// RICHTIG:
<canvas
  ref={canvasRef}
  className="absolute inset-0 w-full h-full"
  style={{ opacity: 0.85 }}
/>
```

### Fix PodiumBadge.tsx (Zeile ~84-88):

Der Lightning-Container soll das ganze PodiumBadge-Div ausfüllen (kein overflow-hidden nötig):

```tsx
{config.lightning && (
  <div className="absolute inset-0 z-0" style={{ borderRadius: 'inherit' }}>
    <Lightning hue={lightningHue} speed={0.5} intensity={0.7} size={2.5} />
  </div>
)}
```

Der `inset` sollte `0` sein (nicht `-8px`) damit der Blitz genau im Container sitzt.

---

## TASK 3: ReactBits Komponenten korrekt einbinden

Die folgenden Komponenten sind bereits im Codebase aber nicht/nicht richtig in den Pages verwendet.
Binde sie in die entsprechenden Views ein — IMMER mit `md:` Breakpoints, Mobile unberührt.

### 3A. GlareHover auf MatchCards (Desktop)

`src/components/ui/GlareHover.tsx` existiert bereits. Umschließe die MatchCard-Komponente
in `src/components/MatchCard.tsx` mit GlareHover auf Desktop:

```tsx
// In MatchCard.tsx, um das äußerste div:
import GlareHover from './ui/GlareHover'

// Im Return:
<GlareHover className="md:block hidden" color={themeColor}>
  {/* bestehendes MatchCard JSX */}
</GlareHover>
// Fallback ohne Glare auf Mobile:
<div className="md:hidden">
  {/* bestehendes MatchCard JSX */}
</div>
```

Theme-Color für GlareHover: `THEME_PRIMARY[useThemeStore(s => s.theme)]`.

### 3B. ShinyText für Seiten-Header (Desktop)

`src/components/ui/ShinyText.tsx` existiert bereits. Ersetze die simplen Text-Header
in folgenden Pages durch ShinyText auf Desktop:

- `DashboardPage.tsx` — Spieltag-Header
- `StandingsPage.tsx` — Tabellen-Header  
- `GlobalPage.tsx` — "Rangliste" Titel
- `LeaguePage.tsx` — Liga-Name
- `ProfilePage.tsx` — "Profil" Titel

```tsx
import ShinyText from '../components/ui/ShinyText'

// Desktop:
<div className="hidden md:block">
  <ShinyText text={t('games')} disabled={false} speed={3} className="text-lg font-black" />
</div>
// Mobile (unverändert):
<h1 className="md:hidden text-lg font-black">{t('games')}</h1>
```

### 3C. AnimatedList für Rangliste (Desktop)

`src/components/ui/AnimatedList.tsx` existiert bereits. Verwende es in `GlobalPage.tsx`
um die Leaderboard-Einträge gestaffelt einzublenden (nur Desktop):

```tsx
import { AnimatedList } from '../components/ui/AnimatedList'

// In GlobalPage, ersetze das .map() der Tabellenzeilen:
<AnimatedList className="hidden md:block" delay={0.05}>
  {rest.map((entry) => (
    <div key={entry.id}>{/* Tabellenzeile */}</div>
  ))}
</AnimatedList>
// Mobile: normales .map() ohne Animation
```

### 3D. Desktop Content Cards mit GlassSurface umschließen

Verwende `GlassSurface` (bereits in `src/components/ui/GlassSurface.tsx`) um die
Content-Container auf Desktop mit einem Glas-Effekt zu versehen:

In `AppShell.tsx` im Haupt-Content-Bereich (~Zeile 479):

```tsx
<div className="flex-1 flex flex-col min-h-0 md:max-w-7xl md:mx-auto md:w-full md:px-4 native-scroll pb-28 md:pb-28">
  {/* Desktop: Glas-Container um den Content */}
  <div className="hidden md:block">
    <GlassSurface blur={12} opacity={0.15} saturation={1.2} className="rounded-2xl p-4">
      <AnimatedOutlet />
    </GlassSurface>
  </div>
  {/* Mobile: unverändert */}
  <div className="md:hidden">
    <AnimatedOutlet />
  </div>
</div>
```

---

## TASK 4: Desktop Layout optimieren

### 4A. Dock-Größe anpassen

In `AppShell.tsx` (~Zeile 485), das Dock soll größer und prominenter sein:

```tsx
<Dock
  items={dockItems}
  magnification={72}
  distance={200}
  baseItemSize={52}
/>
```

### 4B. Desktop Header prominent

Der Desktop Header ist aktuell `h-16`. Mach ihn `h-18` (72px) mit mehr Padding:

```tsx
<header className="hidden md:flex items-center justify-between px-10 h-18 shrink-0 relative z-20 border-b border-white/[0.04] backdrop-blur-md">
```

Und das Logo etwas größer:

```tsx
<span className="text-base font-black text-on-surface tracking-tight leading-none">
  SÜPER<span className="text-primary-fixed-dim">BET</span>
</span>
```

---

## TASK 5: Theme-Farben Konsistenz prüfen

Stelle sicher, dass ALLE neuen Komponenten die Theme-Farbe verwenden:

- **GlareHover**: `color={THEME_PRIMARY[theme]}`
- **ShinyText**: verwendet automatisch `--primary-fixed-dim` via CSS
- **Dock active item**: bereits `var(--primary-fixed-dim)` in Dock.css
- **ColorBends**: bereits Theme-aware via `colorBendsColors`
- **Lightning**: `hue={lightningHue}` = `hexToHue(primaryColor) + 15`

Niemals `#f9bd22` hart codieren!

---

## BUILD & DEPLOY

```bash
cd ~/Projekte/fussball-tipprunde
npm run build              # tsc --noEmit + vite build
npx gh-pages -d dist       # deploy
```

Vor jedem Commit: `git add -A && git commit -m "..." && git push`

---

## REIHENFOLGE

1. **Task 1** (BottomNav Fix) — KRITISCH, App rendert sonst nicht
2. **Task 2** (Lightning Fix) 
3. **Task 3** (ReactBits einbinden)
4. **Task 4** (Layout)
5. **Task 5** (Theme prüfen)
6. Build + Deploy

# Desktop Redesign: SüperBET — Modern 2026 (v2)

> **Für Hermes:** Mobile UNBERÜHRT lassen. Nur `md:` Breakpoints. **App-Farbe = dynamisch aus `data-theme` / `useThemeStore`.** Alle reactbits-Komponenten via `src/components/ui/`.

**Goal:** Desktop-Ansicht auf modernes 2026-Niveau heben mit reactbits.dev-Komponenten. Mobile bleibt exakt wie jetzt. Sämtliche Farben respektieren die vom User in der Profil-Seite gewählte App-Farbe (Theme-Picker: default/blue/red/pink/teal).

**Architecture:** 5 neue UI-Komponenten aus reactbits.dev + Layout-Anpassungen im AppShell. Keine neuen npm-Dependencies (alles CSS + framer-motion). **Alle Farben via Tailwind-Utility-Klassen (`primary-fixed-dim`, `primary-container` etc.), die automatisch auf `data-theme` reagieren.** Für Props mit explizitem Farb-Hex: `useThemeStore` + Theme→Hex-Map.

**Theme → Farbe Mapping** (Quelle: `src/stores/themeStore.ts` + `src/index.css`):
| Theme | `--primary-fixed-dim` | `--primary-container` |
|---|---|---|
| default | `#f9bd22` (gold) | `#fbbf24` |
| blue | `#60a5fa` | `#3b82f6` |
| red | `#f87171` | `#ef4444` |
| pink | `#f472b6` | `#ec4899` |
| teal | `#2dd4bf` | `#14b8a6` |

**Key-Constraint:** Hartes Hex (`#f9bd22`) kommt NIRGENDS in neuem Code vor. Immer: Tailwind-Klasse ODER `useThemeStore().theme` auflösen.

---

## Phase 1: Sidebar → Dock (höchste Priorität)

### Task 1: Dock-Komponente von reactbits holen + Theme-kompatibel machen

**Objective:** Animated macOS-style icon dock als Desktop-Navigation, farblich vom Theme abhängig

**Files:**
- Create: `src/components/ui/Dock.tsx`
- Create: `src/components/ui/Dock.css`
- Modify: `src/components/AppShell.tsx` (sidebar ersetzen)

**Step 1: Dock.tsx von GitHub laden & adaptieren**

Quelle: `https://raw.githubusercontent.com/DavidHDev/react-bits/main/src/ts-default/Components/Dock/Dock.tsx`

Adaptierungen:
- Props: `items: { icon: ReactNode; label: string; to: string }[]`
- Navigation via `useNavigate()` + `useLocation()` für active detection
- **KEINE harten Farben** — aktives Item bekommt `text-primary-fixed-dim` und `border-primary-container`
- CSS-Variablen für Hintergrund: `var(--color-surface)`
- `md:flex` (Desktop only)

**Step 2: Dock.css von GitHub laden & themen-kompatibel machen**

Quelle: `https://raw.githubusercontent.com/DavidHDev/react-bits/main/src/ts-default/Components/Dock/Dock.css`

- Hintergrund: `var(--color-surface-container)` mit `backdrop-blur-xl`
- Aktive-Indikator: **Farbe aus Tailwind `bg-primary-container/20`**
- Glow: `box-shadow: 0 0 12px var(--primary-fixed-dim)` — liest automatisch Theme
- Labels: `font-mono uppercase text-[9px] tracking-wider`
- Kein hartes Hex!

**Step 3: AppShell.tsx — Sidebar durch Dock ersetzen**

Im `aside`:
- Oberer Bereich: HeaderLogo + `<Dock items={dockItems} />`
- `dockItems`: `{ icon: <Trophy size={24} />, label: t('games'), to: '/dashboard' }` etc.
- Icons: Lucide-Icons aus vorhandenem Import

**Step 4: Mobile BottomNav unverändert lassen**

BottomNav bleibt EXAKT wie jetzt. Keine Änderung.

---

## Phase 2: ShinyText — Dynamische Theme-Header

### Task 2: ShinyText-Komponente mit Theme-Unterstützung

**Objective:** Gleamende Textanimation in der aktuellen App-Farbe

**Files:**
- Create: `src/components/ui/ShinyText.tsx`
- Create: `src/components/ui/ShinyText.css`
- Modify: Alle Page-Header (`src/pages/*.tsx`)

**Step 1: ShinyText.tsx + .css von GitHub**

Quelle: `https://raw.githubusercontent.com/DavidHDev/react-bits/main/src/ts-default/TextAnimations/ShinyText/ShinyText.tsx`

Adaptieren:
- `color`-Prop: **default liest `useThemeStore().theme`** und mappt:
  ```ts
  const THEME_COLORS: Record<AppTheme, string> = {
    default: '#f9bd22', blue: '#60a5fa', red: '#f87171', pink: '#f472b6', teal: '#2dd4bf'
  }
  ```
- Alternativ: CSS-Variable inline: `style={{ color: 'var(--primary-fixed-dim)' }}`
- `speed={3}` (langsam, elegant)
- Nur auf `md:` sichtbar

**Step 2: Header in Pages ersetzen**

Jede Page kriegt:
```tsx
<div className="hidden md:block">
  <ShinyText text={t('dashboardTitle')} speed={3} />
</div>
```

---

## Phase 3: GlareHover + GlassSurface — Card-Effekte

### Task 3: GlareHover — Theme-kompatibler Glanz-Hover

**Objective:** Mouse-following glare auf Desktop-Cards, Farbe aus Theme

**Files:**
- Create: `src/components/ui/GlareHover.tsx`
- Create: `src/components/ui/GlareHover.css`
- Modify: `src/components/MatchCard.tsx`

**Step 1: GlareHover von GitHub**

Quelle: `https://raw.githubusercontent.com/DavidHDev/react-bits/main/src/ts-default/Animations/GlareHover/GlareHover.tsx`

- Reines CSS, kein JS
- Glare-Farbe: **`var(--primary-fixed-dim)` mit opacity 0.12** — liest automatisch Theme
- Nur Desktop: `hidden md:block` wrapper oder `md:` prefix

**Step 2: In MatchCard integrieren**

MatchCard auf Desktop mit GlareHover wrappen. Mobile: kein Wrapper.

### Task 4: GlassSurface — Theme-Glasmorphism

**Objective:** Premium-Glas-Container mit Theme-Farb-Akzent

**Files:**
- Create: `src/components/ui/GlassSurface.tsx`
- Create: `src/components/ui/GlassSurface.css`

**Step 1: GlassSurface von GitHub**

Quelle: `https://raw.githubusercontent.com/DavidHDev/react-bits/main/src/ts-default/Components/GlassSurface/GlassSurface.tsx`

- Hintergrund: `var(--color-surface-container-low)` mit opacity
- Border: `var(--color-outline-variant)` — Theme-abhängig
- Kein hartes Hex

**Step 2: In Pages anwenden (Dashboard, Global, League)**

Content-Sektionen mit `<GlassSurface>` wrappen.

---

## Phase 4: AnimatedList — Leaderboard

### Task 5: AnimatedList mit Theme

**Objective:** Staggered Entry-Animation für Ranking, Farben aus Theme

**Files:**
- Create: `src/components/ui/AnimatedList.tsx`
- Create: `src/components/ui/AnimatedList.css`
- Modify: `src/pages/GlobalPage.tsx`

**Step 1: AnimatedList von GitHub**

Quelle: `https://raw.githubusercontent.com/DavidHDev/react-bits/main/src/ts-default/Components/AnimatedList/AnimatedList.tsx`

Uses framer-motion (bereits installiert). Keine Farb-Logik nötig — nur Animation.

**Step 2: In GlobalPage anwenden (Desktop only)**

---

## Phase 5: Layout + Mobile Plasma-Fix

### Task 6: Desktop Layout-Fixes

**Objective:** Grid-Layout, Max-Width, Spalten-Verteilung

**Files:**
- Modify: `src/components/AppShell.tsx`
- Modify: `src/pages/DashboardPage.tsx`
- Modify: `src/pages/GlobalPage.tsx`

- Main-Content `max-w-[1200px]` zentriert
- Dashboard: 3-spaltiges Grid (`md:grid-cols-3`) für Match-Cards
- GlobalPage: Podium + Tabelle nebeneinander

### Task 7: Plasma — Mobile Theme-Fix + Desktop-Tuning

**Objective:** Plasma-Hintergrund auf Mobile korrekt nach Theme-Farbe, Desktop etwas intensiver

**Files:**
- Modify: `src/components/AppShell.tsx`

**Problem:** Aktuell liest Plasma `--primary-fixed-dim` per `getComputedStyle()` im `useEffect`. Das funktioniert beim Initial-Load, aber **wenn der User das Theme wechselt, aktualisiert Plasma nicht** — weil `useEffect([], [])` nur einmal läuft.

**Fix:**
```tsx
const theme = useThemeStore(s => s.theme)
const THEME_HEX: Record<AppTheme, string> = {
  default: '#f9bd22', blue: '#60a5fa', red: '#f87171', pink: '#f472b6', teal: '#2dd4bf'
}
const plasmaColor = THEME_HEX[theme]

// Desktop: etwas mehr Sichtbarkeit
const plasmaOpacity = window.innerWidth >= 768 ? 0.15 : 0.10
```

Plasma-Komponente selbst ändern: `color`-Prop Änderung triggert Re-Mount (useEffect dependency `[color, ...]`), also wird die Farbe korrekt aktualisiert.

**Desktop:** `opacity={0.15}`, `speed={0.35}`, `scale={1.5}`

---

## Phase 6: Theme-Integration finalisieren

### Task 8: Theme-Hook + Utility

**Objective:** Zentraler Hook für Theme→Hex-Mapping

**Files:**
- Create: `src/lib/themeColors.ts`
- Modify: Alle neuen Komponenten

```ts
// src/lib/themeColors.ts
import { useThemeStore, type AppTheme } from '../stores/themeStore'

export const THEME_PRIMARY: Record<AppTheme, string> = {
  default: '#f9bd22', blue: '#60a5fa', red: '#f87171', pink: '#f472b6', teal: '#2dd4bf'
}
export const THEME_CONTAINER: Record<AppTheme, string> = {
  default: '#fbbf24', blue: '#3b82f6', red: '#ef4444', pink: '#ec4899', teal: '#14b8a6'
}

export function useAppColor(): string {
  return THEME_PRIMARY[useThemeStore(s => s.theme)]
}
```

Alle Komponenten, die eine Hex-Farbe brauchen, nutzen `useAppColor()`.

---

## Ablauf & Commits

1. Task 8 (Theme-Utility) → Commit
2. Task 1 (Dock) → Commit
3. Task 2 (ShinyText) → Commit
4. Task 3+4 (GlareHover + GlassSurface) → Commit
5. Task 5 (AnimatedList) → Commit
6. Task 6 (Layout) → Commit
7. Task 7 (Plasma-Fix) → Commit

Nach jedem Commit: `npx tsc --noEmit` verifizieren.

---

## Risiken

- **Theme-Wechsel zur Laufzeit**: ShinyText mit statischem `color`-Prop updated nicht beim Theme-Wechsel. Fix: `color`-Prop als State, der auf `theme` reagiert.
- **Dock Performance**: Dock berechnet Mausabstand in Echtzeit. Auf langsamen Rechnern `throttle` oder `passive` Event-Listener.
- **Mobile UNBERÜHRT**: Alle neuen Komponenten NUR mit `md:` oder `hidden md:block`. BottomNav unverändert.

---

## Verifikation

```bash
cd ~/Projekte/fussball-tipprunde
# Theme-Wechsel testen: alle 5 Farben im Profil durchschalten
npx tsc --noEmit
npm run build
npx gh-pages -d dist
git push origin main
```

# GooeyNav + Plasma Hintergrund

> **Hermes:** plan + superbet-development geladen.

**Goal:** BottomNav durch reactbits.dev GooeyNav ersetzen + Plasma-WebGL-Hintergrund.

**Architecture:** Zwei neue Komponenten, BottomNav ersetzt, App-Root mit Plasma-Canvas.

---

## Task 1: GooeyNav-Komponente adaptieren

**Files:**
- Create: `src/components/ui/GooeyNav.tsx`
- Create: `src/components/ui/GooeyNav.css`
- Modify: `src/components/AppShell.tsx` (BottomNav ersetzen)

**Adaptierungen an SüperBET:**
- Items: 5 Nav-Items (Spiele, Tabelle, Bonus, Liga, Profil)
- Farben: `--color-1` bis `--color-4` auf App-Farbpalette mappen
- Active-State: Lüttable via `useLocation()` statt `<a href>`
- Position: Fixiert am unteren Bildschirmrand (pb-safe)
- Schrift: Monr oder System-Font
- Animation: Partikel-Farben = Gold/Amber-Töne

## Task 2: Plasma-Hintergrund

**Files:**
- Create: `src/components/ui/Plasma.tsx`
- Create: `src/components/ui/Plasma.css`
- Modify: `src/index.css` (Body-Background entfernen/überschreiben)
- Modify: `src/App.tsx` (Plasma-Canvas als fixed Background)

**Adaptierungen:**
- `color1="#F2C94C"` (Gold) statt default
- `color2="#1E293B"` (Slate) als Sekundärfarbe
- Opacity reduzieren für Dark-Theme-Kompatibilität
- Canvas hinter allen Inhalten, fixed, `z-index: -1`
- Performance: ggf. `devicePixelRatio` auf 1 begrenzen für Mobile

## Task 3: Build, Commit, Deploy

---

**⚠️ Performance-Warnung:** Beide Komponenten nutzen WebGL. Auf Mobile könnten 2 WebGL-Canvas gleichzeitig ruckeln. Fallback-Strategie: Plasma nur auf Desktop (>768px), auf Mobile stattdessen CSS-Gradient.

**Farb-Adaption:**
- Nav-Partikel: `#F2C94C` (Gold), `#E67E22` (Amber), `#1E293B` (Slate), `#F2994A` (Orange)
- Plasma: Gold/Slate-Mix, dunkel genug für Dark-Theme

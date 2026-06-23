# 🎨 Design System — SüperBET v2

Dieses Dokument definiert das verbindliche Design-System für **SüperBET**. Alle UI-Komponenten und Layouts müssen sich strikt an diese Spezifikationen halten.

---

## 🌌 1. Vision & Vibe

- **Mobile-First:** Die Anwendung ist primär für die Nutzung auf mobilen Endgeräten konzipiert (PWA-Fokus).
- **Flutlicht-Stadion Ästhetik:** Dunkle, tiefe Hintergründe kombiniert mit feinen, leuchtenden Linien und Glassmorphismus-Effekten, um die Atmosphäre eines nächtlichen Stadions unter Flutlicht zu erzeugen.
- **Modern & Premium:** Keine standardmäßigen Browser-Stile oder generische UI-Elemente. Feine Micro-Animations und ausgereiftes visuelles Feedback heben die App auf ein Premium-Niveau.

---

## 🎨 2. Farbpalette & Tokens

Definiert in [`src/index.css`](file:///home/ne0nur/Projekte/fussball-tipprunde/src/index.css) unter `@theme`:

### Surfaces & Backgrounds
- **Hintergrund (`--color-background`):** `#0e131f` (Deep Space / Pitch Black Navy)
- **Container / Cards (`--color-surface-container`):** `#1a202c`
- **Container (High / Active) (`--color-surface-container-high`):** `#242a36`
- **Text Hauptfarbe (`--color-on-surface`):** `#dde2f3` (Klares Weiß-Blau)
- **Text Nebenfarbe (`--color-on-surface-variant`):** `#d3c5ac` (Gedecktes Gold-Grau)

### Brand-Farben (Gold / Amber)
- **Primary Gold (`--color-primary`):** `#ffe1a7`
- **Gold-Container / Accent (`--color-primary-container`):** `#fbbf24`
- **On-Primary-Gold (`--color-on-primary`):** `#402d00`

### 🏆 Punkte-Feedback (Feedback-Farben)
Für Match-Cards nach Abpfiff und Punkte-Indikatoren:
- **🟢 Exakt (4 Punkte):** `Vibrant Green` (`#22c55e` / `rgb(34, 197, 94)`) -> Exaktes Ergebnis
- **🟡 Differenz (3 Punkte):** `Amber` (`#f59e0b` / `rgb(245, 158, 11)`) -> Richtige Differenz / Unentschieden
- **🔵 Tendenz (2 Punkte):** `Light Blue` (`#3b82f6` / `rgb(59, 130, 246)`) -> Richtige Tendenz (Sieg/Niederlage)
- **⚫ Falsch (0 Punkte):** `Slate/Gray` (`#64748b` / `rgb(100, 116, 139)`) -> Falscher Tipp

---

## ✍️ 3. Typografie

- **Body & Interface:** Geist Sans Font (`font-family: 'Geist', system-ui, sans-serif`)
- **Zahlen / Tipp-Inputs / Status:** JetBrains Mono (`font-family: 'JetBrains Mono', monospace`) für feste Breite und präzise Darstellung.

---

## ✨ 4. Komponenten & Glassmorphismus

- **Glass Panel (`.glass-panel`):**
  - Background: `rgba(30, 41, 59, 0.2)`
  - Backdrop-Filter: `blur(12px)`
  - Border: `1px solid rgba(255, 255, 255, 0.05)`
- **Glass Card (`.glass-card`):**
  - Leicht angehobene Cards mit sanftem Hover-Lifting (`.card-lift`)
- **Tipp-Inputs (`.tip-input`):**
  - Abgedunkelter Hintergrund mit goldenem Fokus-Ring und JetBrains Mono Ziffern.

---

## 🎮 5. Gamification: EXP-Balken & LVL-Badge Specs

Um den Vibe zu verstärken, wird im Header ein dauerhafter EXP-Fortschrittsbalken und ein Level-Badge integriert.

### 📐 Platzierung & Aufbau
- **Ort:** Header ([`AppShell.tsx`](file:///home/ne0nur/Projekte/fussball-tipprunde/src/components/AppShell.tsx)) direkt neben dem User-Avatar / Username.
- **Layout:** Level-Badge links (als Kreis/Hexagon mit Leuchteffekt), gefolgt von einem dünnen, horizontalen EXP-Fortschrittsbalken.

### 🎨 Aussehen & Animationen
- **EXP-Balken:**
  - Hintergrund: Dunkles Slate (`rgba(255,255,255,0.05)`)
  - Füllung: Linearer Verlauf von Gold zu Bernstein (`linear-gradient(90deg, #fbbf24, #f59e0b)`)
  - **Animation (Shimmer):** Ein weicher, heller Lichtstreif, der kontinuierlich über den gefüllten Balken läuft (CSS `@keyframes shimmer`).
- **LVL-Badge:**
  - Aussehen: Goldener Rand, dunkler Kern, weiße Ziffer.
  - **Animation (Glow Loop):** Ein pulsierender, goldener Schatteneffekt im Loop, der dem Badge ein "lebendiges" Leuchten verleiht (`@keyframes levelGlow`).

### 🧮 Logik & Berechnung
Da Supabase standardmäßig `total_points` speichert, nutzen wir folgende vereinfachte Formel für Level und EXP:
- **Punkte pro Level:** $10$ Punkte.
- **Level-Berechnung:** $Level = \lfloor total\_points / 10 \rfloor + 1$
- **EXP-Progress (Prozent):** $(total\_points \pmod{10}) \times 10\%$
  - *Beispiel:* Ein User hat 23 Punkte.
  - Level = $2 + 1 = 3$.
  - EXP = $3 \times 10 = 30\%$.

---

## 🎬 6. Animationen & Transitions (60 FPS)

- **Page Transitions:** Verwende `framer-motion` anstelle der einfachen CSS-Animationen in Haupt-Routenwechseln, um nahtlose, hardwarebeschleunigte Blenden und Slides zu garantieren.
- **Live-Spiele:** Haben eine dauerhaft pulsierende rote LED (`.live-dot`) für sofortige Orientierung.
- **Micro-Interactions:** Alle interaktiven Buttons reagieren mit einer leichten Skalierung nach unten beim Drücken (`.btn-press` / `active:scale-95`).

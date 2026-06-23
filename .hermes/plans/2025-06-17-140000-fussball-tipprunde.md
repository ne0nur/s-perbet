# Fußball-Tippspiel (Süper Lig) — Implementierungsplan

> **Für Hermes:** Tickets im Kanban-Board `tipprunde` abarbeiten. Jedes Ticket = ein Task.
> **Ziel:** Mobile-First Web-App für privates Fußball-Tippspiel mit 9 Views, Mock-Daten, vollautomatischer Punkteberechnung (später Supabase).
> **Architektur:** React 19 + Vite + TypeScript + Tailwind CSS 3.4 + Zustand + React Router + Framer Motion. Mock-Datenlayer via Zustand Stores. Supabase-Integration in Phase 2.
> **Tech Stack:** React 19, Vite, Tailwind CSS 3.4, Zustand, React Router v6, Framer Motion, date-fns, Lucide React Icons

---

## Design-System: "Flutlicht-Arena"

### Farbpalette
| Token | Hex | Verwendung |
|-------|-----|------------|
| `bg-deep-navy` | `#0A0E27` | Haupt-Hintergrund |
| `bg-slate-900` | `#0F172A` | Cards, Container |
| `bg-slate-800` | `#1E293B` | Input-Felder, Hover |
| `glass-bg` | `rgba(15,23,42,0.75)` | Glassmorphismus-Cards |
| `glass-border` | `rgba(255,255,255,0.08)` | Glas-Ränder |
| `accent-amber` | `#F59E0B` | Live-Indikator, Highlights |
| `points-exact` | `#22C55E` | 4 Punkte (exakt) |
| `points-diff` | `#F59E0B` | 3 Punkte (Differenz) |
| `points-tendency` | `#3B82F6` | 2 Punkte (Tendenz) |
| `points-zero` | `#64748B` | 0 Punkte |
| `podium-gold` | `#FBBF24` | Podium 1. Platz |
| `podium-silver` | `#9CA3AF` | Podium 2. Platz |
| `podium-bronze` | `#D97706` | Podium 3. Platz |

### Typografie
- **Überschriften:** Inter Tight / Inter, `font-bold`
- **Body:** Inter, `font-normal`
- **Daten/Labels:** JetBrains Mono, `font-mono text-xs tracking-wider uppercase`
- **Ergebnisse:** JetBrains Mono, `font-mono text-2xl font-bold`

### Komponenten-Muster
- **Glass-Card:** `backdrop-blur-xl bg-[rgba(15,23,42,0.75)] border border-[rgba(255,255,255,0.08)] rounded-2xl p-4`
- **Input-Feld:** `bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-3 focus:border-amber-500 focus:outline-none transition-colors`
- **Primary-Button:** `bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold rounded-xl px-6 py-3 transition-all active:scale-95`
- **Live-Puls:** `w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse`

### Animationen (Framer Motion)
- **Page-Transition:** Fade + Slide-Up (300ms ease-out)
- **Card-Lift:** `whileHover={{ y: -4, transition: { duration: 0.2 } }}`
- **Accordion:** AnimatePresence + height animation
- **Modal/Bottom Sheet:** Slide-Up from bottom, backdrop fade

---

## Projekt-Struktur

```
~/Projekte/fussball-tipprunde/
├── index.html
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── tsconfig.json
├── src/
│   ├── main.tsx
│   ├── App.tsx                    # Router + App Shell
│   ├── index.css                  # Tailwind + Custom CSS
│   ├── design/
│   │   └── tokens.ts              # Farb-Tokens, Typografie-Constants
│   ├── stores/
│   │   ├── authStore.ts           # Auth-Zustand (Mock)
│   │   ├── matchStore.ts          # Spiele + Spieltage
│   │   ├── tipStore.ts            # Tipps der User
│   │   ├── bonusTipStore.ts       # Saison-Tipps
│   │   ├── leaderboardStore.ts    # Rangliste
│   │   └── chatStore.ts           # Trash-Talk Nachrichten
│   ├── data/
│   │   ├── teams.ts               # Süper-Lig Teams (Mock)
│   │   ├── matches.ts             # Spielplan-Generator
│   │   ├── users.ts               # Mock-Freunde
│   │   └── tips.ts                # Mock-Tipps
│   ├── pages/
│   │   ├── SplashPage.tsx         # View 1a
│   │   ├── LoginPage.tsx          # View 1b
│   │   ├── DashboardPage.tsx      # View 2
│   │   ├── LeaderboardPage.tsx    # View 4
│   │   ├── RivalAnalysisPage.tsx  # View 5
│   │   ├── BonusTipsPage.tsx      # View 6
│   │   ├── LeaguePage.tsx         # View 7
│   │   ├── ProfilePage.tsx        # View 8
│   │   └── RulesPage.tsx          # View 9
│   ├── components/
│   │   ├── AppShell.tsx           # Bottom Nav + AnimatedOutlet
│   │   ├── BottomNav.tsx          # 5-Item Bottom Navigation
│   │   ├── MatchCard.tsx          # Spielkarte (pre/live/post)
│   │   ├── MatchDetail.tsx        # View 3: Bottom Sheet
│   │   ├── TrashTalk.tsx          # View 3 Tab 2: Chat
│   │   ├── TipsList.tsx           # View 3 Tab 1: Tipp-Liste
│   │   ├── Podium.tsx             # Top-3 Podium
│   │   ├── BonusTipCard.tsx       # Bonus-Tipp Karte
│   │   ├── GlassCard.tsx          # Wiederverwendbare Glass-Card
│   │   ├── LiveIndicator.tsx      # Pulsierender roter Punkt
│   │   ├── PointsBadge.tsx        # Farbiger Punkte-Badge
│   │   └── FormCurve.tsx          # Mini-Chart (letzte 5 Spieltage)
│   └── utils/
│       ├── scoring.ts             # Punkteberechnungs-Logik
│       ├── formatDate.ts          # Datum/Zeit-Formatierung
│       └── constants.ts           # Routes, Labels
```

---

## Phasen-Übersicht

| Phase | Tickets | Beschreibung |
|-------|---------|--------------|
| **Phase 1: Foundation** | #1–#3 | Scaffolding, Design-System, App Shell + Navigation |
| **Phase 2: Core Views** | #4–#7 | Splash/Login, Dashboard, Match-Detail, Leaderboard |
| **Phase 3: Detail Views** | #8–#11 | Gegner-Analyse, Bonus-Tipps, Liga, Profil |
| **Phase 4: Polish** | #12–#14 | Regelwerk, Animationen, Mock-Daten-Feinschliff |

---

## Task 1: Projekt-Scaffolding & Dependencies

**Objective:** Vite + React + TypeScript Projekt aufsetzen, alle Dependencies installieren.

**Ablauf:**
1. `npm create vite@latest fussball-tipprunde -- --template react-ts` im Parent-Dir
2. Dependencies: `tailwindcss @tailwindcss/vite framer-motion zustand react-router-dom lucide-react date-fns`
3. `tailwind.config.js` mit Custom-Colors + Dark-Mode
4. `index.css` mit Tailwind-Directives + Scrollbar-Styling + Font-Import (Inter, JetBrains Mono)
5. `vite.config.ts` mit Tailwind-Plugin + Path-Aliases
6. `npm run dev` → prüfen ob läuft

**Verifikation:** `npm run build` läuft ohne Fehler, `npm run dev` zeigt "Hello World".

---

## Task 2: Design-System & Tokens

**Objective:** Globale Design-Tokens, Glassmorphism-Utilities, Typografie-Klassen.

**Dateien:**
- `src/design/tokens.ts` — Farbkonstanten, Typografie-Maps
- `src/index.css` — Custom-Utilities (`glass-card`, `glass-input`, `btn-primary`, `btn-ghost`)
- `tailwind.config.js` — Custom-Theme mit allen Farben

**Verifikation:** Erstelle eine Test-Seite (`/design-test`) die alle Komponenten-Muster zeigt: Glass-Card, Input, Button, Badges. Entferne Test-Seite danach.

---

## Task 3: App Shell & Bottom Navigation

**Objective:** Router-Setup, Bottom-Navigation-Bar, animierte Page-Transitions.

**Dateien:**
- `src/App.tsx` — HashRouter mit allen Routes
- `src/components/AppShell.tsx` — Layout mit `<Outlet />` + BottomNav
- `src/components/BottomNav.tsx` — 5 Items: Spiele, Tabelle, Bonus, Liga, Profil
- `src/pages/*.tsx` — Platzhalter für alle 9 Views

**Design BottomNav:**
- Fixiert am unteren Rand, `h-16`, Glassmorphism-Hintergrund
- 5 Icons (Lucide): `Trophy`, `Table2`, `Gift`, `Users`, `User`
- Aktiver Tab: Icon leuchtet amber, kleiner Glow-Effekt
- Smooth Tab-Wechsel via Framer Motion `layoutId`

**Verifikation:** Alle 5 Tabs navigieren, Bottom-Nav sticky, Wechsel animiert.

---

## Task 4: Mock-Daten & Zustand Stores

**Objective:** Alle Mock-Daten generieren + Zustand Stores für Matches, Tipps, Auth, Leaderboard.

**Mock-Daten:**
- 10 Freunde (Avatar-Initialen, Usernames)
- 5 Spieltage × 9 Spiele = 45 Matches (Mix aus upcoming, live, finished)
- 5 Bonus-Fragen (Meister, Torschützenkönig, etc.)
- Süper-Lig Teams: Fenerbahçe, Galatasaray, Beşiktaş, Trabzonspor, Başakşehir, Adana Demirspor, Antalyaspor, Konyaspor, Sivasspor, etc. (19 Teams + Dummies)

**Stores:**
```typescript
// authStore.ts
interface AuthStore {
  user: User | null;
  isLoggedIn: boolean;
  login: (email: string) => Promise<void>;
  logout: () => void;
}

// matchStore.ts
interface MatchStore {
  matches: Match[];
  currentMatchday: number;
  setMatchday: (day: number) => void;
  getMatchesByMatchday: (day: number) => Match[];
  getLiveMatches: () => Match[];
}

// tipStore.ts
interface TipStore {
  tips: Tip[];
  getTipsForMatch: (matchId: string) => Tip[];
  getMyTip: (matchId: string) => Tip | undefined;
  saveTip: (matchId: string, tipHome: number, tipAway: number) => void;
  getMyTipsForMatchday: (matchday: number) => Tip[];
}

// leaderboardStore.ts
interface LeaderboardStore {
  getOverallRanking: () => LeaderboardEntry[];
  getMatchdayRanking: (matchday: number) => LeaderboardEntry[];
  getUserStats: (userId: string) => UserStats;
}

// bonusTipStore.ts
// chatStore.ts
```

**Scoring-Logik in `src/utils/scoring.ts`:**
```typescript
function calculatePoints(tipHome: number, tipAway: number, resultHome: number, resultAway: number): number {
  // 4P: Exaktes Ergebnis
  if (tipHome === resultHome && tipAway === resultAway) return 4;
  // 3P: Richtige Tordifferenz ODER nicht-exaktes Unentschieden
  const tipDiff = tipHome - tipAway;
  const resultDiff = resultHome - resultAway;
  if (tipDiff === resultDiff) return 3;
  // 2P: Richtige Tendenz (Sieg/Unentschieden/Niederlage)
  const tipSign = Math.sign(tipDiff);
  const resultSign = Math.sign(resultDiff);
  if (tipSign === resultSign) return 2;
  // 0P: Falsch
  return 0;
}
```

**Verifikation:** `scoring.ts` mit allen 4 Punktkategorien testen. Stores geben korrekte Mock-Daten zurück.

---

## Task 5: View 1 — Splash Screen & Login

**Objective:** Splash-Animation + Magic-Link-Login-Seite.

**SplashPage:**
- Zentrales Logo (Fußball-Icon + "Tipprunde" Text)
- weich einblenden (Framer Motion, 800ms fade + scale)
- Nach 2s automatisch → Login oder Dashboard (wenn bereits eingeloggt)

**LoginPage:**
- Dunkler Hintergrund mit subtilem Gradient
- Glass-Card zentriert: "Willkommen zurück"
- E-Mail-Input-Feld
- "Magic Link senden" Button mit animiertem Senden-Zustand
  - Button-Text wechselt zu "Gesendet ✓" mit Häkchen-Animation
  - Mock: Nach 1.5s "Senden" → `authStore.login(email)` → weiter zu Dashboard

**Verifikation:** Splash erscheint, fadet zu Login, Login sendet Magic Link (Mock), leitet zu Dashboard.

---

## Task 6: View 2 — Dashboard (Spielplan & Live-Arena)

**Objective:** Komplexeste View. Spieltag-Navigation, Toggle, Match-Cards in 3 Zuständen.

**Komponenten:**
- **Sticky Header:** Spieltag-Dropdown ("Spieltag 1", "Spieltag 2", ...) + ◀ ▶ Pfeile
- **Toggle:** "Alle Spiele" | "Nur Live" (iOS-Style Segment-Control)
- **MatchCard (pre-match):**
  - Teams + Wappen-Platzhalter
  - Zwei Input-Felder für Tore (0-9)
  - "Tipp speichern" Button → Häkchen-Animation bei Erfolg
  - Countdown bis Anpfiff
- **MatchCard (live):**
  - Pulsierender roter Punkt + aktuelle Minute (z.B. "67'")
  - Aktuelles Ergebnis groß zentriert
  - Keine Tipp-Änderung möglich
- **MatchCard (finished):**
  - Endergebnis groß zentriert
  - Card-Rand leuchtet in Punktefarbe (Grün/Gelb/Blau/Grau)
  - Eigener Tipp + Punkte-Badge

**Layout:**
- Mobile: Eine Spalte, Cards untereinander
- Scrollbarer Container mit `pb-20` (Bottom-Nav)
- `AnimatePresence` für Filter-Wechsel

**Verifikation:** Spieltag wechseln, Toggle filtert korrekt, Tipp speichern zeigt Feedback, Live-Spiele pulsieren.

---

## Task 7: View 3 — Match-Detail & Trash-Talk

**Objective:** Bottom Sheet / Modal wenn Match-Card geklickt wird.

**MatchDetail (Bottom Sheet):**
- Von unten slidet das Sheet hoch (90vh Höhe)
- Header: Teams + Ergebnis (oder "vs." bei upcoming)
- **Tab 1 "Tipps":**
  - Liste aller Freunde-Tipps
  - Pre-Kickoff: "Tipps werden nach Anpfiff aufgedeckt" — Tipps ausgegraut/versteckt
  - Post-Kickoff: Alle Tipps sichtbar mit Avatar + Username + Tipp + Punkte
- **Tab 2 "Trash-Talk":**
  - WhatsApp-Style Chat-Bubbles
  - Nachrichten mit Avatar + Username + Zeitstempel
  - Input-Feld unten mit Senden-Button
  - Mock-Nachrichten von Freunden

**Design:**
- `backdrop-blur-xl` Overlay
- Sheet: `rounded-t-3xl` oben, Drag-Indicator
- Tab-Umschalter oben als Segment-Control
- Scrollbarer Content-Bereich

**Verifikation:** Sheet öffnet/schließt, Tab-Wechsel funktioniert, Chat zeigt Mock-Nachrichten, Input sendet neue Nachricht.

---

## Task 8: View 4 — Leaderboard (Rangliste)

**Objective:** Rangliste mit Podium + Tabelle, Toggle Gesamt/Spieltag.

**Podium-Header:**
- Top 3 visuell gestapelt: 1. Platz (Mitte, oben, Gold-Rand), 2. (Links, Silber), 3. (Rechts, Bronze)
- Große Avatare, Username, Gesamtpunkte
- "👑" Icon für Platz 1

**Toggle:** "Gesamtwertung" | "Spieltags-Sieger"

**Tabelle:**
- Sticky-Header: #, Spieler, Punkte, Exakt
- Zeilen mit Avatar, Username, Punkte, Badge "🎯 5x" (exakte Treffer)
- Klick auf Zeile → `navigate('/analyse/:userId')`
- Eigene Zeile hervorgehoben (amber Rand links)

**Verifikation:** Podium zeigt Top 3, Toggle wechselt Ranking, Klick auf Zeile navigiert zur Analyse.

---

## Task 9: View 5 — Gegner-Analyse

**Objective:** Detailansicht eines Freundes mit Formkurve + Tipp-Historie.

**Header:**
- Großer Avatar (80px), Username, Aktuelle Platzierung
- Badges: Gesamtpunkte, Exakte Treffer, Ø Punkte/Spieltag

**Formkurve:**
- Mini-Balkendiagramm der letzten 5 Spieltage
- Balken in Punktefarbe (Grün/Gelb/Blau/Grau)
- CSS-only (kein Recharts für diesen Mini-Chart)

**Tipp-Historie:**
- Cards pro Spieltag: Ergebnis vs. Tipp
- Links: Mein Tipp (deine Werte), Rechts: Gegner-Tipp
- Punkte-Badge für beide

**Verifikation:** Formkurve zeigt 5 Balken, Historie zeigt alle vergangenen Tipps, Punkteberechnung stimmt.

---

## Task 10: View 6 — Bonus-Tipps (Saison-Wetten)

**Objective:** Langzeit-Tipps vor Saisonstart, Read-only danach.

**Fragen (Mock):**
1. "Wer wird Meister?" — Team-Dropdown
2. "Welches Team schießt die meisten Tore?"
3. "Welches Team kassiert die wenigsten Gegentore?"
4. "Wer wird Torschützenkönig?"
5. "Welcher Aufsteiger landet am höchsten?"

**Pre-Season (Mock: Spieltag 1 noch nicht gestartet):**
- Dropdown/Select für jede Frage mit Team-Liste
- "Bonus-Tipps abgeben" Button → Erfolgs-Häkchen

**Post-Season (Mock: ab Spieltag 2):**
- Felder Read-only, zeigen gewähltes Team + Wappen
- "Änderungen nicht mehr möglich" Hinweis

**Design:**
- Glass-Cards für jede Frage
- Team-Select mit Wappen-Emoji

**Verifikation:** Tipps abgeben speichert, nach "Saisonstart" Read-only, gespeicherte Werte bleiben.

---

## Task 11: View 7 — Meine Liga (Gruppen-Verwaltung)

**Objective:** Liga-Info, Einladungs-Code, Mitglieder-Liste.

**Header:** Liga-Name ("Die Tipp-Götter"), Erstellungsdatum

**Einladungs-Sektion:**
- Prominenter Einladungs-Code (z.B. "TIP-2025-XYZ")
- "Code kopieren" Button mit Toast-Feedback
- "Link teilen" Button (Mock: `navigator.share` wenn verfügbar)

**Mitglieder-Sektion:**
- Avatar + Username + Status-Indikator
- Status: "✅ Alle Tipps abgegeben" | "⚠️ 3/9 Tipps fehlen" | "❌ Keine Tipps"
- Sortierung: Vollständige zuerst, dann unvollständige

**Verifikation:** Code wird kopiert, Mitglieder-Liste zeigt Status, Sortierung korrekt.

---

## Task 12: View 8 — Profil & Einstellungen

**Objective:** Username, Avatar, Benachrichtigungs-Toggles, Statistiken.

**Profil-Header:**
- Avatar (groß, klickbar zum Ändern — Mock: zufällige Farbe/Initialen)
- Username (editierbar, Inline-Edit)
- "Platz 3 von 10" Badge

**Benachrichtigungen (iOS-Style Toggles):**
- "Push-Erinnerung vor Anpfiff" — Switch
- "Neue Chat-Nachrichten" — Switch
- "Spieltags-Ergebnisse" — Switch

**Statistik-Cards:**
- "Ø Punkte pro Spieltag" — große Zahl
- "Bester Tabellenplatz" — "1. Platz (Spieltag 4)"
- "Exakte Treffer" — "12x 🎯"
- "Perfekter Spieltag" — "Spieltag 3 (36 Pkt.)"

**Logout-Button:** Rot, unten, mit Bestätigungs-Dialog

**Verifikation:** Username editierbar, Toggles funktionieren, Stats zeigen korrekte Werte.

---

## Task 13: View 9 — Regelwerk (Info-Overlay)

**Objective:** Visuelles Regelwerk als Bottom-Sheet.

**Öffnen:** Button in der Bottom-Nav oder Profil-Seite ("Regelwerk")

**Inhalt:**
- **Header:** "So funktioniert's"
- **4 Beispiel-Cards** mit visueller Erklärung:
  1. 🟢 "4 Punkte — Exaktes Ergebnis" (Tipp 2:1 = Ergebnis 2:1)
  2. 🟡 "3 Punkte — Richtige Tordifferenz" (Tipp 3:1 = Ergebnis 2:0) oder Unentschieden (1:1 = 2:2)
  3. 🔵 "2 Punkte — Richtige Tendenz" (Tipp 1:0 = Ergebnis 2:1)
  4. ⬜ "0 Punkte — Daneben" (Tipp 2:0 = Ergebnis 0:2)
- **Zusatzinfo:** "Nur 90 Minuten zählen", "Verschobene Spiele werden bei Nachholung gewertet"
- **Punktesystem-Visualisierung:** Kleine Matrix/Grid

**Verifikation:** Overlay slidet von unten, alle 4 Beispiele verständlich, schließen per Swipe-Down oder X-Button.

---

## Task 14: Finaler Feinschliff & Cross-View-Integration

**Objective:** Alle Views verknüpfen, Animationen polishen, Edge-Cases abdecken.

**Checkliste:**
- [ ] Page-Transitions zwischen allen Views (AnimatePresence)
- [ ] Daten fließen korrekt zwischen Stores und Views
- [ ] MatchCard in Dashboard → MatchDetail Bottom Sheet
- [ ] Leaderboard → Gegner-Analyse
- [ ] Login → Dashboard (Auth-Gate)
- [ ] Pre/Post-Kickoff Tipp-Verhalten (versteckt vs. sichtbar)
- [ ] Mobile-Viewport: `pb-20` für Bottom-Nav, kein Horizontal-Scroll
- [ ] Safari-Safe-Area: `env(safe-area-inset-bottom)`
- [ ] Loading-States: Skeleton-Cards während "Daten laden"
- [ ] Empty-States: "Keine Live-Spiele", "Noch keine Tipps"

**Verifikation:** Vollständiger User-Flow: Splash → Login → Dashboard → Match-Detail → Leaderboard → Analyse → Profil. Alles flüssig, keine visuellen Bugs.

---

## Offene Fragen für Phase 2 (Supabase-Integration)

1. Supabase-Projekt-URL + Anon-Key?
2. Edge Function für API-Football (Süper-Lig-Daten)?
3. Cronjob für Spielplan-Updates + Ergebnis-Sync?
4. Push-Notifications (Web-Push via Service Worker)?
5. Echte Magic-Link-Emails via Supabase Auth?

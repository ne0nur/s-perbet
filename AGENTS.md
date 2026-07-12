# SüperBET — AI Agent Project Context

> **Für KI-Agents (Hermes, Claude, Cursor, etc.):** Diese Datei gibt dir ein vollständiges Bild des Projekts ohne Vorwissen. Lade ZUSÄTZLICH den `superbet-development` Skill für tiefere Referenzen.

---

## 1. Identität & Stack

**SüperBET** ist eine private Fußball-Tipprunde unter Freunden — Mobile-First PWA mit Live-Ergebnissen, Leaderboards, privaten Ligen und Achievements.

| | |
|---|---|
| **Live-URL** | `https://ne0nur.github.io/s-perbet` |
| **Repo** | `github.com/ne0nur/s-perbet` (lokal: `~/Projekte/fussball-tipprunde`) |
| **Branch** | `main` |
| **Hosting** | GitHub Pages (`gh-pages` branch via `npx gh-pages -d dist`) |

### Tech-Stack

| Layer | Technologie | Version |
|---|---|---|
| Framework | React | ^19.2 |
| Build | Vite | latest |
| Styling | Tailwind CSS | ^4.3 |
| Language | TypeScript | latest |
| State | Zustand | ^5.0 |
| Backend/DB | Supabase | `@supabase/supabase-js` ^2.108 |
| Animation | Framer Motion | ^12.40 |
| Icons | Lucide React | ^1.20 |
| Charts | Recharts | ^3.9 |
| 3D | Three.js + React Three Fiber | ^0.184 / ^9.6 |
| Router | React Router | ^7.18 (HashRouter) |
| Auth | Supabase Auth | email/password |

---

## 2. Architektur

### Datenfluss

```
ESPN API ──→ S4-Mini (Termux/Android, 24/7)
                │  POST /functions/v1/sync-match-results
                ▼
         Supabase Edge Function
                │  service_role key
                ▼
         Supabase PostgreSQL ──→ Supabase Realtime
                │                      │
                ▼                      ▼
         Zustand Stores ◀──────────────┘
                │
                ▼
         React Components → UI
```

- **Primärer Sync:** S4-Mini (Android-Handy mit Termux) ruft alle 90s (live) / 450s (ruhe) die Edge Function auf
- **Backup:** GitHub Actions cron `sync-scores.yml` (~1x/h, free-tier throttled)
- **Client-Poll:** 30s Unified Poll (`starteLiveMatchPoll`) holt matches + app_settings parallel

### Routing & Pages

```
App.tsx (HashRouter)
├── LoginPage           → /login
├── SetPasswordPage     → /set-password
├── ProtectedRoute
│   ├── AppShell (BottomNav: Spiele|Tabelle|Bonus|Liga|Profil)
│   │   ├── DashboardPage   → /dashboard
│   │   ├── StandingsPage   → /standings
│   │   ├── LeaguePage      → /leagues
│   │   ├── GlobalPage      → /global
│   │   ├── ProfilePage     → /profile
│   │   └── RulesPage       → /rules (Overlay)
```

---

## 3. Datei-Map

### Stores (`src/stores/`)

| Datei | Zweck | Key State |
|---|---|---|
| `matchStore.ts` | Spiele laden, cachen, Live-Poll, Realtime-Sub | `matches[]`, `aktuellerSpieltag`, `selectedTournament`, `aktivePhase`, `cacheMatches` |
| `tipStore.ts` | Tipps des Users laden & speichern | `meineTipps[]`, `tippSpeichern()` |
| `tournamentStore.ts` | Turnier-Registry (aus `tournament_configs`) | `tournaments[]`, `getTournament(name)` |
| `authStore.ts` | Auth-Session, Login/Logout | `session`, `user`, `signIn()`, `signOut()` |
| `themeStore.ts` | Dark-Mode (immer dark) | — |

### Pages (`src/pages/`)

| Datei | Zweck |
|---|---|
| `DashboardPage.tsx` | Match-Cards, Spieltag-Navigation, Tipp-Abgabe, Turnier-Filter |
| `StandingsPage.tsx` | Turnier-Tabellen + KO-Phasen (MatchCard readOnly) + TeamInspector |
| `LeaguePage.tsx` | Private Ligen, spieltag-basiertes Leaderboard, Liga-Chat |
| `GlobalPage.tsx` | Globales Leaderboard (alle User), Level, Achievements |
| `ProfilePage.tsx` | Eigenes Profil, Stats, Einstellungen, Admin-Panel |
| `LoginPage.tsx` | Supabase Auth Login |
| `RulesPage.tsx` | Regelwerk-Overlay (Punktesystem visuell) |

### Components (`src/components/`)

| Datei | Zweck |
|---|---|
| `MatchCard.tsx` | **Zentrale Match-Karte.** Tipp-Stepper, Live-Punkte, Farb-Badges, KO-Validierung. Prop: `readOnly` |
| `MatchDetailPanel.tsx` | Bottom-Sheet: Alle Tipps + Trash-Talk-Chat pro Match |
| `TeamInspector.tsx` | Team-Detail (Desktop-Sidebar) |
| `RivalInspector.tsx` | Gegner-Analyse: Stats, Formkurve, Achievements |
| `AppShell.tsx` | App-Rahmen: Header-Logo, Bottom-Nav, Live-Indikatoren |
| `BottomNav.tsx` | Fixe mobile Navigation (5 Icons) |
| `HeaderLogo.tsx` | Animiertes SüperBET-Logo (3D-Ball + Text) |
| `LeagueChat.tsx` | Liga-weiter Chat |

### Utilities (`src/lib/` + `src/utils/`)

| Datei | Zweck |
|---|---|
| `lib/utils.ts` | `berechnePunkte()` (4-3-2-1-0-−1-−2), `calculateLevel()`, `getTournamentLogo()` |
| `lib/teamLogos.ts` | Team-Logo-Resolution (KNOWN_LOGOS + normalizeName) |
| `lib/wmGroups.ts` | WM 2026: 48 Teams → Gruppen A-L |
| `utils/translations.ts` | **426+ Keys** in de/en/tr. `useTranslation()` Hook |
| `utils/achievementEvaluator.ts` | Client-seitige Achievement-Prüfung |

### Supabase

| Pfad | Zweck |
|---|---|
| `supabase/functions/sync-match-results/` | Edge Function: ESPN API Sync + KO-Propagation + Heartbeat |
| `supabase/functions/update-user-levels/` | Edge Function: Level + Achievement-Berechnung |
| `supabase/migrations/` | **49 SQL-Migrationen** (001–045 + timestamped) |

---

## 4. Stores & State — Querbeziehungen

- `matchStore.selectedTournament` → steuert welches Turnier `tipStore` lädt
- `matchStore.aktivePhase` → steuert KO-Phasen-Sperre in `MatchCard` (`isFuturePhase`)
- `matchStore.cacheMatches` → persistiert via Zustand `persist` in localStorage
- `tournamentStore.tournaments` → Quelle für ALLE Turnier-Infos. NIE direkt `tournament_configs` querien!
- `authStore.session` → Supabase-Client initialisiert sich damit

### MatchCard-Logik (wichtigste Komponente)

```
istLive = match.status === 'live' || (status === 'upcoming' && anpfiff < now)
istUpcoming = match.status === 'upcoming' && anpfiff >= now
isFuturePhase = isKoMatch && (aktivePhase === null || match.spieltag > aktivePhase)
kannTippen = !readOnly && istUpcoming && tippsFreigeschaltet && teamsStehenFest && !isFuturePhase
```

---

## 5. DB-Schema & Scoring

### Kern-Tabellen

| Tabelle | Zweck |
|---|---|
| `matches` | Alle Spiele: teams, anpfiff, status, ergebnisse, spielminute, tournament |
| `tips` | User-Tipps: tipp_heim, tipp_gast, punkte (von Trigger berechnet) |
| `profiles` | User-Profile: username, avatar, gesamt_punkte, level, total_exp, achievements |
| `leagues` | Private Ligen: name, invite_code, owner |
| `league_members` | Liga-Mitgliedschaften |
| `tournament_configs` | Turnier-Definitionen: has_knockout, group_stage_matchdays, cl_spots, … |
| `seasons` | Saisons: label, is_current |
| `app_settings` | Key-Value-Settings: tipps_freigeschaltet, last_sync, sync_label |
| `chat_messages` | Trash-Talk: match_id, user_id, message |

### RLS (Row Level Security)

- **tips:** User sehen NUR eigene Tipps VOR Anpfiff. AB Anpfiff alle Tipps global lesbar. Schreiben NUR vor Anpfiff.
- **matches, profiles, chat_messages:** Lesbar für alle authentifizierten User.
- **leagues:** Owner darf verwalten, Mitglieder lesen.

### Punktesystem: Distance-based (Migration 028)

```
berechnePunkte(tippHeim, tippGast, ergebnisHeim, ergebnisGast):
  d = |tippHeim - ergebnisHeim| + |tippGast - ergebnisGast|
  d=0 → 4P (Exakt)
  d=1 → 3P (Tordifferenz)
  d=2 → 2P (Tendenz)
  d=3 → 1P
  d=4 → 0P
  d=5 → -1P
  d≥6 → -2P
```

### Trigger (NUR EINER AKTIV!)

`trigger_punkte_bei_ergebnis` (Migration 018) — SETZT `tips.punkte` und `profiles.gesamt_punkte`.
⚠️ `trigger_punkteberechnung` (Migration 011) wurde gelöscht (Migration 045) — verursachte doppelte Punkte!

### Level-System

- Formel: `required_exp = level × 8` (linear)
- Server-seitig via Edge Function `update-user-levels`
- Frontend LIEST `profiles.level`, berechnet NIE selbst
- Achievements: 4 Raritäten — Gewöhnlich(50EXP), Selten(100EXP), Episch(200EXP), Legendär(500EXP)

---

## 6. Sync-Architektur — ESPN-only (Selbstläufer)

> Seit 13.07.2026: **ESPN-only.** Kein API-Football mehr, keine externen Keys.

### Die Kette

```
GitHub Actions (sync-scores.yml) ── oder ── S4-Mini (Termux)
    │  curl POST /functions/v1/sync-match-results (service_role)
    ▼
Edge Function sync-match-results (ESPN-only)
    │
    ├── Phase 0: Season sicherstellen (seasons Tabelle)
    ├── Phase 1: ESPN Fixtures + Scores
    │   ├── Kalender von ESPN holen (Spieltag → Datum)
    │   ├── Alle ESPN Events abrufen
    │   ├── CREATE neue Matches (falls nicht in DB)
    │   └── UPDATE Scores für existierende Matches
    ├── Phase 2: Time-based Fallback (upcoming→live→finished)
    ├── Phase 3: Smart-Intervall für nächsten Sync
    └── Phase 4: Heartbeat (last_sync + sync_label)
    │
    ▼
Supabase PostgreSQL ── Trigger: punkteberechnung
    │
    ▼
App (React) ── Zustand Stores via Realtime
```

### GitHub Actions Cron

| Cron | Frequenz | Zweck |
|------|----------|-------|
| `*/10 8-23 * * 5,6,7` | Alle 10 Min (Wochenende) | Live-Scores + neue Fixtures |
| `*/15 * * * 1-4` | Alle 15 Min (Wochentage) | Live-Scores |
| `0 2 * * *` | Täglich 02:00 UTC | Fixture-Refresh (ganze Saison) |

### ESPN API Endpunkte

| Turnier | ESPN Code | Kalender |
|---------|-----------|----------|
| Süper Lig | `tur.1` | 34 Spieltage (Aug–Mai) |
| Champions League | `uefa.champions` | Ligaphase + KO |
| World Cup 2026 | `fifa.world` | Gruppen + KO |

### Entfernte Abhängigkeiten (archiviert in `scripts/archiv/`)

| Datei | Grund |
|-------|-------|
| `import_fixtures.js` | API-Football Key nicht mehr nötig |
| `sync_scores.js` | Edge Function macht alles |
| `sync_loop.sh` | Nie deployed (Platzhalter-Keys) |
| `sync_dynamic.sh` | Nie deployed (Platzhalter-Keys) |
| `sync_wm_smart.sh` | Nie deployed (Platzhalter-Keys) |
| `sync-fixtures.yml` | Ersetzt durch ESPN Fixture-Import in Edge Function |

---

## 7. i18n & Design-Konventionen

### Sprachen (ALLE 3 gleichwertig!)

- `de` (Deutsch) — primär
- `en` (English)
- `tr` (Türkisch)
- Hook: `const { t, language } = useTranslation()`
- NIE hardcoded Strings in JSX — immer `t('key')`
- TOASTS müssen dreisprachig sein (inline `Record<string, string[]>`)
- Neue Keys: ALLE 3 Sprachen gleichzeitig hinzufügen

### Design

- **Dark-Only.** Kein Light-Mode.
- **Glassmorphism:** `backdrop-blur`, semi-transparente Hintergründe
- **Material Design 3 Tokens:** `primary-container`, `surface-container`, `on-surface-variant`
- ⚠️ **NIE raw Tailwind-Farben** (kein `bg-blue-500`, `text-green-400`) → immer Container-Tokens
- **Animationen:** Langsam (~3.2s Intro), asynchron, CSS `@keyframes` only

### UI-Präferenz (User-Mandat)

- **Minimal Labels:** `+3` statt "Prognose: +3P"
- **Kein "Schickimicki":** Überflüssige UI-Elemente sofort entfernen
- **Functionality First:** Funktionierende Features mit Basis-Styling vor Design-Politur
- **Badges:** Nur Zahlen, kein erklärender Text

---

## 8. Kritische Pitfalls

Dies sind die teuersten Fehler der Projekt-Historie. **Lies sie, bevor du Code anfasst.**

| # | Pitfall | Fix |
|---|---|---|
| 1 | **Doppelte Punkte-Trigger** — `trigger_punkteberechnung` (011) lief NACH `trigger_punkte_bei_ergebnis` (018) und addierte Punkte doppelt | Alter Trigger gelöscht (Migration 045). Nur EIN Trigger aktiv. |
| 2 | **`isFuturePhase` null-guard** — `aktivePhase !== null && …` → bei `null` ALLE KO-Phasen tippbar | `aktivePhase === null \|\| match.spieltag > aktivePhase` |
| 3 | **StandingsPage KO-Cards "roh"** — nackte divs statt MatchCard | `<MatchCard match={m} readOnly />` |
| 4 | **`getPhaseLabel` 3× dupliziert** — DashboardPage, LeaguePage, StandingsPage haben eigene Kopie | Noch nicht in Shared-Utility extrahiert |
| 5 | **Leaderboard-Cache staleness** — GlobalPage 5min TTL ohne Revalidate | Stale-while-revalidate implementiert |
| 6 | **Live-Indikatoren-Desync** — getrennte Polls für matches + app_settings | Ein Unified Poll (30s) für beide |
| 7 | **RETURNS TABLE column ambiguity** — `SELECT id FROM seasons` in PL/pgSQL | `SELECT s.id FROM seasons s` (Tabellen-Alias) |
| 8 | **Achievement-Evaluator ungefiltert** — `tipsByMatchday` ohne `status='finished'`-Filter | `.filter(t => t.match.status === 'finished')` |
| 9 | **GitHub Actions Throttling** — Cron `*/5` läuft real nur ~1x/h | S4-Mini als primärer Sync, GH nur Backup |
| 10 | **MatchCard `readOnly` Prop** — StandingsPage braucht KEINE Tipp-UI | `readOnly` prop blockt Stepper + Save-Button |

---

## 9. Befehle

```bash
# Entwicklung
cd ~/Projekte/fussball-tipprunde
npm run dev                # Vite Dev-Server

# TypeScript-Check (vor jedem Commit!)
npx tsc --noEmit

# Build
npm run build              # tsc -b && vite build

# Deploy (NACH git push!)
npx gh-pages -d dist

# ESLint
npx eslint src/ --fix

# Supabase Edge Function deploy
npx supabase link --project-ref ynkdtqhhnxmpqvdbzzqk  # einmalig
npx supabase functions deploy sync-match-results --no-verify-jwt
npx supabase functions deploy update-user-levels --no-verify-jwt

# KO Bracket State prüfen
node scripts/check_ko_state.js

# Remote SQL (Supabase CLI)
npx supabase db query --linked "SELECT * FROM matches WHERE status='live'"
```

### Commit-Workflow (NIE überspringen!)

```bash
git add <files>
git commit -m "type: description"
git push origin main
npm run build
npx gh-pages -d dist
```

⚠️ **Ohne `git push` landet der Source NIE auf GitHub** — `gh-pages` deployed nur `dist/`.

---

## 10. Turnier-Struktur (WM 2026)

- **12 Gruppen (A–L), je 4 Teams → Spieltag 1–3**
- **Sechzehntelfinale → Spieltag 4** (16 Spiele)
- **Achtelfinale → Spieltag 5** (8 Spiele)
- **Viertelfinale → Spieltag 6** (4 Spiele)
- **Halbfinale → Spieltag 7** (2 Spiele)
- **Finale + Platz 3 → Spieltag 8** (2 Spiele)
- Team→Gruppe-Mapping: `src/lib/wmGroups.ts`
- KO-Matches starten mit Platzhaltern ("Round of 32 1 Winner") → Edge Function füllt sie per `propagateKoWinners()`

### Multi-Tournament-Support

- Süper Lig, Champions League, WM 2026 — parallel aktiv
- `tournament_configs`-Tabelle definiert jedes Turnier
- `matchStore.selectedTournament` steuert den aktiven Kontext
- **Turniere NIE aus Matches ableiten** — immer `tournamentStore` nutzen

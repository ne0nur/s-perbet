# Fußball-Tippspiel (Süper Lig) — Implementierungsplan v2

> **Ziel:** Voll funktionsfähige Mobile-First Web-App für privates Fußball-Tippspiel. Supabase von Anfang an. Funktionalität vor Design. Alles auf Deutsch.
> **Architektur:** React 19 + Vite + TypeScript + Tailwind + Zustand + Supabase (@supabase/supabase-js) + React Router.
> **Hosting:** Frontend lokal (Vite), Backend = Supabase Cloud (PostgreSQL + Auth + RLS + Edge Functions).

---

## Projektstruktur

```
~/Projekte/fussball-tipprunde/
├── .env                          # Supabase URL + Anon Key (nicht in Git)
├── .env.example
├── index.html
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── tsconfig.json
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql  # Komplettes DB-Schema
├── src/
│   ├── main.tsx
│   ├── App.tsx                    # Router + Auth-Gate
│   ├── index.css                  # Tailwind + Basis-Styling
│   ├── lib/
│   │   └── supabase.ts            # Supabase-Client Singleton
│   ├── stores/
│   │   ├── authStore.ts           # Auth-Zustand (Supabase Magic Link)
│   │   ├── matchStore.ts          # Spiele + Spieltage (Supabase)
│   │   ├── tipStore.ts            # Tipps (Supabase + RLS)
│   │   ├── leaderboardStore.ts    # Rangliste (Supabase-Query)
│   │   ├── bonusTipStore.ts       # Saison-Tipps
│   │   └── chatStore.ts           # Trash-Talk (Supabase Realtime)
│   ├── pages/
│   │   ├── SplashPage.tsx
│   │   ├── LoginPage.tsx
│   │   ├── DashboardPage.tsx      # View 2: Spielplan
│   │   ├── MatchDetailPage.tsx    # View 3: Tipps + Chat
│   │   ├── LeaderboardPage.tsx    # View 4: Rangliste
│   │   ├── RivalAnalysisPage.tsx  # View 5: Gegner-Analyse
│   │   ├── BonusTipsPage.tsx      # View 6: Saison-Tipps
│   │   ├── LeaguePage.tsx         # View 7: Liga
│   │   ├── ProfilePage.tsx        # View 8: Profil
│   │   └── RulesPage.tsx          # View 9: Regelwerk
│   ├── components/
│   │   ├── AppShell.tsx           # Layout + Bottom Nav
│   │   ├── BottomNav.tsx
│   │   ├── MatchCard.tsx          # Spielkarte
│   │   ├── MatchDetailSheet.tsx   # Bottom Sheet
│   │   ├── ChatBubble.tsx
│   │   ├── Podium.tsx
│   │   ├── ProtectedRoute.tsx     # Auth-Gate
│   │   └── PunkteBadge.tsx
│   └── utils/
│       ├── scoring.ts             # 4-3-2-0 Punkteberechnung
│       └── format.ts              # Datum/Zeit-Helfer
```

---

## Phase 1: Supabase einrichten (DATENBANK ZUERST)

### Task 1.1: SQL-Migration schreiben

**Datei:** `supabase/migrations/001_initial_schema.sql`

Tabellen:
```sql
-- Profile (erweitert Supabase auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  gesamt_punkte INTEGER DEFAULT 0,
  exakte_treffer INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Spiele
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spieltag INTEGER NOT NULL CHECK (spieltag > 0),
  heim_team TEXT NOT NULL,
  gast_team TEXT NOT NULL,
  anpfiff TIMESTAMPTZ NOT NULL,
  tore_heim INTEGER,
  tore_gast INTEGER,
  status TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'live', 'finished', 'postponed')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tipps
CREATE TABLE tips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  tipp_heim INTEGER NOT NULL CHECK (tipp_heim >= 0),
  tipp_gast INTEGER NOT NULL CHECK (tipp_gast >= 0),
  punkte INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, match_id)
);

-- Bonus-Tipps (Saison)
CREATE TABLE bonus_tipps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  frage_id INTEGER NOT NULL,  -- 1=Meister, 2=meiste Tore, 3=wenigste Gegentore, 4=Torschützenkönig, 5=bester Aufsteiger
  antwort TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, frage_id)
);

-- Chat-Nachrichten (Trash-Talk)
CREATE TABLE chat_nachrichten (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  nachricht TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Task 1.2: RLS-Policies

```sql
-- profiles: jeder authentifizierte Nutzer lesbar, nur eigener editierbar
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profile sind lesbar" ON profiles FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Eigenes Profil editierbar" ON profiles FOR UPDATE USING (auth.uid() = id);

-- matches: jeder lesbar, nur service_role darf schreiben
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Spiele sind lesbar" ON matches FOR SELECT USING (auth.role() = 'authenticated');

-- tips: NUR eigener Tipp vor Anpfiff lesbar, NACH Anpfiff alle lesbar
-- Schreibzugriff nur vor Anpfiff, nur eigener Tipp
ALTER TABLE tips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Eigene Tipps lesbar" ON tips FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Tipps nach Anpfiff lesbar" ON tips FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM matches WHERE matches.id = tips.match_id AND matches.anpfiff <= now()
    )
  );
CREATE POLICY "Tipp abgeben vor Anpfiff" ON tips FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM matches WHERE matches.id = tips.match_id AND matches.anpfiff > now()
    )
  );
CREATE POLICY "Tipp ändern vor Anpfiff" ON tips FOR UPDATE
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM matches WHERE matches.id = tips.match_id AND matches.anpfiff > now()
    )
  );

-- bonus_tipps: jeder lesbar, nur eigener editierbar
ALTER TABLE bonus_tipps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Bonus-Tipps lesbar" ON bonus_tipps FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Eigene Bonus-Tipps schreiben" ON bonus_tipps FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Eigene Bonus-Tipps ändern" ON bonus_tipps FOR UPDATE USING (auth.uid() = user_id);

-- chat_nachrichten: jeder lesbar, jeder authentifizierte schreibbar
ALTER TABLE chat_nachrichten ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Chat lesbar" ON chat_nachrichten FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Chat schreiben" ON chat_nachrichten FOR INSERT WITH CHECK (auth.uid() = user_id);
```

### Task 1.3: PostgreSQL Trigger für Punkteberechnung

```sql
-- Funktion: Berechnet Punkte für ALLE Tipps eines Spiels
CREATE OR REPLACE FUNCTION berechne_punkte()
RETURNS TRIGGER AS $$
DECLARE
  tip RECORD;
  punkte_val INTEGER;
BEGIN
  -- Nur wenn Status auf 'finished' wechselt und Ergebnisse vorliegen
  IF NEW.status = 'finished' AND OLD.status != 'finished'
     AND NEW.tore_heim IS NOT NULL AND NEW.tore_gast IS NOT NULL THEN

    FOR tip IN SELECT * FROM tips WHERE match_id = NEW.id LOOP
      -- 4 Punkte: Exaktes Ergebnis
      IF tip.tipp_heim = NEW.tore_heim AND tip.tipp_gast = NEW.tore_gast THEN
        punkte_val := 4;
      -- 3 Punkte: Richtige Tordifferenz (inkl. nicht-exaktes Unentschieden)
      ELSIF (tip.tipp_heim - tip.tipp_gast) = (NEW.tore_heim - NEW.tore_gast) THEN
        punkte_val := 3;
      -- 2 Punkte: Richtige Tendenz (Sieg/Unentschieden/Niederlage)
      ELSIF SIGN(tip.tipp_heim - tip.tipp_gast) = SIGN(NEW.tore_heim - NEW.tore_gast) THEN
        punkte_val := 2;
      -- 0 Punkte: Falsch
      ELSE
        punkte_val := 0;
      END IF;

      -- Tipp updaten
      UPDATE tips SET punkte = punkte_val WHERE id = tip.id;

      -- Profil-Punkte hochzählen
      UPDATE profiles
      SET gesamt_punkte = gesamt_punkte + punkte_val,
          exakte_treffer = exakte_treffer + CASE WHEN punkte_val = 4 THEN 1 ELSE 0 END
      WHERE id = tip.user_id;
    END LOOP;

  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger
CREATE TRIGGER trigger_punkteberechnung
  AFTER UPDATE ON matches
  FOR EACH ROW
  EXECUTE FUNCTION berechne_punkte();
```

### Task 1.4: Migration ausführen + Testdaten

Migration im Supabase SQL Editor ausführen oder via CLI:
```bash
npx supabase link --project-ref ynkdtqhhnxmpqvdbzzqk
npx supabase db push
```

Testdaten per SQL einfüllen (5 Spieltage, 9 Spiele pro Spieltag, Süper-Lig-Teams).

---

## Phase 2: Projekt-Scaffolding + Supabase-Client + Auth

### Task 2.1: Projekt aufsetzen

1. `npm create vite@latest . -- --template react-ts`
2. Dependencies: `@supabase/supabase-js react-router-dom zustand lucide-react date-fns tailwindcss @tailwindcss/vite`
3. `.env` mit Supabase-Credentials
4. `src/lib/supabase.ts`: Supabase-Client mit `createClient(url, anonKey)`

### Task 2.2: Auth-Flow (Magic Link)

- **LoginPage:** E-Mail-Eingabe → `supabase.auth.signInWithOtp({ email })` → "Link gesendet"-Screen
- **Auth-Callback:** `/auth/callback` Route fängt Magic-Link ab
- **authStore:** `user`, `session`, `login()`, `logout()`, `loadUser()`
- **ProtectedRoute:** Prüft `authStore.user`, leitet zu `/login` wenn nicht eingeloggt
- **Profil anlegen:** Trigger in Supabase: `ON INSERT INTO auth.users → INSERT INTO profiles`

### Task 2.3: App Shell + Navigation

- HashRouter mit allen Routes
- BottomNav: Spiele, Tabelle, Bonus, Liga, Profil
- Basis-Styling (Tailwind, keine aufwändige Design-Arbeit)

---

## Phase 3: Kern-Datenmodell + Zustand Stores + Scoring

### Task 3.1: Supabase-Service-Layer

Zentrale API-Funktionen (src/services/):
```
matchesService.ts   — getMatches(), getMatchById(), getMatchesBySpieltag()
tipsService.ts      — getMyTips(), getTipsForMatch(), saveTip(), updateTip()
leaderboardService.ts — getOverallRanking(), getMatchdayRanking()
bonusTipsService.ts — getMyBonusTips(), saveBonusTips()
chatService.ts      — getMessages(), sendMessage(), subscribeToChat()
profileService.ts   — getProfile(), updateProfile()
```

### Task 3.2: Zustand Stores

Jeder Store wrappt den Service-Layer und cached Daten lokal:
- `matchStore`: `matches`, `currentSpieltag`, `setSpieltag()`, `loadMatches()`
- `tipStore`: `myTips`, `tipsByMatch`, `saveTip()`, `loadTipsForMatch()`
- `leaderboardStore`: `overallRanking`, `matchdayRanking`, `loadRankings()`
- `bonusTipStore`: `myBonusTips`, `saveBonusTips()`
- `chatStore`: `messages`, `sendMessage()`, realtime subscription

### Task 3.3: Punkteberechnung (Client-Side für Vorschau)

```typescript
// src/utils/scoring.ts
export function berechnePunkte(
  tippHeim: number, tippGast: number,
  toreHeim: number, toreGast: number
): number {
  if (tippHeim === toreHeim && tippGast === toreGast) return 4;  // Exakt
  if ((tippHeim - tippGast) === (toreHeim - toreGast)) return 3; // Differenz
  if (Math.sign(tippHeim - tippGast) === Math.sign(toreHeim - toreGast)) return 2; // Tendenz
  return 0;
}
```

---

## Phase 4: Views 1-4 (Kern-Funktionalität)

### View 1: Splash + Login
- Splash: Logo, 2s, → Login oder Dashboard
- Login: E-Mail-Input, Magic-Link-Button, Loading-State, Fehler-Handling
- Callback: `/auth/callback` verarbeitet `access_token` aus URL

### View 2: Dashboard (Spielplan)
- Sticky-Header: Spieltag-Navigation (◀ Dropdown ▶)
- Toggle: "Alle" | "Live"
- MatchCard: Teams, Anpfiff/Uhrzeit, Tipp-Inputs, Ergebnis, Punkte
- Klick auf Card → `/match/:id`
- RLS beachtet: Tipps anderer vor Anpfiff nicht sichtbar

### View 3: Match-Detail (Bottom Sheet / eigene Seite)
- Header: Teams + Ergebnis
- Tab "Tipps": Liste aller Tipps (vor Anpfiff: nur eigener sichtbar)
- Tab "Trash-Talk": Chat mit Supabase Realtime Subscriptions
- Input-Feld für neue Nachricht

### View 4: Leaderboard
- Toggle: "Gesamtwertung" | "Spieltags-Sieger"
- Podium Top 3
- Tabelle: #, Spieler, Punkte, Exakt-Badge
- Klick → Gegner-Analyse

---

## Phase 5: Views 5-9 (Details + Verwaltung)

### View 5: Gegner-Analyse
- Profil-Header: Avatar, Name, Platz, Stats
- Formkurve (letzte 5 Spieltage)
- Tipp-Historie im Vergleich

### View 6: Bonus-Tipps
- 5 Fragen, Team-Auswahl per Dropdown
- Speichern, nach Saisonstart Read-only

### View 7: Meine Liga
- Liga-Name, Einladungs-Code
- Mitglieder-Liste mit Status

### View 8: Profil
- Username ändern, Avatar-Upload
- Benachrichtigungs-Toggles
- Statistiken
- Logout

### View 9: Regelwerk
- Visuelle Erklärung 4-3-2-0
- Beispiel-Cards

---

## Phase 6: API-Football Integration (später)

- Supabase Edge Function zum Abrufen von Süper-Lig-Daten
- Cronjob (pg_cron) für täglichen Spielplan-Sync
- Webhook für Live-Ergebnisse

---

## Supabase-Credentials (nicht comitten!)

```
VITE_SUPABASE_URL=https://ynkdtqhhnxmpqvdbzzqk.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlua2R0cWhobnhtcHF2ZGJ6enFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3MjIxMDgsImV4cCI6MjA5NzI5ODEwOH0.CtwsDIzHHI7YHpAMeyWeqZ8sy3wW4SQB17elEmuY6ZA
```

Service-Role-Key NUR für Edge Functions / Backend, NIE im Frontend.

---

## Wichtigste Änderungen zum ersten Plan

| Vorher | Jetzt |
|--------|-------|
| Mock-Daten | Supabase echte Daten |
| Design-System zuerst | Funktionalität zuerst |
| Ungenaue Supabase-Integration | Konkretes SQL-Schema + RLS |
| Keine Trigger | PostgreSQL-Trigger für Scoring |
| Englisch gemischt | Alles Deutsch (Code + UI) |
| Keine Supabase-Keys | Keys liegen vor, werden genutzt |

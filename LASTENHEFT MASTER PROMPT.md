# LASTENHEFT & MASTER-PROMPT: Private Fußball-Tippspiel App (Fokus Süper Lig)

## 1. Projektziel & Tech-Stack
Entwicklung einer modernen, automatisierten "Mobile-First" Web-Applikation für ein privates Fußball-Tippspiel unter Freunden. 
- **Frontend:** React, Vite, Tailwind CSS
- **State Management:** Zustand
- **Backend, Datenbank & Auth:** Supabase (@supabase/supabase-js)
- **Datenquelle:** Externe API (z.B. API-Football via Edge Functions/Cronjobs)

## 2. Design-Sprache & Vibe
- **Ästhetik:** "Mobile-First", sportlich, seriös, mit starker Gamification.
- **Inspiration:** Nächtliche Stadion-Architektur unter Flutlicht – tiefe, dunkle Töne (Deep Navy, Slate) gepaart mit edlem Glassmorphismus.
- **Farbcodes (Punkte-Feedback):** Vibrant Green (4P/Exakt), Amber (3P/Differenz), Light Blue (2P/Tendenz), Slate/Gray (0P).
- **Animationen:** Smoothe Page-Transitions, sanftes Lifting auf Cards (Hover), Accordions mit weichen Expand-Effekten. Live-Spiele haben pulsierende rote Indikatoren.
- **Dummy-Daten für UI-Entwicklung:** Fenerbahçe, Galatasaray, Besiktas etc. nutzen.

## 3. Datenbank-Schema & RLS (Supabase)
Es müssen folgende Tabellen inklusive Row Level Security (RLS) angelegt werden:
1. `profiles`: id (Auth), username, avatar_url, total_points, exact_hits.
2. `matches`: id, matchday (Zahl), home_team, away_team, kickoff_time (UTC timestamp), result_home, result_away, status (upcoming, in_play, finished, postponed).
3. `tips`: id, user_id, match_id, tip_home, tip_away.
4. `bonus_tips`: id, user_id, question_id, answer.
5. `chat_messages`: id, match_id, user_id, message, created_at.

**RLS-Regeln:**
- `matches`, `profiles`, `chat_messages`, `bonus_tips`: Für jeden authentifizierten Nutzer lesbar.
- `tips`: Nutzer dürfen nur eigene Tipps erstellen/updaten. Tipps sind VOR dem Anpfiff (`kickoff_time`) nur für den Ersteller lesbar. AB dem Anpfiff sind alle Tipps global lesbar. Schreibzugriff ab Anpfiff strikt blockiert.

## 4. Regelwerk & Vollautomatische Punkteberechnung
Sobald ein Spiel den Status 'finished' erhält und Ergebnisse in `matches` vorliegen, muss ein **PostgreSQL Trigger** die Punkte berechnen und die `profiles` Tabelle updaten. 
Die Logik (es gilt der höchste zutreffende Wert nach 90 Min.):
- **4 Punkte:** Exaktes Ergebnis (z.B. Tipp 2:1, Ergebnis 2:1).
- **3 Punkte:** Richtige Tordifferenz (z.B. Tipp 3:1, Ergebnis 2:0) ODER nicht-exaktes Unentschieden (z.B. Tipp 1:1, Ergebnis 2:2).
- **2 Punkte:** Richtiges Team / Richtige Tendenz (z.B. Tipp 1:0, Ergebnis 2:1).
- **0 Punkte:** Falscher Tipp.

*Hinweis: Verschobene/Abgebrochene Spiele werden erst gewertet, wenn der Status regulär auf "finished" springt.*

## 5. App-Navigation (App Shell)
- Fixe mobile Bottom-Navigation-Bar mit Icons: "Spiele", "Tabelle", "Bonus", "Liga", "Profil".
- Der aktive Tab wird visuell hervorgehoben (leuchtendes Icon).

## 6. Ansichten & UI-Komponenten (9 Views)

**Ansicht 1: Splash Screen & Login**
- Splash Screen: Zentrales, modernes Logo, das weich einblendet.
- Login: Subtiler, dunkler Hintergrund. Glassmorphismus-Card für passwortlosen E-Mail-Login (Supabase Magic Link) mit animiertem Senden-Button.

**Ansicht 2: Dashboard (Spielplan & Live-Arena)**
- Sticky-Header: Spieltag-Navigation (Dropdown & Pfeile).
- Toggle-Switch: "Alle Spiele" vs. "Nur Live".
- Match-Cards:
  - Vor Anpfiff: Input-Felder für Tore, "Tipp speichern"-Button mit Erfolgs-Häkchen.
  - Live: Pulsierender roter Punkt, aktuelle Spielminute.
  - Beendet: Zentriertes Endergebnis, Card-Rand leuchtet in Erfolgsfarbe (Grün/Gelb/Blau/Grau).
- Klick auf Card öffnet "Match-Detail & Trash-Talk".

**Ansicht 3: Match-Detail & Trash-Talk (Bottom Sheet / Modal)**
- Header: Teams und aktuelles/finales Ergebnis.
- Tab 1 "Tipps": Liste aller abgegebenen Tipps der Freunde (vor Anpfiff versteckt/verschlüsselt).
- Tab 2 "Trash-Talk": Mini-Chatroom für dieses Match. Sprechblasen-Design (wie WhatsApp) inkl. Input-Feld.

**Ansicht 4: Leaderboard (Rangliste)**
- Sub-Navigation: Toggle zwischen "Gesamtwertung" und "Spieltags-Sieger".
- Podium-Header: Top 3 visuell hervorgehoben (Gold/Silber/Bronze).
- Tabelle: Avatar, Username, Gesamtpunkte, Badge für "Exakte Treffer".
- Klickbare Zeilen öffnen die "Gegner-Analyse".

**Ansicht 5: Gegner-Analyse (Detailansicht)**
- Header: Großer Avatar, Username, Platzierung. Formkurve (Mini-Chart der letzten 5 Spieltage).
- Body: Historie der vergangenen Tipps des Gegners im direkten Vergleich zu den realen Ergebnissen.

**Ansicht 6: Bonus-Tipps (Saison-Wetten)**
- Bereich für Langzeit-Tipps (vor dem 1. Spieltag abzugeben).
- Cards für: "Wer wird Meister?", "Welches Team schießt die meisten Tore?".
- Nach Saisonstart: Felder sind Read-only und zeigen das gewählte Team (inkl. Wappen).

**Ansicht 7: Meine Liga (Gruppen-Verwaltung)**
- Header: Name der privaten Liga.
- Einladungs-Sektion: Code prominent dargestellt mit "Link kopieren/Teilen" Button.
- Mitglieder-Sektion: Liste der Freunde inkl. Status (z.B. "Tipps für aktuellen Spieltag unvollständig").

**Ansicht 8: Profil & Einstellungen**
- Username-Änderung und Avatar-Upload-UI.
- iOS-Style Toggle-Switches für Benachrichtigungen (Push-Erinnerungen vor Anpfiff, neue Chat-Nachrichten).
- Statistik-Cards: "Punkte pro Spieltag (Ø)", "Bester Tabellenplatz".

**Ansicht 9: Regelwerk (Info-Overlay)**
- Slidet von unten in den Viewport.
- Visuelle, selbsterklärende Darstellung des 4-3-2-0 Punktesystems anhand kleiner Beispiel-Match-Cards.

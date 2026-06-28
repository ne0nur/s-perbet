# UX-Helfer & Benutzerfreundlichkeits-Plan

**Datum:** 19.06.2026  
**Projekt:** Private Fußball-Tippspiel App  
**Status:** Audit abgeschlossen, Tickets folgen

## Zusammenfassung der Analyse

Gesamte App durch Browser-Rundgang und Code-Inspektion analysiert. 14 Findings, priorisiert in drei Kategorien (+1 nach User-Feedback ergänzt).

---

## 🔴 KRITISCHE FUNDINGS (Blockieren die App-Erfahrung)

### F1: Match-Chat (Trash-Talk) fehlt komplett
**Fundort:** `/match/:id` (MatchDetailPage.tsx)  
**Problem:** Lastenheft definiert "Tab 2: Trash-Talk" mit Mini-Chatroom pro Match. Derzeit ist NUR die Tipp-Liste implementiert. Der Liga-Chat existiert (`LeagueChat.tsx`), aber kein Match-Chat.  
**Ursache:** Code nur für Tipps, kein zweiter Tab, keine `chat_messages`-Integration.  
**Fix:** `LeagueChat.tsx` zu wiederverwendbarer `ChatRoom`-Komponente umbauen, dann auf MatchDetailPage als zweiten Tab einbauen. DB-Tabelle `chat_messages` existiert laut Lastenheft, muss geprüft werden.  
**Aufwand:** ~45 Min

### F2: Liga-Erstellen/Beitreten Formular öffnet nicht
**Fundort:** `/#/league` (Klick auf "LIGA BEITRETEN")  
**Problem:** Klick auf "Liga beitreten" setzt `zeigeBeitreten = true`, aber das Formular (Input + Button) wird nicht sichtbar. Gleiches Verhalten bei "Liga erstellen".  
**Ursache:** Vermutlich State gesetzt, aber Rendering blockiert durch `meineLigen.length === 0` Bedingung oder z-Index/Fixed-Position Issue.  
**Fix:** State-Debugging, ggf. `useEffect` zum Loggen, Conditional-Rendering prüfen.  
**Aufwand:** ~30 Min

### F3: Tabelle ohne Wettbewerbs-Farbcodierung
**Fundort:** `/#/tabelle` (StandingsPage)  
**Problem:** `CL GRUPPENPHASE`, `ABSTIEG` etc. sind nur Text unter der Tabelle. Farbliche Positionsleisten und Abstiegs-Trennlinie (wie im Leaderboard implementiert) fehlen.  
**Fix:** Gleiche Farbcodierung wie Leaderboard (Grün=CL, Smaragd=CL-Quali, Blau=EL, Himmel=Conference, Rot=Abstieg), dicke rote Trennlinie zwischen 16/17.  
**Aufwand:** ~25 Min

### F4: Bonus-Tipps ohne Auswahl-Optionen
**Fundort:** `/#/bonus` (BonusTipsPage)  
**Problem:** Drei Fragen (Meister, Meiste Tore, Wenigste Gegentore) zeigen nur "Keine Antwort". Bei freigeschalteten Tipps müssen Team-Dropdowns/Suchfelder erscheinen.  
**Fix:** Dropdown/Select mit allen 19 Teams + Team-Wappen, Search/Filter, "Tipp speichern"-Button. Gesperrt-Zustand: Dropdowns disabled + Schloss-Icon.  
**Aufwand:** ~40 Min

### F14: Liga-Auswahl-Screen vor Detailansicht
**Fundort:** `/#/league`  
**Problem:** User in mehreren Ligen sehen nur die erste/aktive. Kein Überblick über alle Ligen.  
**Fix:** Neuer Liga-Auswahl-Screen mit Grid/Carousel aus Liga-Cards (Name, Mitgliederzahl, eigener Rang). Klick öffnet Detailansicht. "Erstellen"/"Beitreten" als Bottom-Actions. Bei nur 1 Liga: Back-Button zur Auswahl.  
**Aufwand:** ~45 Min

---

## 🟡 WICHTIGE UX-VERBESSERUNGEN

### F5: Tabelle-Spaltenheader unklar (T, GT, DIFF)
**Fundort:** `/#/tabelle`  
**Problem:** "T" (Tore), "GT" (Gegentore), "DIFF" sind Abkürzungen — für Nicht-Fußball-Fans unverständlich.  
**Fix:** Tooltips mit `title`-Attribut oder ausgeschriebene Labels auf breiteren Screens.  
**Aufwand:** ~10 Min

### F6: Profil-Toggles ohne visuelles Feedback
**Fundort:** `/#/profile`  
**Problem:** Benachrichtigungs-Toggles klicken löst keinen Toast/Hinweis aus. User weiß nicht ob die Änderung gespeichert wurde.  
**Fix:** Toast bei Toggle-Änderung ("Benachrichtigung vor Anpfiff aktiviert").  
**Aufwand:** ~10 Min

### F7: Platzierung "#TES" unklar
**Fundort:** `/#/profile`  
**Problem:** "#TES" zeigt die ersten 3 Buchstaben des Usernamens, nicht die tatsächliche Platzierung. Bei `test` sieht es nach "Test" aus.  
**Fix:** Entweder `#—` wenn kein Rang, oder echte Platzierung berechnen und anzeigen.  
**Aufwand:** ~15 Min

### F8: Fehlende Tipps-Leerzustände
**Fundort:** `/#/dashboard`, Leaderboard, Tabelle  
**Problem:** Tabelle zeigt alle Teams mit 0 Punkten — macht keinen Sinn vor Saisonstart. Leaderboard leer. Kein Hinweis "Saison startet bald".  
**Fix:** Saison-Countdown oder "Tabelle wird mit ersten Ergebnissen berechnet" Hinweis.  
**Aufwand:** ~20 Min

---

## 🟢 POLITUREN (Schnell umsetzbar)

### F9: Regelwerk-Button tut nichts
**Fundort:** `/#/profile` → "Regelwerk"  
**Problem:** Navigiert zu `/rules`, aber RulesPage wird nicht gefunden (Lazy-Load-Problem?)  
**Fix:** Route prüfen, Lazy-Load debuggen.  
**Aufwand:** ~10 Min

### F10: Kein Swipe/Horizontal-Scroll für Spieltage
**Fundort:** `/#/dashboard`  
**Problem:** 38 Spieltage als horizontale Button-Liste — kein Touch-Swipe, kein "Springe zu aktuellem Spieltag".  
**Fix:** `scrollIntoView` auf aktuellen Spieltag, Pfeil-Buttons für Vor/Zurück.  
**Aufwand:** ~15 Min

### F11: Avatar-Upload ohne Hilfetext
**Fundort:** `/#/profile`  
**Problem:** Avatar ist klickbar (Kamera-Icon bei Hover), aber kein Text "Tippen zum Ändern" oder "JPG/PNG · max. 2 MB".  
**Fix:** Tooltip oder kleiner Hilfetext unter dem Avatar.  
**Aufwand:** ~5 Min

### F12: Login-Fehlermeldung zu technisch
**Fundort:** `/login`  
**Problem:** "Invalid login credentials" — könnte freundlicher sein: "Benutzername oder Passwort falsch".  
**Fix:** Fehlermeldung in `LoginPage.tsx` anpassen.  
**Aufwand:** ~3 Min

### F13: Kein Toast/Feedback bei Username-Änderung
**Fundort:** `/#/profile`  
**Problem:** Username wird beim Verlassen des Feldes (`onBlur`) gespeichert, aber kein visuelles Feedback.  
**Fix:** Toast "Benutzername gespeichert" nach erfolgreichem Update.  
**Aufwand:** ~5 Min

---

## Geschätzte Gesamtzeit
- 🔴 Kritisch: ~185 Min
- 🟡 Wichtig: ~55 Min  
- 🟢 Politur: ~38 Min
- **Gesamt: ~278 Min (~4,5 Std)**

---

## Umsetzungsreihenfolge
1. F2 (Liga-Formular-Fix) — weil andere Fixes darauf aufbauen
2. F14 (Liga-Auswahl-Screen) — macht Liga-Sektion übersichtlich
3. F4 (Bonus-Auswahl) — Kernfeature unvollständig
4. F1 (Match-Chat) — größte Lücke zum Lastenheft
5. F3 (Tabellen-Farben) — visuell wichtig
6. F5-F8 (Wichtige Verbesserungen)
7. F9-F13 (Polituren)

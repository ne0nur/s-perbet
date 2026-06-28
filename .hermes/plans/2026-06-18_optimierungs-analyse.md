# Tipprunde App — Optimierungs-Analyse

> Stand: 18.06.2026 — Saison 2026/27 noch nicht gestartet, Tipps gesperrt

---

## 🔴 PRIORITÄT HOCH (User-facing Issues)

### 1. Splash Screen zeigt immer, auch bei eingeloggtem User
**Betroffen:** `SplashPage.tsx`  
**Problem:** `useEffect` navigiert nach 2s hart zu `/login` — keine Prüfung ob User schon eingeloggt ist.  
**Lösung:** Check `isEingeloggt` → direkt zu `/dashboard` wenn true.

### 2. MatchDetailPage: Keine Avatare in der Tipp-Liste
**Betroffen:** `MatchDetailPage.tsx:155`  
**Problem:** Zeile 155 zeigt `<UserIcon size={14} />` statt des echten Profilbilds. `profile.avatar_url` wird zwar aus der DB geladen (Zeile 56: `profile:profiles(username, avatar_url)`), aber nie gerendert.  
**Lösung:** `tip.profile?.avatar_url` als `<img>` rendern mit Fallback auf Initiale.

### 3. MatchDetailPage: Tipps-Vor-Anpfiff-Check ist client-seitig
**Betroffen:** `MatchDetailPage.tsx:86`  
**Problem:** `istVorAnpfiff` checkt `new Date(match.anpfiff) > new Date()` — Client-Uhrzeit kann differieren. RLS blockiert zwar serverseitig, aber UI zeigt falschen Zustand wenn Client-Uhrzeit abweicht.  
**Lösung:** Zusätzlich `match.status === 'upcoming'` prüfen oder Server-Zeit via Supabase.

### 4. Liga-Seite: kein "Keine Liga"-Zustand
**Betroffen:** `LeaguePage.tsx`  
**Problem:** User ohne Liga sieht nur Ladespinner oder leere Seite.  
**Lösung:** Prominenter "Liga erstellen/beitreten"-Screen mit beiden Optionen.

---

## 🟡 PRIORITÄT MITTEL (UX-Verbesserungen)

### 5. Session-Persistenz beim Reload
**Betroffen:** `SplashPage.tsx`, `ProtectedRoute.tsx`  
**Problem:** Page-Reload zeigt kurz Splash → Login, obwohl Session in Supabase noch gültig ist. `ladeUser()` in `authStore` lädt asynchron — währenddessen ist `isLaden=true`.  
**Lösung:** `ProtectedRoute` zeigt während `isLaden` einen Skeleton/Spinner **auf der aktuellen Route**, nicht Splash. Splash nur beim initialen App-Start ohne bestehende Session.

### 6. Keine Toast-Notifications
**Betroffen:** Gesamte App  
**Problem:** Erfolgs-/Fehler-Meldungen nur inline (z.B. Login-Fehler, Admin-User-Erstellung). Keine transienten Toasts für: Profil gespeichert, Bild-Upload ok, Liga-Code kopiert.  
**Lösung:** Einfaches Toast-System (z.B. `react-hot-toast` oder eigenes 20-Zeilen-Zustand-Ding).

### 7. Pull-to-Refresh fehlt
**Betroffen:** DashboardPage, StandingsPage, LeaguePage  
**Problem:** Keine native Pull-to-Refresh-Geste.  
**Lösung:** `overscroll-behavior` CSS + einfacher `touch`-Handler oder Browser-native PWA.

### 8. Bundle-Größe (518 KB)
**Betroffen:** Build-Output  
**Problem:** Ein Chunk mit allen Seiten — kein Code-Splitting.  
**Lösung:** `React.lazy` + `Suspense` für Seiten-Routen. Spart ~200-300 KB auf Erstladezeit.

---

## 🟢 PRIORITÄT NIEDRIG (Nice-to-Have / Zukunft)

### 9. Fehlende Routen
- `LeaderboardPage` existiert, ist aber nicht in App.tsx als Route registriert
- `SuperLigTablePage` (290 Zeilen) nicht eingebunden — Tabelle ist Teil von LeaguePage
- **Lösung:** Unbenutzte Seiten entfernen oder einbinden

### 10. Kein Favicon / PWA-Manifest
**Betroffen:** `index.html`  
**Problem:** Kein Favicon, keine Apple-Touch-Icons, kein `manifest.json`.  
**Lösung:** `public/favicon.ico`, `public/manifest.json`, iOS-Meta-Tags.

### 11. Realtime-Updates für Live-Spiele fehlen
**Betroffen:** DashboardPage, MatchDetailPage  
**Problem:** Match-Status/Tore werden nur beim initialen Laden geholt, nicht via Supabase Realtime.  
**Lösung:** `supabase.channel('matches').on('UPDATE', ...)` bei `status === 'live'`.

### 12. Error Boundary fehlt
**Betroffen:** Gesamte App  
**Problem:** Ein React-Fehler crasht die ganze App (weißer Bildschirm).  
**Lösung:** `<ErrorBoundary>` um `<Routes>` mit "Zurück zum Dashboard"-Button.

### 13. DB: Standings als View / materialized
**Betroffen:** `StandingsPage.tsx`, `LeaguePage.tsx`  
**Problem:** Tabelle wird client-seitig aus allen Matches berechnet — 342 Matches × 2 Teams = O(n).  
**Lösung:** PostgreSQL View `standings_view` + Trigger-Update bei `matches.status = 'finished'`.

### 14. MatchCard: DB-Call pro Karte trotz deaktivierter Tipps
**Betroffen:** `MatchCard.tsx` via `useTipStore`  
**Problem:** `getTippFuerMatch` durchsucht `meineTipps[]` lokal — harmlos (O(n) Memory-Lookup), aber `ladeMeineTipps` in DashboardPage macht weiterhin DB-Call.  
**Lösung:** `ladeMeineTipps` skippen wenn `!TIPPS_FREIGESCHALTET`.

### 15. Bonus-Tipps: Teams-Liste hardcoded
**Betroffen:** `BonusTipsPage.tsx:15-19`  
**Problem:** 22 Teams im Array — bei Saison-Wechsel manuell zu pflegen.  
**Lösung:** Teams aus `matches`-Tabelle distinct laden.

### 16. Kein TypeScript Strict Mode
**Betroffen:** `tsconfig.json`  
**Problem:** `"strict": true` ist nicht gesetzt — potenzielle `null`/`undefined`-Bugs.  
**Lösung:** `strict: true` + Fehler fixen.

---

## 📊 Zusammenfassung

| Prio | Anzahl | Aufwand |
|------|--------|---------|
| 🔴 Hoch | 4 | ~2h |
| 🟡 Mittel | 4 | ~3h |
| 🟢 Niedrig | 8 | ~5h |

**Empfohlene nächste Schritte:**
1. Splash-Screen-Auth-Check + MatchDetail-Avatare zuerst (Prio 🔴)
2. Liga-Leerzustand + Toast-System (Prio 🟡)
3. Error Boundary + Favicon (Prio 🟢)

# WM 2026: KO-Phasen korrigieren (DB-Matches ≠ echter Spielplan)

> **Problem:** ESPN-API hat falsche KO-Matches importiert. Congo DR–Uzbekistan, Colombia–Portugal,
> Jordan–Argentina, Algeria–Austria sind keine echten WM-Paarungen.
> Argentina–Cape Verde und Colombia–Ghana liegen in Spieltag 5 statt 4.

---

## IST-Zustand (DB — FALSCH)

| Spieltag | Match | Status | Problem |
|----------|-------|--------|---------|
| 4 | **Congo DR – Uzbekistan** | finished | ❌ Fake-Match |
| 4 | **Colombia – Portugal** | finished | ❌ Fake-Match |
| 4 | **Jordan – Argentina** | finished | ❌ Fake-Match |
| 4 | **Algeria – Austria** | finished | ❌ Fake-Match |
| 4 | South Africa – Canada | finished | ✅ |
| 4 | Brazil – Japan | upcoming | ✅ |
| 4–4 | 12 weitere | upcoming | ✅ |
| **5** | **Argentina – Cape Verde** | upcoming | ❌ gehört in S4 |
| **5** | **Colombia – Ghana** | upcoming | ❌ gehört in S4 |
| 5 | Canada vs R32 Winner | upcoming | ❌ Canada ist raus |

---

## SOLL (laut echtem Spielplan)

### Sechzehntelfinale (Spieltag 4) — 16 Matches:
```
Südafrika – Kanada          (finished: Südafrika)
Brasilien – Japan
Deutschland – Paraguay
Niederlande – Marokko
Elfenbeinküste – Norwegen
Frankreich – Schweden
Mexiko – Ecuador
England – DR Kongo
Belgien – Senegal
USA – Bosnien-Herzegowina
Portugal – Kroatien
Spanien – Österreich
Schweiz – Algerien
Argentinien – Kap Verde     ← von S5 nach S4
Kolumbien – Ghana           ← von S5 nach S4
Australien – Ägypten
```

### Achtelfinale (Spieltag 5) — 8 Slots:
```
Sieger S4-Match1 – Sieger S4-Match2
... (Platzhalter bis Ergebnisse feststehen)
```

---

## Implementierung (3 Phasen)

### Phase 1: DB bereinigen (SQL)

**Datei:** `supabase/migrations/040_fix_wm_knockout.sql` (NEU)

```sql
-- 1. Lösche 4 Fake-Matches (Congo DR, Jordan, Algeria matches + Colombia-Portugal)
DELETE FROM matches 
WHERE tournament = 'World Cup 2026' 
  AND spieltag = 4 
  AND id IN (
    SELECT id FROM matches 
    WHERE tournament = 'World Cup 2026' AND spieltag = 4
    AND (
      (heim_team = 'Congo DR' AND gast_team = 'Uzbekistan')
      OR (heim_team = 'Colombia' AND gast_team = 'Portugal')
      OR (heim_team = 'Jordan' AND gast_team = 'Argentina')
      OR (heim_team = 'Algeria' AND gast_team = 'Austria')
    )
  );

-- 2. Verschiebe Argentina–Cape Verde von S5 nach S4
UPDATE matches SET spieltag = 4
WHERE tournament = 'World Cup 2026' AND spieltag = 5
  AND heim_team = 'Argentina' AND gast_team = 'Cape Verde';

-- 3. Verschiebe Colombia–Ghana von S5 nach S4  
UPDATE matches SET spieltag = 4
WHERE tournament = 'World Cup 2026' AND spieltag = 5
  AND heim_team = 'Colombia' AND gast_team = 'Ghana';

-- 4. Lösche Canada aus Achtelfinale (ist raus)
DELETE FROM matches
WHERE tournament = 'World Cup 2026' AND spieltag = 5
  AND heim_team = 'Canada';

-- 5. Lösche Tipps für gelöschte Matches
DELETE FROM tips WHERE match_id IN (
  SELECT id FROM matches WHERE tournament = 'World Cup 2026' AND spieltag = 4
  AND (heim_team IN ('Congo DR','Jordan','Algeria') OR gast_team IN ('Uzbekistan','Argentina','Austria'))
);
```

### Phase 2: Spieltag-Ergebnisse setzen

Bereits gespielte Sechzehntelfinal-Matches:
- Südafrika – Kanada → Ergebnis aus DB prüfen und ggf. auf `finished` setzen

### Phase 3: Build & Deploy

Keine Code-Änderungen nötig — nur DB-Fix.

---

**Geschätzt:** 15 Minuten (SQL + Test)

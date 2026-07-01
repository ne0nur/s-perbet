# RivalInspector: Gegner-Erfolge anzeigen — Implementation Plan

> **Für Hermes:** Task für Task abarbeiten, nach jedem Task commiten.

**Ziel:** Im Vergleichsfenster (RivalInspector) die freigeschalteten Erfolge des Gegners anzeigen — sortiert nach Seltenheit (ascending), mit EXP-Badge wie im eigenen Profil.

**Architektur:** `computeUserStats` evaluiert bereits die Achievements des Rivalen via `evaluateAchievements` (client-seitig, nutzt dessen Tipps + Profil). Das `unlockedSet` wird aktuell nur für den Count genutzt. Wir geben zusätzlich das Set zurück und rendern eine Achievement-Grid-Komponente im Single-Mode und ggf. H2H-Mode.

**Tech Stack:** React, TypeScript, Tailwind, bestehende `AchievementBadge` + `RarityPill` Komponenten aus `AchievementsSection.tsx`

---

### Task 1: `unlockedSet` aus `computeUserStats` zurückgeben

**Objective:** `computeUserStats` gibt zusätzlich `unlockedAchievements: Set<string>` zurück.

**Files:**
- Modify: `src/components/RivalInspector.tsx:177-232`

**Änderung:** Am Ende des Return-Objekts von `computeUserStats` ergänzen:

```typescript
return { 
  totalTips: tArr.length, 
  totalFinished, 
  avgPoints: Number(avgPoints), 
  achievementsCount, 
  unlockedAchievements: unlockedSet,  // ← NEU
  level: lvlDetails.level, 
  spieltagPunkte, 
  xpPct: lvlDetails.xpPct, 
  xpCurrent: lvlDetails.xpCurrent, 
  xpRequired: lvlDetails.xpRequired,
  exact: p.exakte_treffer || 0,
  total: totalPoints
}
```

**Verify:** `npm run build` — keine TypeScript-Fehler.

---

### Task 2: Achievement-Grid im Single-Mode rendern

**Objective:** Unter der Formkurve eine Sektion mit den Erfolgen des Rivalen anzeigen.

**Files:**
- Modify: `src/components/RivalInspector.tsx` (nach Zeile 510, vor "Tipp-Historie")

**Änderung:** Neue Sektion einfügen:

```tsx
{/* ─── Single Mode: Erfolge ─── */}
{!isH2H && rivalStats && rivalStats.unlockedAchievements.size > 0 && (
  <div className="space-y-2">
    <div className="flex items-center gap-1 text-[9px] font-mono text-on-surface-variant uppercase tracking-wider">
      <Award size={11} className="text-primary" /> {t('myAchievements')} ({rivalStats.unlockedAchievements.size})
    </div>
    <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
      {getAchievementsList(language)
        .filter(ach => rivalStats.unlockedAchievements.has(ach.id))
        .sort((a, b) => {
          const aCfg = RARITY_CONFIG[mapRarity(a.rarity)]
          const bCfg = RARITY_CONFIG[mapRarity(b.rarity)]
          return (aCfg?.order ?? 99) - (bCfg?.order ?? 99)
        })
        .map(ach => {
          const cfg = RARITY_CONFIG[mapRarity(ach.rarity)]
          return (
            <div key={ach.id} className={`flex flex-col items-center gap-1 p-1.5 rounded-lg border ${cfg.border} ${cfg.bg} ${cfg.glow} transition-all hover:scale-105`}>
              <AchievementBadge id={ach.id} unlocked={true} rarity={mapRarity(ach.rarity)} />
              <span className={`text-[7px] font-mono font-bold ${cfg.text}`}>+{cfg.exp}</span>
            </div>
          )
        })}
    </div>
  </div>
)}
```

**Benötigte Imports:** 
- `AchievementBadge` aus `./profile/AchievementsSection` importieren
- `getAchievementsList`, `mapRarity`, `RARITY_CONFIG` aus `./profile/AchievementsSection` importieren (müssen ggf. exportiert werden)

**Verify:** `npm run build` und visuell testen — Gegner-Profil öffnen, Erfolge sollten als Grid erscheinen.

---

### Task 3: H2H-Mode: Erfolge beider Spieler vergleichen

**Objective:** Im H2H-Mode eine Achievement-Vergleichsleiste analog zu den CompareBars einfügen.

**Files:**
- Modify: `src/components/RivalInspector.tsx` (nach CompareBar-Sektion, vor H2H-Chart)

**Änderung:** Neue CompareBar für Erfolge:

```tsx
<CompareBar 
  label="Erfolge (EXP)" 
  myVal={myStats.unlockedAchievements ? Array.from(myStats.unlockedAchievements).reduce((sum, id) => {
    const ach = getAchievementsList(language).find(a => a.id === id)
    return sum + (RARITY_CONFIG[mapRarity(ach?.rarity || 'gewoehnlich')]?.exp || 50)
  }, 0) : 0} 
  rivalVal={rivalStats.unlockedAchievements ? Array.from(rivalStats.unlockedAchievements).reduce((sum, id) => {
    const ach = getAchievementsList(language).find(a => a.id === id)
    return sum + (RARITY_CONFIG[mapRarity(ach?.rarity || 'gewoehnlich')]?.exp || 50)
  }, 0) : 0} 
/>
```

**Verify:** `npm run build`, H2H-Vergleich öffnen — Erfolge-EXP-Balken sollte sichtbar sein.

---

### Task 4: `AchievementBadge`, `getAchievementsList`, `mapRarity`, `RARITY_CONFIG` exportieren

**Objective:** Diese Utilities aus `AchievementsSection.tsx` exportieren, damit RivalInspector sie importieren kann.

**Files:**
- Modify: `src/components/profile/AchievementsSection.tsx`

**Änderungen:**
- `export function AchievementBadge(...)` (bereits exportiert via named export? Checken)
- `export function getAchievementsList(...)` 
- `export function mapRarity(...)` 
- `export const RARITY_CONFIG` (bereits top-level, checken ob exportiert)

Falls nicht exportiert: `export` vor jede Deklaration setzen.

**Verify:** `npm run build` — keine Import-Fehler im RivalInspector.

---

### Task 5: Build, Commit, Push

```bash
npm run build
git add -A
git commit -m "rival-inspector: gegner-erfolge anzeigen (single + h2h)"
git push
```

---

### Offene Fragen / Risiken

1. **Performance:** `evaluateAchievements` läuft client-seitig für den Rivalen. Bei vielen Tipps könnte das kurz ruckeln. Aktuell haben alle User < 20 Tipps → unkritisch.

2. **H2H-CompareBar-EXP-Berechnung:** Die `reduce`-Logik für EXP-Summe ist etwas heavy für ein JSX-Attribut. Besser in eine `useMemo` auslagern → Task 3 entsprechend anpassen.

3. **`getAchievementsList(language)`** wird in RivalInspector aufgerufen, obwohl die Funktion aktuell nur in AchievementsSection definiert ist. Muss exportiert werden (Task 4).

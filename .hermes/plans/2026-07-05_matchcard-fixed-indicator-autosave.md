# MatchCard: Fixierter Status-Indikator + reiner Auto-Save Plan

> **Für Hermes:** Tasks nacheinander ausführen. Commit nach jeder Task.

**Goal:** Button wird zum reinen Status-Indikator ohne manuellen Save. Feste Breite (kein UI-Shift). Auto-Save sofort nach jeder Änderung (debounce). KO-Spiele: kein Unentschieden.

**Architecture:** Button von interaktivem Save-Button → reiner Status-Indikator. Auto-Save läuft ausschließlich über den Debounce-UseEffect. KO-Validierung im Stepper `onChange` (verhindert gleiche Werte).

**Tech Stack:** React 19, Framer Motion, Tailwind 4

---

## Task 1: Button auf feste Breite + reinen Status-Indikator umbauen

**Objective:** Button bekommt `min-w-[84px]` und `justify-center`, keine Layout-Shifts mehr. onClick entfernt, Cursor auf default.

**Files:**
- Modify: `src/components/MatchCard.tsx:449-500`

**Step 1: Button umbauen**

Ersetze den gesamten Button-Block (Zeilen 449-500) durch:

```tsx
            {/* Status-Indikator (kein manueller Save) */}
            <div
              className={`flex-shrink-0 w-[84px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-full text-[11px] font-mono font-bold uppercase tracking-wider transition-all duration-300 ${
                !isOnline
                  ? 'bg-red-500/10 border border-red-500/20 text-red-400'
                  : isSaving
                    ? 'bg-primary-container/10 border border-primary-container/20 text-primary-fixed-dim'
                    : saved
                      ? 'bg-green-500/20 border border-green-500/40 text-green-400 shadow-[0_0_12px_rgba(34,197,94,0.2)]'
                      : hasChanges
                        ? pending
                          ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
                          : 'bg-primary-container/10 border border-primary-container/20 text-primary-fixed-dim'
                        : 'bg-green-500/10 border border-green-500/20 text-green-400/70'
              }`}
            >
              <AnimatePresence mode="wait">
                {!isOnline ? (
                  <motion.span key="offline" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-1.5"><WifiOff size={12} /> Offline</motion.span>
                ) : isSaving ? (
                  <motion.div key="saving" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-3.5 h-3.5 border-2 border-primary-fixed-dim border-t-transparent rounded-full animate-spin" />
                ) : saved ? (
                  <motion.span key="saved" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} transition={{ type: 'spring', stiffness: 500, damping: 15 }} className="flex items-center gap-1.5">
                    <Check size={16} className="stroke-[3]" />
                  </motion.span>
                ) : hasChanges && pending ? (
                  <motion.span key="pending" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  </motion.span>
                ) : hasChanges ? (
                  <motion.span key="unsaved" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  </motion.span>
                ) : (
                  <motion.span key="saved-idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-1.5 opacity-70">
                    <Check size={14} className="stroke-[3]" />
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
```

**Wichtig:** 
- `<motion.button>` → `<div>` (kein Klick mehr nötig)
- `w-[84px]` statt `px-4` (fixe Breite)
- Text entfernt aus pending/unsaved states (nur noch Dot-Indikator)
- `onClick` und `disabled` komplett entfernt

**Step 2: Build & Commit**

```bash
npm run build && git add -A && git commit -m "fix: fixed-width status indicator, no layout shift"
```

---

## Task 2: handleSpeichern-Funktion entfernen

**Objective:** Da der Button kein Klick-Target mehr ist, `handleSpeichern` komplett löschen.

**Files:**
- Modify: `src/components/MatchCard.tsx:185-245` (handleSpeichern entfernen)

**Step 1: handleSpeichern löschen**

Lösche die gesamte `handleSpeichern`-Funktion (Zeilen 191-245). Der Auto-Save-UseEffect übernimmt alles.

**Step 2: Build & Commit**

```bash
npm run build && git add -A && git commit -m "refactor: remove manual save handler, auto-save only"
```

---

## Task 3: KO-Validierung in Stepper + Auto-Save integrieren

**Objective:** Bei KO-Spielen verhindern dass heim === gast. Validierung im `Stepper.onChange` und im Auto-Save-UseEffect.

**Files:**
- Modify: `src/components/MatchCard.tsx:48-89` (Stepper)
- Modify: `src/components/MatchCard.tsx:142-160` (Auto-Save-UseEffect)

**Step 1: Stepper onChange mit KO-Check**

Erweitere die Stepper-Komponente um eine `onValidate`-Prop:

```tsx
function Stepper({ value, onChange, disabled, onValidate }: { 
  value: number; onChange: (v: number) => void; disabled?: boolean;
  onValidate?: (v: number) => boolean;
}) {
  const tryChange = (newVal: number) => {
    if (onValidate && !onValidate(newVal)) return
    onChange(newVal)
  }
  return (
    <div className="flex items-center gap-2">
      <motion.button ... onClick={(e) => { e.stopPropagation(); tryChange(Math.max(0, value - 1)) }}>
        <Minus size={13} />
      </motion.button>
      ...
      <motion.button ... onClick={(e) => { e.stopPropagation(); tryChange(Math.min(20, value + 1)) }}>
        <Plus size={13} />
      </motion.button>
    </div>
  )
}
```

**Step 2: KO-Validierung in MatchCard einbauen**

```tsx
// KO-Draw-Validierung für Stepper
const validateKoNoDraw = (newVal: number, isHeim: boolean): boolean => {
  if (!isKoMatch) return true
  const other = isHeim ? tippGast : tippHeim
  if (newVal === other) {
    useToastStore.getState().toast(
      language === 'tr' ? 'Eleme maçları berabere bitemez!' : 
      language === 'en' ? 'KO matches cannot end in a draw!' : 
      'KO-Spiele können nicht Unentschieden enden!', 
      'error'
    )
    return false
  }
  return true
}
```

Dann im JSX:
```tsx
<Stepper value={tippHeim} onChange={setTippHeim} disabled={isSaving || !isOnline} onValidate={(v) => validateKoNoDraw(v, true)} />
<Stepper value={tippGast} onChange={setTippGast} disabled={isSaving || !isOnline} onValidate={(v) => validateKoNoDraw(v, false)} />
```

**Step 3: Auto-Save-UseEffect um KO-Check ergänzen**

```tsx
// Auto-Save: debounce 1.5s nach letzter Änderung
useEffect(() => {
  if (!initialized.current) return
  if (readOnly || !istUpcoming || !tippsFreigeschaltet || !isOnline) return
  if (!hasChanges) return
  // KO: Kein Speichern bei Unentschieden
  if (isKoMatch && tippHeim === tippGast) return

  setPending(true)
  // ... rest bleibt gleich
}, [tippHeim, tippGast])
```

**Step 4: Build & Commit**

```bash
npm run build && git add -A && git commit -m "feat: KO no-draw validation in stepper + auto-save"
```

---

## Task 4: Übersetzungen für KO-Message bereinigen

**Objective:** Die KO-Message aus `handleSpeichern` (wird gelöscht) als Translation-Key sichern falls sie nur dort existierte.

**Files:**
- Prüfen: `src/utils/translations.ts`

**Step 1: Prüfen ob `koNoDraw` schon als Key existiert**

```bash
rg "koNoDraw|KO.*Unentschieden|Eleme.*berabere" src/utils/translations.ts
```

Falls nicht → neuen Key `koNoDraw` in allen 3 Sprachen anlegen und in `validateKoNoDraw` nutzen.

**Step 2: Build & Commit**

```bash
npm run build && git add -A && git commit -m "i18n: koNoDraw translation key"
```

---

## Checklist

- [ ] Task 1: Button fixed width, reiner Status-Indikator
- [ ] Task 2: handleSpeichern entfernt
- [ ] Task 3: KO-Validierung in Stepper + Auto-Save
- [ ] Task 4: i18n für KO-Message
- [ ] Abschluss: `git push origin main`

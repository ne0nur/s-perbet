# KO-Validierung: Smart-Ignore statt Block — Plan

**Goal:** KO-Draw-Validierung blockiert nicht mehr die Stepper, sondern warnt nur und verhindert das Speichern. User kann Werte frei durchwechseln.

**Problem:** Aktuell blockiert `validateKoNoDraw` den Stepper sofort wenn heim === gast. Man kann Tipps nicht tauschen (2:1 → 1:2), weil der Zwischenzustand (1:1) geblockt wird.

**Lösung:** Stepper immer frei schaltbar. Draw-Erkennung nur noch im Auto-Save-UseEffect + visuelles Warn-Icon im Status-Indikator.

---

## Task 1: onValidate aus Steppern entfernen

**Objective:** Stepper akzeptieren immer alle Werte. KO-Check nur noch beim Speichern.

**Files:**
- Modify: `src/components/MatchCard.tsx`

**Step 1: onValidate-Prop und validateKoNoDraw entfernen**

- Entferne `validateKoNoDraw` Funktion aus der IIFE
- Entferne `onValidate` aus beiden `<Stepper>` Komponenten
- `tryChange` in der Stepper-Komponente kann bleiben (schadet nicht)

**Step 2: Auto-Save-UseEffect behält KO-Check**

```tsx
// Auto-Save: KO-Check verhindert nur das Speichern, nicht die Eingabe
if (isKoMatch && tippHeim === tippGast) return  // ← bleibt, verhindert nur Save
```

**Step 3: Status-Indikator zeigt Warnung bei KO-Draw**

```tsx
// Neuer Zustand: koDrawWarning
const koDrawWarning = isKoMatch && tippHeim === tippGast && hasChanges

// Im Status-Indikator:
{koDrawWarning ? (
  <motion.span key="kodraw" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
    <AlertTriangle size={18} className="text-amber-400" />
  </motion.span>
) : pending ? (
  // SVG Progress Ring
) : ... }
```

**Step 4: Icon-Import hinzufügen**

```tsx
import { ..., AlertTriangle } from 'lucide-react'
```

---

## Resultat

| Zustand | Anzeige | Verhalten |
|---|---|---|
| Normal (≠) | ✓ dim / Ring / Spinner | Auto-Save aktiv |
| KO-Draw (=) | ⚠️ Amber Warndreieck | Kein Auto-Save, User muss ändern |
| Offline | WifiOff | Kein Save möglich |

User kann jetzt 2:1 → 1:2 tippen: 2→1 (kurz 1:1 ⚠️ Warnung), dann 1→2 (1:2 ✓ speichert).

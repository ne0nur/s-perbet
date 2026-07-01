# Podium-Badges: Icons → Animierte Zahlen (Monr-Font)

> **Für Hermes:** superbet-development + plan Skills geladen.

**Goal:** Crown/Medal-Icons im GLOBAL-Podium durch animierte Rang-Zahlen in Monr-Schrift ersetzen — mit Effekten auf LevelBadge-Niveau.

**Architecture:** Neue `PodiumBadge`-Komponente. GlobalPage-Podium nutzt sie statt der Icon-Circles.

---

## Task 1: PodiumBadge-Komponente erstellen

**File:** `src/components/ui/PodiumBadge.tsx` (Create)

**Props:** `rank: 1 | 2 | 3`, `size?: 'sm' | 'md' | 'lg'`

**Pro Rank:**
| Rank | Farbe | Effekt |
|---|---|---|
| 1 | Gold (`#F2C94C` → `#F2994A`) | Particles (wie LevelBadge), pulsierender Glow, sanfte Rotation |
| 2 | Silber (`#E2E8F0` → `#94A3B8`) | Subtil shimmer, leichter Glow |
| 3 | Bronze (`#CD7F32` → `#A0522D`) | Dezenter Glow, kein Shimmer |

**Font:** `font-family: 'Monr', sans-serif` (wie SüperBET-Logo)
**Größen:** `sm=24px`, `md=32px`, `lg=40px`

**Animationen (CSS @keyframes, ~3s, asynchron):**
- `@keyframes podiumGlow`: pulsierender Box-Shadow
- `@keyframes podiumFloat`: sanftes Schweben (3.8s, unabhängig)
- `@keyframes podiumShimmer`: Gold-Shimmer (nur #1, 2.5s cycle)

## Task 2: GlobalPage Podium umbauen

**File:** `src/pages/GlobalPage.tsx` (Modify)

- Gold (#1): Crown-Circle → `<PodiumBadge rank={1} size="lg" />`
- Silber (#2): Medal/Crown-Circle → `<PodiumBadge rank={2} size="md" />`  
- Bronze (#3): Medal-Circle → `<PodiumBadge rank={3} size="sm" />`

Tie-Erkennung beibehalten (tie1_2, tie2_3).

## Task 3: Build, Commit, Deploy

```bash
npx tsc --noEmit && npm run build
git add -A && git commit -m "feat: Podium-Badges mit Monr-Zahlen + Partikel-Animationen"
git push && npx gh-pages -d dist
```

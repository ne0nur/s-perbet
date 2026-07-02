# ESPN Status Names — Edge Function Recognition

## ESPN Status Lifecycle (SOURCE OF TRUTH)

ESPN's API at `site.api.espn.com/apis/site/v2/sports/soccer/{league}/scoreboard` returns
`ev.status.type` with three definitive fields:

| Field | Values | Meaning |
|---|---|---|
| `state` | `"pre"` | Match hasn't started |
| `state` | `"in"` | Match is in progress |
| `state` | `"post"` | **Match is over** — the only reliable finish indicator |
| `completed` | `false` | Match not done |
| `completed` | `true` | **Match is done** — definitive boolean |
| `name` | various | **Display label only — NOT a reliable state indicator** |

### CRITICAL: `state` and `completed` are the source of truth, NOT `name`

**`status.type.name` is a display label.** It varies by sport, broadcaster, and edge case.
Never check `name` to determine whether a match is finished. Always check `state === "post"` 
or `completed === true`.

## Real Data (July 1, 2026 — World Cup)

```
England 2-1 Congo DR
  name=STATUS_FULL_TIME    state=post   completed=True   detail=FT

Belgium 3-2 Senegal
  name=STATUS_FINAL_AET    state=post   completed=True   detail=AET

United States 2-0 Bosnia
  name=STATUS_FULL_TIME    state=post   completed=True   detail=FT

Spain 0-0 Austria
  name=STATUS_SCHEDULED    state=pre    completed=False  detail=Scheduled
```

## Known `status.type.name` Values (for reference only)

| ESPN Name | Occurs When | `state` | `completed` |
|---|---|---|---|
| `STATUS_SCHEDULED` | Before kickoff | `pre` | `false` |
| `STATUS_IN_PROGRESS` | Playing | `in` | `false` |
| `STATUS_HALFTIME` | Half-time break | `in` | `false` |
| `STATUS_HALF_TIME_ET` | Extra time half-time | `in` | `false` |
| `STATUS_SECOND_HALF` | Second half | `in` | `false` |
| `STATUS_EXTRA_TIME` | First half of extra time | `in` | `false` |
| `STATUS_OVERTIME` | Extra time (alt. name) | `in` | `false` |
| `STATUS_SECOND_EXTRA_TIME` | Second half of extra time | `in` | `false` |
| `STATUS_PENALTY` | Penalty shootout | `in` | `false` |
| **`STATUS_FULL_TIME`** | **Regulation finished (NORMAL)** | **`post`** | **`true`** |
| `STATUS_FINAL` | Penalty/group finish | `post` | `true` |
| `STATUS_FINAL_AET` | Finished after extra time | `post` | `true` |
| `STATUS_POSTPONED` | Postponed | `post` | `false` |
| `STATUS_CANCELED` | Canceled | `post` | `false` |

### ⚠️ STATUS_FULL_TIME is NORMAL

Most football matches end in regulation time (90 min + stoppage). ESPN reports these as 
`STATUS_FULL_TIME` with `state: "post"` and `completed: true`. This is THE most common 
finish state and MUST be mapped to `finished`.

Only matches that go to extra time get `STATUS_FINAL_AET`. Only penalty shootout finishes 
get `STATUS_FINAL`.

## Detection Algorithm (Correct)

```ts
const { completed, state, name } = ev.status.type;

// PRIMARY: Definitive finish indicators
if (completed === true || state === "post") {
  // POSTPONED/CANCELED have state="post" but shouldn't be "finished"
  if (name.includes("POSTPONED") || name.includes("CANCELED")) {
    s = "postponed";
  } else {
    s = "finished";  // STATUS_FULL_TIME, STATUS_FINAL, STATUS_FINAL_AET
  }
}
// SECONDARY: Live states (only if completed=false)
else if (name.includes("PENALTY")) s = "live";
else if (name.includes("HALFTIME") || name.includes("HALF_TIME")) { s = "live"; halftime = true; }
else if (name.includes("EXTRA_TIME") || name.includes("OVERTIME") || 
         name.includes("IN_PROGRESS") || name.includes("HALF")) s = "live";
// else: stays "upcoming" (STATUS_SCHEDULED)
```

## Time-Based Fallback (Safety Net Only)

The time-based fallback is a LAST RESORT for when ESPN doesn't return data at all:

```ts
// Only apply when ESPN has NO match data AND time-based conditions are met
// With the correct state/completed detection above, this becomes a rare fallback
if (match.status === "live" && hours > 2.5 && !hasEspnData) ns = "finished";
if (match.status === "live" && hours > 3.5 && hasEspnData) ns = "finished"; // extreme safety
```

## Sync Query

The sync query fetches ALL matches that could need updating:

```ts
.or('status.in.(upcoming,live),
     and(status.eq.finished,tore_heim.is.null),
     and(status.eq.finished,anpfiff.gte.' + (now - 5h).toISOString() + ')')
```

- `upcoming` / `live`: always re-check
- `finished` + no scores: might've been incorrectly marked, re-check
- `finished` + scores + recent (<5h): allow correction if ESPN disagrees

## History of Bugs Caused by Name-Based Detection

| Date | Bug | Root Cause |
|---|---|---|
| 2024-07 | USA-Bosnien stays "live" forever | `STATUS_FULL_TIME && !hasEspnData` gate. ESPN returned data with `STATUS_FULL_TIME` but code only accepted `FINAL` without `FULL_TIME`. Timeout blocked because `hasEspnData=true`. |
| 2024-07 | KO matches finish during extra time | `STATUS_FULL_TIME` at end of regulation mapped to `finished` by old code. Fixed by moving to name-based `FINAL` check — but that introduced the USA-Bosnia bug. |
| (future) | ... | Always use `state`/`completed`, not `name` |

## API Endpoints

```
Base: http://site.api.espn.com/apis/site/v2/sports/soccer/{league}/scoreboard?dates={YYYYMMDD}

League Codes:
  fifa.world       → World Cup
  uefa.champions   → Champions League
  tur.1            → Süper Lig
```

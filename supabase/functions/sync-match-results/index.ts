// supabase/functions/sync-match-results/index.ts
// Edge Function: Sync scores + propagate KO winners through bracket
// Deploy: supabase functions deploy sync-match-results --no-verify-jwt

import { createClient } from "npm:@supabase/supabase-js@2";

const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;

const ESPN_LEAGUE_MAP: Record<string, string> = {
  "Süper Lig": "tur.1",
  "Champions League": "uefa.champions",
  "World Cup 2026": "fifa.world",
};

// ─── WM 2026 Bracket Progression ──────────────────────────────
// [fromSpieltag, fromIndex (by anpfiff), toSpieltag, toSlot (by anpfiff), position]
// S4→S5: Sechzehntelfinale → Achtelfinale
// S5→S6: Achtelfinale → Viertelfinale
// S6→S7: Viertelfinale → Halbfinale
// S7→S8: Halbfinale → Finale + Platz 3 (winner→Final, loser→Platz3)
const WM_BRACKET: [number, number, number, number, "heim" | "gast"][] = [
  // ── S4 → S5 (Sechzehntelfinale → Achtelfinale) ──
  [4, 0,  5, 0, "heim"],  // Südafrika/Kanada → S5[0] heim
  [4, 3,  5, 0, "gast"],  // Niederlande/Marokko → S5[0] gast
  [4, 1,  5, 1, "heim"],  // Brasilien/Japan → S5[1] heim
  [4, 2,  5, 1, "gast"],  // Deutschland/Paraguay → S5[1] gast
  [4, 4,  5, 2, "heim"],  // Elfenbeinküste/Norwegen → S5[2] heim
  [4, 5,  5, 2, "gast"],  // Frankreich/Schweden → S5[2] gast
  [4, 6,  5, 3, "heim"],  // Mexiko/Ecuador → S5[3] heim
  [4, 7,  5, 3, "gast"],  // England/DR Kongo → S5[3] gast
  [4, 8,  5, 4, "heim"],  // Belgien/Senegal → S5[4] heim
  [4, 9,  5, 4, "gast"],  // USA/Bosnien → S5[4] gast
  [4, 11, 5, 5, "heim"],  // Portugal/Kroatien → S5[5] heim
  [4, 10, 5, 5, "gast"],  // Spanien/Österreich → S5[5] gast
  [4, 12, 5, 6, "heim"],  // Schweiz/Algerien → S5[6] heim
  [4, 13, 5, 6, "gast"],  // Australien/Ägypten → S5[6] gast
  [4, 14, 5, 7, "heim"],  // Argentinien/KapVerde → S5[7] heim
  [4, 15, 5, 7, "gast"],  // Kolumbien/Ghana → S5[7] gast
  // ── S5 → S6 (Achtelfinale → Viertelfinale) ──
  [5, 0, 6, 0, "heim"],
  [5, 1, 6, 0, "gast"],
  [5, 2, 6, 1, "heim"],
  [5, 3, 6, 1, "gast"],
  [5, 4, 6, 2, "heim"],
  [5, 5, 6, 2, "gast"],
  [5, 6, 6, 3, "heim"],
  [5, 7, 6, 3, "gast"],
  // ── S6 → S7 (Viertelfinale → Halbfinale) ──
  [6, 0, 7, 0, "heim"],
  [6, 1, 7, 0, "gast"],
  [6, 2, 7, 1, "heim"],
  [6, 3, 7, 1, "gast"],
];

interface MatchRow {
  id: string;
  heim_team: string;
  gast_team: string;
  tore_heim: number | null;
  tore_gast: number | null;
  status: string;
  anpfiff: string;
  spieltag: number;
  tournament: string;
  season: number;
}

interface UpdateResult {
  match: string;
  oldStatus: string;
  newStatus: string;
  score?: string;
  source: "espn" | "time" | "bracket";
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, apikey, x-client-info",
};

function ok(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}
function eresp(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

function cleanName(name: string): string {
  if (!name) return "";
  return name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ı/g, "i").replace(/[^a-z0-9]/g, "");
}

function getDateStr(date: Date): string {
  return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
}

function determineWinner(m: MatchRow): string | null {
  if (m.tore_heim == null || m.tore_gast == null) return null;
  if (m.tore_heim > m.tore_gast) return m.heim_team;
  if (m.tore_gast > m.tore_heim) return m.gast_team;
  return null; // Unentschieden in KO — Verlängerung/Elfmeterschießen nicht abgebildet
}

function determineLoser(m: MatchRow): string | null {
  if (m.tore_heim == null || m.tore_gast == null) return null;
  if (m.tore_heim > m.tore_gast) return m.gast_team;
  if (m.tore_gast > m.tore_heim) return m.heim_team;
  return null;
}

async function fetchEspnScores(tournament: string, dateStr: string) {
  const code = ESPN_LEAGUE_MAP[tournament];
  if (!code) return new Map<string, { homeScore: number; awayScore: number; status: string }>();
  try {
    const res = await fetch(`http://site.api.espn.com/apis/site/v2/sports/soccer/${code}/scoreboard?dates=${dateStr}`);
    if (!res.ok) return new Map();
    const data = await res.json();
    const scores = new Map<string, { homeScore: number; awayScore: number; status: string }>();
    for (const ev of data.events || []) {
      const comp = ev.competitions[0];
      const home = comp.competitors.find((c: { homeAway: string }) => c.homeAway === "home");
      const away = comp.competitors.find((c: { homeAway: string }) => c.homeAway === "away");
      if (!home || !away) continue;
      
      let hScore = parseInt(home.score || "0", 10);
      let aScore = parseInt(away.score || "0", 10);
      
      // Elfmeterschießen dazuaddieren (Userwunsch: summiert wird mit allen Toren inkl. Elfmeterschießen)
      if (home.shootoutScore) hScore += home.shootoutScore;
      if (away.shootoutScore) aScore += away.shootoutScore;

      const key = `${cleanName(home.team?.name || "")}_vs_${cleanName(away.team?.name || "")}`;
      let s = "upcoming";
      const sn = ev.status.type.name;
      if (sn.includes("FULL_TIME") || sn.includes("FINAL")) s = "finished";
      else if (sn.includes("HALF") || sn.includes("IN_PROGRESS")) s = "live";
      else if (sn.includes("POSTPONED") || sn.includes("CANCELED")) s = "postponed";
      
      scores.set(key, { homeScore: hScore, awayScore: aScore, status: s });
    }
    return scores;
  } catch { return new Map(); }
}

// ─── KO Winner Propagation ─────────────────────────────────────
async function propagateKoWinners(
  adminClient: ReturnType<typeof createClient>,
  results: UpdateResult[],
): Promise<number> {
  let bracketUpdates = 0;
  const tournament = "World Cup 2026";

  // Alle KO-Matches ab Spieltag 4
  const { data: koMatches } = await adminClient
    .from("matches")
    .select("*")
    .eq("tournament", tournament)
    .gte("spieltag", 4)
    .order("spieltag", { ascending: true })
    .order("anpfiff", { ascending: true });

  if (!koMatches?.length) return 0;

  // Nach Spieltag gruppieren, Indizes pro Spieltag
  const bySpieltag = new Map<number, MatchRow[]>();
  for (const m of koMatches as MatchRow[]) {
    const arr = bySpieltag.get(m.spieltag) || [];
    arr.push(m);
    bySpieltag.set(m.spieltag, arr);
  }

  // Bracket-Map: key = "spieltag:index" (S4-S6) or "spieltag:index:winner|loser" (S7→S8)
  const bracketMap = new Map<string, { to_spieltag: number; to_slot: number; pos: "heim" | "gast"; outcome?: "winner" | "loser" }>();
  
  // S4-S6 entries: single destination per match
  for (const [fs, fi, ts, ti, pos] of WM_BRACKET) {
    if (fs < 7) {
      bracketMap.set(`${fs}:${fi}`, { to_spieltag: ts, to_slot: ti, pos });
    }
  }
  // S7 entries: TWO destinations (winner→Final, loser→3rd place)
  bracketMap.set("7:0:loser",  { to_spieltag: 8, to_slot: 0, pos: "heim", outcome: "loser" });
  bracketMap.set("7:0:winner", { to_spieltag: 8, to_slot: 1, pos: "heim", outcome: "winner" });
  bracketMap.set("7:1:loser",  { to_spieltag: 8, to_slot: 0, pos: "gast", outcome: "loser" });
  bracketMap.set("7:1:winner", { to_spieltag: 8, to_slot: 1, pos: "gast", outcome: "winner" });

  // Only iterate rounds that have a NEXT round with existing matches
  const spieltags = [...bySpieltag.keys()].sort((a, b) => a - b);

  for (const st of spieltags) {
    const nextSt = st + 1;
    const nextMatches = bySpieltag.get(nextSt);
    if (!nextMatches?.length) continue;

    const currentMatches = bySpieltag.get(st)!;
    for (let i = 0; i < currentMatches.length; i++) {
      const m = currentMatches[i];
      if (m.status !== "finished" || m.tore_heim == null || m.tore_gast == null) continue;

      // S7 has two destinations (winner+loser), others have one
      const keysToCheck = st === 7
        ? [`${st}:${i}:winner`, `${st}:${i}:loser`]
        : [`${st}:${i}`];

      for (const bracketKey of keysToCheck) {
        const slot = bracketMap.get(bracketKey);
        if (!slot) continue;

        const target = nextMatches[slot.to_slot];
        if (!target) continue;

        // Determine team: winner or loser
        const teamName = slot.outcome === "loser" ? determineLoser(m) : determineWinner(m);
        if (!teamName) continue;

        // Skip if already propagated
        if (target[slot.pos + "_team" as keyof MatchRow] === teamName) continue;

        const update = slot.pos === "heim" ? { heim_team: teamName } : { gast_team: teamName };
        const { error: ue } = await adminClient.from("matches").update(update).eq("id", target.id);
        if (!ue) {
          bracketUpdates++;
          const label = slot.outcome === "loser" ? "3.Platz" : "Finale";
          results.push({
            match: `${m.heim_team} vs ${m.gast_team} → ${teamName} → ${label} ${slot.pos}`,
            oldStatus: "propagate", newStatus: "bracket", source: "bracket",
          });
        }
      }
    }
  }

  return bracketUpdates;
}

// ─── Main Handler ──────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const startTime = Date.now();
  const results: UpdateResult[] = [];

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return eresp({ error: "No auth header" }, 401);

    const token = authHeader.replace("Bearer ", "");

    let adminClient: ReturnType<typeof createClient>;

    // Versuche Token direkt als Service-Role-Key (für Cronjobs)
    const testClient = createClient(SUPABASE_URL, token);
    const { data: testData, error: testError } = await testClient
      .from("matches").select("id").limit(1);

    if (!testError && testData) {
      // Gültiger Service-Role-Key → automatisierter Aufruf
      adminClient = testClient;
    } else {
      // User-JWT → Admin-Check
      const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user }, error: authError } = await userClient.auth.getUser();
      if (authError || !user) return eresp({ error: "Unauthorized" }, 401);

      const { data: profile } = await userClient
        .from("profiles").select("is_admin").eq("id", user.id).single();
      if (!profile?.is_admin) return eresp({ error: "Admin only" }, 403);

      adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    }

    // ─── Phase 1: Score Sync ───
    const now = new Date();
    const { data: matches, error: fetchError } = await adminClient
      .from("matches").select("*")
      .not("status", "in", '("finished","postponed")')
      .order("anpfiff", { ascending: true });

    if (fetchError) return eresp({ error: fetchError.message }, 500);

    let scoreUpdates = 0;
    const stats: Record<string, { checked: number; updated: number; espn: number; time: number }> = {};

    if (matches && matches.length > 0) {
      const matchList = matches as MatchRow[];
      const uniqueDates = [...new Set(matchList.map(m => getDateStr(new Date(m.anpfiff))))];
      const uniqueTournaments = [...new Set(matchList.map(m => m.tournament || "Süper Lig"))];
      const espnCache = new Map<string, Map<string, { homeScore: number; awayScore: number; status: string }>>();

      for (const ds of uniqueDates) {
        for (const t of uniqueTournaments) {
          const ck = `${t}_${ds}`;
          if (!espnCache.has(ck)) espnCache.set(ck, await fetchEspnScores(t, ds));
        }
      }

      for (const match of matchList) {
        const kickoff = new Date(match.anpfiff);
        const hours = (now.getTime() - kickoff.getTime()) / (1000 * 60 * 60);
        const tourney = match.tournament || "Unbekannt";
        stats[tourney] ??= { checked: 0, updated: 0, espn: 0, time: 0 };
        stats[tourney].checked++;

        const sesp = espnCache.get(`${tourney}_${getDateStr(kickoff)}`);
        const key = `${cleanName(match.heim_team)}_vs_${cleanName(match.gast_team)}`;
        const e = sesp?.get(key);

        if (e && (match.status !== e.status || match.tore_heim !== e.homeScore || match.tore_gast !== e.awayScore)) {
          const { error: ue } = await adminClient.from("matches").update({
            tore_heim: e.homeScore, tore_gast: e.awayScore, status: e.status,
          }).eq("id", match.id);
          if (!ue) {
            match.status = e.status;
            match.tore_heim = e.homeScore;
            match.tore_gast = e.awayScore;
            scoreUpdates++; stats[tourney].updated++; stats[tourney].espn++;
            results.push({ match: `${match.heim_team} vs ${match.gast_team}`, oldStatus: match.status, newStatus: e.status, score: `${e.homeScore}:${e.awayScore}`, source: "espn" });
          }
        }

        let ns: string | null = null;
        if (match.status === "upcoming" && hours >= -0.25) ns = "live";
        if (match.status === "live" && hours > 2.5) ns = "finished";
        if (match.status === "upcoming" && hours > 3) ns = "finished";

        if (ns && ns !== match.status) {
          const { error: ue } = await adminClient.from("matches").update({ status: ns }).eq("id", match.id);
          if (!ue) {
            match.status = ns;
            scoreUpdates++; stats[tourney].updated++; stats[tourney].time++;
            results.push({ match: `${match.heim_team} vs ${match.gast_team}`, oldStatus: match.status, newStatus: ns, source: "time" });
          }
        }
      }
    }

    // ─── Phase 2: KO Winner Propagation ───
    const bracketUpdates = await propagateKoWinners(adminClient, results);

    const details = results.map(r => {
      let icon = r.source === "espn" ? "🌐" : r.source === "time" ? "⏱️" : "🏆";
      let sc = r.score ? ` [${r.score}]` : "";
      return `${icon} ${r.match}: ${r.oldStatus} → ${r.newStatus}${sc}`;
    });

    // ─── Phase 3: Smart Next-Sync Calculation ───
    let nextSync = 1800; // default: 30 min (kein Spiel aktiv)

    if (matches && matches.length > 0) {
      const matchList = matches as MatchRow[];
      const liveMatch = matchList.find(m => m.status === "live");

      if (liveMatch) {
        const kickoff = new Date(liveMatch.anpfiff);
        const elapsedMin = (now.getTime() - kickoff.getTime()) / 60000;

        if (elapsedMin >= 80 && elapsedMin <= 130) {
          nextSync = 90;   // 🔥 Crunch-Time: alle 90 Sekunden
        } else if (elapsedMin >= 45 && elapsedMin < 60) {
          nextSync = 600;  // ☕ Halbzeit: 10 Minuten
        } else {
          nextSync = 450;  // ⚽ Spiel läuft: 7,5 Minuten
        }
      } else {
        // Kein Live-Spiel → schaue wann nächstes Match anpfiff
        const upcoming = matchList
          .filter(m => m.status === "upcoming")
          .sort((a, b) => new Date(a.anpfiff).getTime() - new Date(b.anpfiff).getTime());
        
        if (upcoming.length > 0) {
          const nextKickoff = new Date(upcoming[0].anpfiff);
          const minsUntil = (nextKickoff.getTime() - now.getTime()) / 60000;
          if (minsUntil > 0 && minsUntil < 30) {
            nextSync = Math.max(120, Math.floor(minsUntil * 60)); // in Seconds, min 2 Minuten
          } else if (minsUntil <= 0) {
            nextSync = 120; // imminent, alle 2 Minuten checken
          } else {
            nextSync = Math.min(1800, Math.floor(minsUntil * 30)); // bis 30 Min, max 30 Min
          }
        }
      }
    }

    // ─── Phase 4: Trigger Level Update ───
    if (scoreUpdates > 0 || bracketUpdates > 0) {
      try {
        // Trigger the update-user-levels edge function to recalculate XP and Levels
        await fetch(`${SUPABASE_URL}/functions/v1/update-user-levels`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json'
          }
        });
      } catch (e) {
        console.error("Failed to trigger update-user-levels", e);
      }
    }

    return ok({
      success: true,
      message: `${scoreUpdates} Scores + ${bracketUpdates} Bracket aktualisiert`,
      scoreUpdates,
      bracketUpdates,
      checked: matches?.length || 0,
      tournaments: stats,
      details,
      duration_ms: Date.now() - startTime,
      nextSyncSeconds: nextSync,
    });

  } catch (er) {
    return eresp({ error: String(er), duration_ms: Date.now() - startTime }, 500);
  }
});

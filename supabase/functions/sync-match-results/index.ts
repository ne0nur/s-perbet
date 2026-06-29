// supabase/functions/sync-match-results/index.ts
// Edge Function: Aktualisiert Ergebnisse für alle Turniere (Admin-only)
// Deploy: supabase functions deploy sync-match-results

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;

const ESPN_LEAGUE_MAP: Record<string, string> = {
  "Süper Lig": "tur.1",
  "Champions League": "uefa.champions",
  "World Cup 2026": "fifa.world",
};

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
  source: "espn" | "time";
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

function err(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

function cleanName(name: string): string {
  if (!name) return "";
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/[^a-z0-9]/g, "");
}

async function fetchEspnScores(
  tournament: string,
  dateStr: string,
): Promise<Map<string, { homeScore: number; awayScore: number; status: string }>> {
  const espnCode = ESPN_LEAGUE_MAP[tournament];
  if (!espnCode) return new Map();

  const apiUrl = `http://site.api.espn.com/apis/site/v2/sports/soccer/${espnCode}/scoreboard?dates=${dateStr}`;

  try {
    const response = await fetch(apiUrl);
    if (!response.ok) return new Map();

    const data = await response.json();
    const events = data.events || [];
    const scores = new Map<string, { homeScore: number; awayScore: number; status: string }>();

    for (const event of events) {
      const comp = event.competitions[0];
      const home = comp.competitors.find((c: { homeAway: string }) => c.homeAway === "home");
      const away = comp.competitors.find((c: { homeAway: string }) => c.homeAway === "away");
      if (!home || !away) continue;

      const key = `${cleanName(home.team?.name || "")}_vs_${cleanName(away.team?.name || "")}`;

      const statusName = event.status.type.name;
      let status = "upcoming";
      if (statusName.includes("FULL_TIME") || statusName.includes("FINAL")) status = "finished";
      else if (statusName.includes("HALF") || statusName.includes("IN_PROGRESS")) status = "live";
      else if (statusName.includes("POSTPONED") || statusName.includes("CANCELED")) status = "postponed";

      scores.set(key, {
        homeScore: parseInt(home.score || "0", 10),
        awayScore: parseInt(away.score || "0", 10),
        status,
      });
    }
    return scores;
  } catch {
    return new Map();
  }
}

function getDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

serve(async (req: Request) => {
  // CORS Preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const startTime = Date.now();
  const results: UpdateResult[] = [];

  try {
    // Auth Check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return err({ error: "No auth header" }, 401);

    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return err({ error: "Unauthorized" }, 401);

    const { data: profile } = await userClient
      .from("profiles").select("is_admin").eq("id", user.id).single();
    if (!profile?.is_admin) return err({ error: "Admin only" }, 403);

    // Admin Client
    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const now = new Date();

    // Alle nicht-finalen Matches
    const { data: matches, error: fetchError } = await adminClient
      .from("matches").select("*")
      .not("status", "in", '("finished","postponed")')
      .order("anpfiff", { ascending: true });

    if (fetchError) return err({ error: fetchError.message }, 500);
    if (!matches || matches.length === 0) {
      return ok({ success: true, message: "Alle Spiele bereits abgeschlossen.", updated: 0, checked: 0, details: [], duration_ms: Date.now() - startTime });
    }

    const matchList = matches as MatchRow[];

    // ESPN-Daten vorab cachen
    const uniqueDates = [...new Set(matchList.map(m => getDateStr(new Date(m.anpfiff))))];
    const uniqueTournaments = [...new Set(matchList.map(m => m.tournament || "Süper Lig"))];
    const espnCache = new Map<string, Map<string, { homeScore: number; awayScore: number; status: string }>>();

    for (const dateStr of uniqueDates) {
      for (const t of uniqueTournaments) {
        const ck = `${t}_${dateStr}`;
        if (!espnCache.has(ck)) espnCache.set(ck, await fetchEspnScores(t, dateStr));
      }
    }

    // Matches verarbeiten
    let updatedCount = 0;
    const stats: Record<string, { checked: number; updated: number; espn: number; time: number }> = {};

    for (const match of matchList) {
      const kickoff = new Date(match.anpfiff);
      const hours = (now.getTime() - kickoff.getTime()) / (1000 * 60 * 60);
      const tourney = match.tournament || "Unbekannt";
      stats[tourney] ??= { checked: 0, updated: 0, espn: 0, time: 0 };
      stats[tourney].checked++;

      // Priority 1: ESPN
      const espnScores = espnCache.get(`${tourney}_${getDateStr(kickoff)}`);
      const key = `${cleanName(match.heim_team)}_vs_${cleanName(match.gast_team)}`;
      const e = espnScores?.get(key);

      if (e && (match.status !== e.status || match.tore_heim !== e.homeScore || match.tore_gast !== e.awayScore)) {
        const { error: ue } = await adminClient.from("matches").update({
          tore_heim: e.homeScore, tore_gast: e.awayScore, status: e.status,
        }).eq("id", match.id);

        if (!ue) {
          updatedCount++; stats[tourney].updated++; stats[tourney].espn++;
          results.push({ match: `${match.heim_team} vs ${match.gast_team}`, oldStatus: match.status, newStatus: e.status, score: `${e.homeScore}:${e.awayScore}`, source: "espn" });
          continue;
        }
      }

      // Priority 2: Time-based
      let ns: string | null = null;
      if (match.status === "upcoming" && hours >= -0.25) ns = "live";
      if (match.status === "live" && hours > 2.5) ns = "finished";
      if (match.status === "upcoming" && hours > 3) ns = "finished";

      if (ns && ns !== match.status) {
        const { error: ue } = await adminClient.from("matches").update({ status: ns }).eq("id", match.id);
        if (!ue) {
          updatedCount++; stats[tourney].updated++; stats[tourney].time++;
          results.push({ match: `${match.heim_team} vs ${match.gast_team}`, oldStatus: match.status, newStatus: ns, source: "time" });
        }
      }
    }

    const details = results.map(r => {
      const icon = r.source === "espn" ? "🌐" : "⏱️";
      const sc = r.score ? ` [${r.score}]` : "";
      return `${icon} ${r.match}: ${r.oldStatus} → ${r.newStatus}${sc}`;
    });

    return ok({ success: true, message: `${updatedCount} von ${matchList.length} Spielen aktualisiert`, updated: updatedCount, checked: matchList.length, tournaments: stats, details, duration_ms: Date.now() - startTime });

  } catch (er) {
    return err({ error: String(er), duration_ms: Date.now() - startTime }, 500);
  }
});

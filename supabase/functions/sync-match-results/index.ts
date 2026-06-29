// supabase/functions/sync-match-results/index.ts
// Edge Function: Aktualisiert Ergebnisse für alle Turniere (Admin-only)
// Deploy: supabase functions deploy sync-match-results

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;

// ESPN League Mapping (gleiche Struktur wie sync_scores.js)
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

      const homeTeam = home.team?.name || "";
      const awayTeam = away.team?.name || "";
      const key = `${cleanName(homeTeam)}_vs_${cleanName(awayTeam)}`;

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
  const startTime = Date.now();
  const results: UpdateResult[] = [];

  try {
    // --- Auth Check ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No auth header" }), { status: 401 });
    }

    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const { data: profile } = await userClient
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();
    if (!profile?.is_admin) {
      return new Response(JSON.stringify({ error: "Admin only" }), { status: 403 });
    }

    // --- Admin-Client ---
    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const now = new Date();

    // 1. Alle nicht-finalen Matches laden
    const { data: matches, error: fetchError } = await adminClient
      .from("matches")
      .select("*")
      .not("status", "in", '("finished","postponed")')
      .order("anpfiff", { ascending: true });

    if (fetchError) {
      return new Response(JSON.stringify({ error: fetchError.message }), { status: 500 });
    }

    if (!matches || matches.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: "Alle Spiele sind bereits abgeschlossen oder verschoben.",
        updated: 0,
        checked: 0,
        details: [],
        duration_ms: Date.now() - startTime,
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    }

    const matchList = matches as MatchRow[];

    // 2. ESPN-Daten für alle relevanten Daten + Turniere abrufen
    const uniqueDates = [...new Set(matchList.map(m => getDateStr(new Date(m.anpfiff))))];
    const espnCache = new Map<string, Map<string, { homeScore: number; awayScore: number; status: string }>>();

    for (const dateStr of uniqueDates) {
      for (const tournament of [...new Set(matchList.map(m => m.tournament || "Süper Lig"))]) {
        const cacheKey = `${tournament}_${dateStr}`;
        if (!espnCache.has(cacheKey)) {
          const scores = await fetchEspnScores(tournament, dateStr);
          espnCache.set(cacheKey, scores);
        }
      }
    }

    // 3. Für jedes Match prüfen
    let updatedCount = 0;
    const tournamentStats: Record<string, { checked: number; updated: number; espn: number; time: number }> = {};

    for (const match of matchList) {
      const kickoff = new Date(match.anpfiff);
      const hoursSinceKickoff = (now.getTime() - kickoff.getTime()) / (1000 * 60 * 60);
      const dateStr = getDateStr(kickoff);
      const tourney = match.tournament || "Unbekannt";

      if (!tournamentStats[tourney]) {
        tournamentStats[tourney] = { checked: 0, updated: 0, espn: 0, time: 0 };
      }
      tournamentStats[tourney].checked++;

      // --- Priority 1: ESPN API ---
      const cacheKey = `${tourney}_${dateStr}`;
      const espnScores = espnCache.get(cacheKey);
      const key = `${cleanName(match.heim_team)}_vs_${cleanName(match.gast_team)}`;
      const espnMatch = espnScores?.get(key);

      if (espnMatch && (match.status !== espnMatch.status ||
          match.tore_heim !== espnMatch.homeScore ||
          match.tore_gast !== espnMatch.awayScore)) {
        const { error: updateError } = await adminClient
          .from("matches")
          .update({
            tore_heim: espnMatch.homeScore,
            tore_gast: espnMatch.awayScore,
            status: espnMatch.status,
          })
          .eq("id", match.id);

        if (!updateError) {
          updatedCount++;
          tournamentStats[tourney].updated++;
          tournamentStats[tourney].espn++;
          results.push({
            match: `${match.heim_team} vs ${match.gast_team}`,
            oldStatus: match.status,
            newStatus: espnMatch.status,
            score: `${espnMatch.homeScore}:${espnMatch.awayScore}`,
            source: "espn",
          });
          continue; // Skip time-based logic
        }
      }

      // --- Priority 2: Smart Time-based ---
      let newStatus: string | null = null;
      let timeReason = "";

      if (match.status === "upcoming" && hoursSinceKickoff >= -0.25) {
        newStatus = "live";
        timeReason = "Anpfiff erreicht";
      }
      if (match.status === "live" && hoursSinceKickoff > 2.5) {
        newStatus = "finished";
        timeReason = ">2.5h nach Anpfiff";
      }
      if (match.status === "upcoming" && hoursSinceKickoff > 3) {
        newStatus = "finished";
        timeReason = ">3h nach Anpfiff (übersprungen)";
      }

      if (newStatus && newStatus !== match.status) {
        const { error: updateError } = await adminClient
          .from("matches")
          .update({ status: newStatus })
          .eq("id", match.id);

        if (!updateError) {
          updatedCount++;
          tournamentStats[tourney].updated++;
          tournamentStats[tourney].time++;
          results.push({
            match: `${match.heim_team} vs ${match.gast_team}`,
            oldStatus: match.status,
            newStatus,
            source: "time",
          });
        }
      }
    }

    // 4. Summary
    const detailLines = results.map(r => {
      const icon = r.source === "espn" ? "🌐" : "⏱️";
      const score = r.score ? ` [${r.score}]` : "";
      return `${icon} ${r.match}: ${r.oldStatus} → ${r.newStatus}${score}`;
    });

    return new Response(JSON.stringify({
      success: true,
      message: `${updatedCount} von ${matchList.length} Spielen aktualisiert`,
      updated: updatedCount,
      checked: matchList.length,
      tournaments: tournamentStats,
      details: detailLines,
      duration_ms: Date.now() - startTime,
    }), { status: 200, headers: { "Content-Type": "application/json" } });

  } catch (err) {
    return new Response(JSON.stringify({
      error: String(err),
      duration_ms: Date.now() - startTime,
    }), { status: 500 });
  }
});

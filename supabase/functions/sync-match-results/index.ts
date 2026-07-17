// supabase/functions/sync-match-results/index.ts
// ESPN-only Sync Engine: Fixtures + Live-Scores für SüperBET
// Deploy: supabase functions deploy sync-match-results --no-verify-jwt

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
  spielminute: string | null;
  heim_logo?: string | null;
  gast_logo?: string | null;
  venue?: string | null;
  espn_id?: string | null;
}

interface UpdateResult {
  match: string;
  oldStatus: string;
  newStatus: string;
  score?: string;
  source: "espn" | "time" | "bracket" | "fixture";
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
  const start = new Date(date);
  start.setDate(start.getDate() - 2);
  const end = new Date(date);
  end.setDate(end.getDate() + 1);
  const y1 = start.getFullYear();
  const m1 = String(start.getMonth() + 1).padStart(2, "0");
  const d1 = String(start.getDate()).padStart(2, "0");
  const y2 = end.getFullYear();
  const m2 = String(end.getMonth() + 1).padStart(2, "0");
  const d2 = String(end.getDate()).padStart(2, "0");
  return `${y1}${m1}${d1}-${y2}${m2}${d2}`;
}

export interface EspnMatch {
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  status: string;
  date: Date;
  displayClock: string;
  isHalftime: boolean;
  homeLogo?: string;
  awayLogo?: string;
  venue?: string;
  espnId?: string;
}

// ─── ESPN Fixture / Calendar Fetch ──────────────────────────

interface LeagueCalendar {
  calendar: string[];        // ISO date strings for each matchday
  seasonYear: number;        // e.g. 2026
  seasonName: string;        // e.g. "2026-27 Turkish Super Lig"
}

async function fetchLeagueCalendar(tournament: string): Promise<LeagueCalendar | null> {
  const code = ESPN_LEAGUE_MAP[tournament];
  if (!code) return null;
  try {
    const res = await fetch(`http://site.api.espn.com/apis/site/v2/sports/soccer/${code}/scoreboard`);
    if (!res.ok) return null;
    const data = await res.json();
    const league = data.leagues?.[0];
    if (!league) return null;
    return {
      calendar: league.calendar || [],
      seasonYear: league.season?.year || 2026,
      seasonName: league.season?.displayName || "",
    };
  } catch { return null; }
}

function spieltagFromDate(dateStr: string, calendar: string[]): number {
  const matchDate = new Date(dateStr);
  for (let i = 0; i < calendar.length; i++) {
    const calDate = new Date(calendar[i]);
    const nextCalDate = i < calendar.length - 1
      ? new Date(calendar[i + 1])
      : new Date(calDate.getTime() + 7 * 86400000);
    // Spieltag = Woche: Alle Spiele zwischen calendar[i] und calendar[i+1]
    // gehören zu diesem Spieltag (auch wenn sie auf Fr/Sa/Mo fallen)
    if (matchDate >= calDate && matchDate < nextCalDate) return i + 1;
  }
  return 1;
}

// Fetch events from ESPN for a given tournament and date range
async function fetchEspnEvents(tournament: string, dateStr: string): Promise<any[]> {
  const code = ESPN_LEAGUE_MAP[tournament];
  if (!code) return [];
  try {
    const res = await fetch(`http://site.api.espn.com/apis/site/v2/sports/soccer/${code}/scoreboard?dates=${dateStr}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.events || [];
  } catch { return []; }
}

function parseEspnEvent(ev: any): EspnMatch | null {
  const comp = ev.competitions?.[0];
  if (!comp) return null;
  const home = comp.competitors?.find((c: any) => c.homeAway === "home");
  const away = comp.competitors?.find((c: any) => c.homeAway === "away");
  if (!home || !away) return null;

  let hScore = parseInt(home.score || "0", 10);
  let aScore = parseInt(away.score || "0", 10);
  if (home.shootoutScore) hScore += home.shootoutScore;
  if (away.shootoutScore) aScore += away.shootoutScore;

  let s = "upcoming";
  let halftime = false;
  const statusType = ev.status?.type || {};
  const sn = (statusType.name || "").toUpperCase();
  const isCompleted = statusType.completed === true;
  const state = statusType.state || "";

  if (isCompleted || state === "post") {
    s = "finished";
  } else if (sn.includes("PENALTY")) {
    s = "live";
  } else if (sn.includes("HALFTIME") || sn.includes("HALF_TIME")) {
    s = "live"; halftime = true;
  } else if (sn.includes("EXTRA_TIME") || sn.includes("OVERTIME") || sn.includes("IN_PROGRESS") || sn.includes("HALF") || sn.includes("FULL_TIME")) {
    s = "live";
  } else if (sn.includes("POSTPONED") || sn.includes("CANCELED")) {
    s = "postponed";
  }

  return {
    homeTeam: home.team?.name || "TBA",
    awayTeam: away.team?.name || "TBA",
    homeScore: hScore,
    awayScore: aScore,
    status: s,
    date: new Date(ev.date),
    displayClock: halftime ? "HT" : (ev.status?.displayClock || ""),
    isHalftime: halftime,
    homeLogo: home.team?.logo || undefined,
    awayLogo: away.team?.logo || undefined,
    venue: comp.venue?.fullName || undefined,
    espnId: String(ev.id || ""),
  };
}

// ─── Main Handler ──────────────────────────────────────────

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

    // Check if token is service_role key
    const testClient = createClient(SUPABASE_URL, token);
    const { data: testData, error: testError } = await testClient
      .from("profiles").select("id").limit(1);

    if (!testError && testData && testData.length > 0) {
      adminClient = testClient;
    } else {
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

    const now = new Date();
    let scoreUpdates = 0;
    let bracketUpdates = 0;
    let fixtureCreations = 0;
    const stats: Record<string, { checked: number; updated: number; espn: number; time: number; created: number }> = {};

    // ─── Phase 0: Ensure current season exists ───
    const currentSeasonYear = 2026; // hardcoded for now, could be dynamic
    // Ensure seasons table has this year
    await adminClient.from("seasons").upsert({
      id: currentSeasonYear,
      name: `Saison ${currentSeasonYear}/${String(currentSeasonYear + 1).slice(2)}`,
      is_current: true,
      is_finished: false,
    }, { onConflict: "id" });

    // ─── Phase 1: ESPN-only Fixture Import + Score Sync ───
    // For each tournament:
    //   1. Fetch calendar (matchday date mapping)
    //   2. Fetch ESPN events for a wide window around today
    //   3. For each event, create if missing, update if exists

    const tournaments = Object.keys(ESPN_LEAGUE_MAP);

    for (const tournament of tournaments) {
      stats[tournament] = { checked: 0, updated: 0, espn: 0, time: 0, created: 0 };
      const code = ESPN_LEAGUE_MAP[tournament];
      if (!code) continue;

      // Fetch calendar for spieltag mapping
      // ⚠️ Hinweis: ESPN's Kalender zeigt aktuell ALLE Spiele eines Spieltags
      // auf dem Sonntag (20:00 TR). Echte Anstoßzeiten (Fr/Sa/So/Mo) werden
      // von der TFF erst ~2-3 Wochen vorher veröffentlicht. ESPN updated dann
      // automatisch — die Edge Function verteilt korrekt auf Spieltag-Wochen.
      const leagueCal = await fetchLeagueCalendar(tournament);
      if (!leagueCal) {
        console.warn(`⚠️ Kein Kalender für ${tournament}`);
        continue;
      }
      const calendar = leagueCal.calendar;
      const season = leagueCal.seasonYear || currentSeasonYear;

      // Fetch ESPN events for a broader window: last 3 days to next 60 days
      const startRange = new Date(now);
      startRange.setDate(startRange.getDate() - 3);
      const endRange = new Date(now);
      endRange.setDate(endRange.getDate() + 60);
      const dateStr = getDateStr(now);
      // Extended range: go 3 days back and 60 days forward
      const y1 = startRange.getFullYear();
      const m1 = String(startRange.getMonth() + 1).padStart(2, "0");
      const d1 = String(startRange.getDate()).padStart(2, "0");
      const y2 = endRange.getFullYear();
      const m2 = String(endRange.getMonth() + 1).padStart(2, "0");
      const d2 = String(endRange.getDate()).padStart(2, "0");
      const extendedDateStr = `${y1}${m1}${d1}-${y2}${m2}${d2}`;

      const events = await fetchEspnEvents(tournament, extendedDateStr);
      if (events.length === 0) {
        console.log(`📭 Keine ESPN Events für ${tournament} im Fenster`);
        continue;
      }
      console.log(`📥 ${events.length} ESPN Events für ${tournament}`);

      // Parse to EspnMatch array
      const espnMatches: (EspnMatch & { dateStr: string })[] = [];
      for (const ev of events) {
        const parsed = parseEspnEvent(ev);
        if (parsed) {
          espnMatches.push({ ...parsed, dateStr: parsed.date.toISOString() });
        }
      }

      // Get existing DB matches for this tournament (by espn_id)
      const { data: existingMatches } = await adminClient
        .from("matches")
        .select("id, espn_id, heim_team, gast_team, status, tore_heim, tore_gast, spielminute, heim_logo, gast_logo, venue")
        .eq("tournament", tournament)
        .eq("season", season)
        .not("espn_id", "is", null);

      const existingByEspnId = new Map<string, any>();
      if (existingMatches) {
        for (const m of existingMatches) {
          if (m.espn_id) existingByEspnId.set(m.espn_id, m);
        }
      }

      // Also get matches WITHOUT espn_id for name-based matching
      const { data: unnamedMatches } = await adminClient
        .from("matches")
        .select("id, heim_team, gast_team, spieltag")
        .eq("tournament", tournament)
        .eq("season", season)
        .is("espn_id", null);

      // ─── Process each ESPN event: Create or Update ───
      for (const em of espnMatches) {
        stats[tournament].checked++;

        // 1. Check by espn_id
        const existing = em.espnId ? existingByEspnId.get(em.espnId) : null;

        if (existing) {
          // ── Existing match: Update scores (legacy behavior) ──
          const nameUpdated = false;
          const updatePayload: Record<string, unknown> = {
            tore_heim: em.homeScore,
            tore_gast: em.awayScore,
            status: em.status,
            spielminute: em.displayClock || null,
          };
          if (em.homeLogo && !existing.heim_logo) updatePayload.heim_logo = em.homeLogo;
          if (em.awayLogo && !existing.gast_logo) updatePayload.gast_logo = em.awayLogo;
          if (em.venue && !existing.venue) updatePayload.venue = em.venue;

          const hasChanges = existing.status !== em.status
            || existing.tore_heim !== em.homeScore
            || existing.tore_gast !== em.awayScore
            || (em.displayClock && existing.spielminute !== em.displayClock)
            || (em.homeLogo && !existing.heim_logo)
            || (em.awayLogo && !existing.gast_logo)
            || (em.venue && !existing.venue);

          if (hasChanges) {
            const { error: ue } = await adminClient.from("matches").update(updatePayload).eq("id", existing.id);
            if (!ue) {
              scoreUpdates++;
              stats[tournament].updated++;
              stats[tournament].espn++;
              const sc = `${em.homeScore}:${em.awayScore}`;
              results.push({
                match: `${em.homeTeam} vs ${em.awayTeam}`,
                oldStatus: existing.status,
                newStatus: em.status,
                score: sc,
                source: "espn",
              });
            }
          }
        } else {
          // ── NEW match: Create fixture from ESPN data ──
          // First check by name (in case it exists without espn_id)
          let nameMatch = false;
          if (unnamedMatches) {
            const matchDay = spieltagFromDate(em.date.toISOString(), calendar);
            for (const nm of unnamedMatches) {
              if (nm.spieltag === matchDay &&
                  cleanName(nm.heim_team) === cleanName(em.homeTeam) &&
                  cleanName(nm.gast_team) === cleanName(em.awayTeam)) {
                nameMatch = true;
                // Update this match with espn_id and scores
                const updatePayload: Record<string, unknown> = {
                  espn_id: em.espnId,
                  tore_heim: em.homeScore,
                  tore_gast: em.awayScore,
                  status: em.status,
                  spielminute: em.displayClock || null,
                };
                if (em.homeLogo) updatePayload.heim_logo = em.homeLogo;
                if (em.awayLogo) updatePayload.gast_logo = em.awayLogo;
                if (em.venue) updatePayload.venue = em.venue;
                await adminClient.from("matches").update(updatePayload).eq("id", nm.id);
                scoreUpdates++;
                stats[tournament].updated++;
                stats[tournament].espn++;
                results.push({
                  match: `${em.homeTeam} vs ${em.awayTeam}`,
                  oldStatus: "needs_espn_link",
                  newStatus: em.status,
                  score: `${em.homeScore}:${em.awayScore}`,
                  source: "fixture",
                });
                break;
              }
            }
          }

          if (!nameMatch) {
            // Truly new: Insert into DB
            const spieltag = spieltagFromDate(em.date.toISOString(), calendar);
            const { error: ie } = await adminClient.from("matches").insert({
              spieltag,
              heim_team: em.homeTeam,
              gast_team: em.awayTeam,
              anpfiff: em.date.toISOString(),
              tore_heim: em.homeScore,
              tore_gast: em.awayScore,
              status: em.status,
              tournament,
              season,
              spielminute: em.displayClock || null,
              heim_logo: em.homeLogo || null,
              gast_logo: em.awayLogo || null,
              venue: em.venue || null,
              espn_id: em.espnId || null,
            });
            if (!ie) {
              fixtureCreations++;
              stats[tournament].created++;
              results.push({
                match: `${em.homeTeam} vs ${em.awayTeam}`,
                oldStatus: "new",
                newStatus: em.status,
                score: em.homeScore > 0 || em.awayScore > 0 ? `${em.homeScore}:${em.awayScore}` : undefined,
                source: "fixture",
              });
            } else {
              console.error(`❌ Insert fehlgeschlagen: ${em.homeTeam} vs ${em.awayTeam}: ${ie.message}`);
            }
          }
        }
      }
    }

    // ─── Phase 2: Time-based fallback for matches already in DB ───
    const { data: dbMatches, error: fetchError } = await adminClient
      .from("matches").select("*")
      .or('status.in.(upcoming,live),and(status.eq.finished,tore_heim.is.null),and(status.eq.finished,anpfiff.gte.' + new Date(Date.now() - 5*60*60*1000).toISOString() + ')')
      .order("anpfiff", { ascending: true });

    if (fetchError) console.error("Fetch error:", fetchError.message);

    if (dbMatches && dbMatches.length > 0) {
      const matchList = dbMatches as MatchRow[];
      for (const match of matchList) {
        const kickoff = new Date(match.anpfiff);
        const hours = (now.getTime() - kickoff.getTime()) / (1000 * 60 * 60);

        let ns: string | null = null;
        // Time-based fallback: upcoming → live
        if (match.status === "upcoming" && hours >= -0.25) ns = "live";
        // live → finished (various heuristics)
        if (match.status === "live") {
          if (hours > 3.5) {
            ns = "finished";
          } else if (hours > 2.5 && match.tore_heim !== null && match.tore_gast !== null) {
            ns = "finished";
          }
        }
        if (match.status === "upcoming" && hours > 3) ns = "finished";

        if (ns && ns !== match.status) {
          const { error: ue } = await adminClient.from("matches").update({ status: ns }).eq("id", match.id);
          if (!ue) {
            match.status = ns;
            scoreUpdates++;
            results.push({ match: `${match.heim_team} vs ${match.gast_team}`, oldStatus: match.status, newStatus: ns, source: "time" });
          }
        }
      }
    }

    // ─── Phase 3: Smart Next-Sync Calculation ───
    let nextSync = 1800; // default 30 min
    let nextSyncLabel = "💤 Kein Spiel aktiv";

    if (dbMatches && dbMatches.length > 0) {
      const liveMatch = dbMatches.find(m => m.status === "live");
      if (liveMatch) {
        const isHalftime = liveMatch.spielminute === "HT";
        if (isHalftime) {
          nextSync = 480;
          nextSyncLabel = "☕ Halbzeit";
        } else {
          const kickoff = new Date(liveMatch.anpfiff);
          const elapsedMin = (now.getTime() - kickoff.getTime()) / 60000;
          if (elapsedMin >= 80 && elapsedMin <= 130) {
            nextSync = 90;
            nextSyncLabel = "🔥 Crunch-Time";
          } else {
            nextSync = 90;
            nextSyncLabel = "⚽ Live";
          }
        }
      } else {
        const upcoming = dbMatches
          .filter(m => m.status === "upcoming")
          .sort((a, b) => new Date(a.anpfiff).getTime() - new Date(b.anpfiff).getTime());
        if (upcoming.length > 0) {
          const nextMatch = upcoming[0];
          const nextKickoff = new Date(nextMatch.anpfiff);
          const minsUntil = (nextKickoff.getTime() - now.getTime()) / 60000;
          if (minsUntil > 0 && minsUntil < 30) {
            nextSync = Math.max(90, Math.floor(minsUntil * 60));
            nextSyncLabel = `⏰ Kickoff in ${Math.round(minsUntil)} Min`;
          } else if (minsUntil <= 0) {
            nextSync = 90;
            nextSyncLabel = "⏰ Kickoff imminent";
          } else {
            nextSync = Math.min(1800, Math.floor(minsUntil * 30));
            nextSyncLabel = `⏳ Nächster Kickoff in ${Math.round(minsUntil)} Min`;
          }
        }
      }
    }

    // ─── Phase 3.5: Bracket Placeholder Resolution ───
    // ESPN liefert oft "Semifinal 1 Winner/Loser" statt echter Teamnamen.
    // Löst sie auf, indem Ergebnisse der Vorrunde analysiert werden.
    {
      const { data: bracketMatches } = await adminClient
        .from("matches")
        .select("id, spieltag, heim_team, gast_team, status, tore_heim, tore_gast, anpfiff, tournament, season")
        .order("tournament, spieltag, anpfiff");

      if (bracketMatches) {
        const PLACEHOLDER = /\b(?:winner|loser|tbd|tba|placeholder)\b/i;
        const BRACKET_PATTERN = /(?:semifinal|sf|quarterfinal|qf|round\s+\d+)\s+(\d+)\s+(winner|loser)/i;

        // Group by tournament
        const byTournament: Record<string, typeof bracketMatches> = {};
        for (const m of bracketMatches) {
          if (!byTournament[m.tournament]) byTournament[m.tournament] = [];
          byTournament[m.tournament].push(m);
        }

        for (const [, tMatches] of Object.entries(byTournament)) {
          const placeholderMatches = tMatches.filter(m =>
            PLACEHOLDER.test(m.heim_team) || PLACEHOLDER.test(m.gast_team)
          );
          if (placeholderMatches.length === 0) continue;

          // Group placeholder matches by spieltag, sorted by date
          const bySpieltag: Record<number, typeof placeholderMatches> = {};
          for (const pm of placeholderMatches) {
            if (!bySpieltag[pm.spieltag]) bySpieltag[pm.spieltag] = [];
            bySpieltag[pm.spieltag].push(pm);
          }

          for (const [spStr, pms] of Object.entries(bySpieltag)) {
            const spieltag = Number(spStr);
            const prevRound = tMatches
              .filter(m => m.spieltag === spieltag - 1)
              .sort((a, b) => new Date(a.anpfiff).getTime() - new Date(b.anpfiff).getTime());

            if (prevRound.length === 0) continue;
            if (!prevRound.every(m => m.status === "finished")) continue;

            pms.sort((a, b) => new Date(a.anpfiff).getTime() - new Date(b.anpfiff).getTime());

            for (const pm of pms) {
              let h = pm.heim_team, g = pm.gast_team;

              for (let i = 0; i < prevRound.length; i++) {
                const pr = prevRound[i];
                const num = i + 1;
                const reNum = `(${num}|0${num})`;
                // Match "Semifinal N Winner", "SF N Winner", "Winner SF N" etc.
                const winRe = new RegExp(
                  `(?:semifinal|sf)\\s*${reNum}\\s*(?:match\\s*)?winner|winner\\s*(?:of\\s*)?(?:semifinal|sf)\\s*${reNum}`,
                  "i"
                );
                const loseRe = new RegExp(
                  `(?:semifinal|sf)\\s*${reNum}\\s*(?:match\\s*)?loser|loser\\s*(?:of\\s*)?(?:semifinal|sf)\\s*${reNum}`,
                  "i"
                );

                if (winRe.test(h)) {
                  const winner = (pr.tore_heim ?? 0) > (pr.tore_gast ?? 0) ? pr.heim_team : pr.gast_team;
                  h = winner;
                }
                if (loseRe.test(h)) {
                  const loser = (pr.tore_heim ?? 0) > (pr.tore_gast ?? 0) ? pr.gast_team : pr.heim_team;
                  h = loser;
                }
                if (winRe.test(g)) {
                  const winner = (pr.tore_heim ?? 0) > (pr.tore_gast ?? 0) ? pr.heim_team : pr.gast_team;
                  g = winner;
                }
                if (loseRe.test(g)) {
                  const loser = (pr.tore_heim ?? 0) > (pr.tore_gast ?? 0) ? pr.gast_team : pr.heim_team;
                  g = loser;
                }
              }

              if (h !== pm.heim_team || g !== pm.gast_team) {
                bracketUpdates++;
                await adminClient.from("matches").update({ heim_team: h, gast_team: g }).eq("id", pm.id);
                results.push({
                  match: `${pm.heim_team} vs ${pm.gast_team} → ${h} vs ${g}`,
                  oldStatus: "placeholder",
                  newStatus: pm.status,
                  source: "bracket",
                });
              }
            }
          }
        }
      }
    }

    // ─── Phase 4: Heartbeat ───
    try {
      const serviceClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
      await serviceClient.from('app_settings').upsert({ key: 'last_sync', value: new Date().toISOString() });
      await serviceClient.from('app_settings').upsert({ key: 'sync_label', value: nextSyncLabel });
    } catch (e) {
      console.error("Heartbeat write failed:", e);
    }

    // ─── Phase 5: Trigger Level Update ───
    if (scoreUpdates > 0 || bracketUpdates > 0) {
      try {
        await fetch(`${SUPABASE_URL}/functions/v1/update-user-levels`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json',
          },
        });
      } catch (e) {
        console.error("Failed to trigger update-user-levels", e);
      }
    }

    const details = results.map(r => {
      let icon = r.source === "espn" ? "🌐" : r.source === "time" ? "⏱️" : r.source === "fixture" ? "🆕" : "🏆";
      let sc = r.score ? ` [${r.score}]` : "";
      return `${icon} ${r.match}: ${r.oldStatus} → ${r.newStatus}${sc}`;
    });

    return ok({
      success: true,
      message: `${scoreUpdates} Score-Updates, ${fixtureCreations} neue Fixtures`,
      scoreUpdates,
      fixtureCreations,
      bracketUpdates,
      stats,
      details,
      duration_ms: Date.now() - startTime,
      nextSyncSeconds: nextSync,
      nextSyncLabel,
    });

  } catch (er) {
    return eresp({ error: String(er), duration_ms: Date.now() - startTime }, 500);
  }
});

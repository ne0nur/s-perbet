// supabase/functions/sync-match-results/index.ts
// Edge Function: Sync scores + propagate KO winners through bracket
// Deploy: supabase functions deploy sync-match-results --no-verify-jwt

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;

const ESPN_LEAGUE_MAP: Record<string, string> = {
  "Süper Lig": "tur.1",
  "Champions League": "uefa.champions",
  "World Cup 2026": "fifa.world",
};

// Local bracket propagation removed in favor of API dynamic fetching.

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
}

async function fetchEspnScores(tournament: string, dateStr: string): Promise<EspnMatch[]> {
  const code = ESPN_LEAGUE_MAP[tournament];
  if (!code) return [];
  try {
    const res = await fetch(`http://site.api.espn.com/apis/site/v2/sports/soccer/${code}/scoreboard?dates=${dateStr}`);
    if (!res.ok) return [];
    const data = await res.json();
    const matches: EspnMatch[] = [];
    for (const ev of data.events || []) {
      const comp = ev.competitions[0];
      const home = comp.competitors.find((c: any) => c.homeAway === "home");
      const away = comp.competitors.find((c: any) => c.homeAway === "away");
      if (!home || !away) continue;
      
      let hScore = parseInt(home.score || "0", 10);
      let aScore = parseInt(away.score || "0", 10);
      
      // Elfmeterschießen dazuaddieren
      if (home.shootoutScore) hScore += home.shootoutScore;
      if (away.shootoutScore) aScore += away.shootoutScore;

      let s = "upcoming";
      const sn = ev.status.type.name;
      if (sn.includes("FULL_TIME") || sn.includes("FINAL")) s = "finished";
      else if (sn.includes("HALF") || sn.includes("IN_PROGRESS")) s = "live";
      else if (sn.includes("POSTPONED") || sn.includes("CANCELED")) s = "postponed";
      
      matches.push({
        homeTeam: home.team?.name || "TBA",
        awayTeam: away.team?.name || "TBA",
        homeScore: hScore,
        awayScore: aScore,
        status: s,
        date: new Date(ev.date)
      });
    }
    return matches;
  } catch { return []; }
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
      .or('status.in.(upcoming,live),and(status.eq.finished,tore_heim.is.null)')
      .order("anpfiff", { ascending: true });

    if (fetchError) return eresp({ error: fetchError.message }, 500);

    let scoreUpdates = 0;
    let bracketUpdates = 0;
    const stats: Record<string, { checked: number; updated: number; espn: number; time: number }> = {};

    if (matches && matches.length > 0) {
      const matchList = matches as MatchRow[];
      const uniqueDates = [...new Set(matchList.map(m => getDateStr(new Date(m.anpfiff))))];
      const uniqueTournaments = [...new Set(matchList.map(m => m.tournament || "Süper Lig"))];
      const espnCache = new Map<string, EspnMatch[]>();

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

        const apiMatches = espnCache.get(`${tourney}_${getDateStr(kickoff)}`) || [];
        
        let e: EspnMatch | undefined;
        
        // 1. Try exact name match
        e = apiMatches.find(am => cleanName(am.homeTeam) === cleanName(match.heim_team) && cleanName(am.awayTeam) === cleanName(match.gast_team));
        
        // 2. Fallback: Fuzzy time match (closest match within 12 hours)
        // Only try fuzzy match for knockout phase matches (spieltag >= 4 for World Cup)
        if (!e && match.spieltag >= 4) { 
          let closestDiff = 12 * 60 * 60 * 1000;
          for (const am of apiMatches) {
            const diff = Math.abs(kickoff.getTime() - am.date.getTime());
            if (diff <= closestDiff) {
              closestDiff = diff;
              e = am;
            }
          }
        }

        if (e) {
          // If we found a match via fuzzy mapping, update the names if they differ and are real teams!
          let nameUpdated = false;
          const isRealTeam = (n: string) => !n.toLowerCase().includes("winner") && !n.toLowerCase().includes("loser") && !n.toLowerCase().includes("tba") && !n.toLowerCase().includes("tbd");
          
          let updatePayload: any = {
            tore_heim: e.homeScore, 
            tore_gast: e.awayScore, 
            status: e.status
          };

          if (isRealTeam(e.homeTeam) && e.homeTeam !== match.heim_team) {
            updatePayload.heim_team = e.homeTeam;
            nameUpdated = true;
          }
          if (isRealTeam(e.awayTeam) && e.awayTeam !== match.gast_team) {
            updatePayload.gast_team = e.awayTeam;
            nameUpdated = true;
          }

          if (nameUpdated || match.status !== e.status || match.tore_heim !== e.homeScore || match.tore_gast !== e.awayScore) {
            const { error: ue } = await adminClient.from("matches").update(updatePayload).eq("id", match.id);
            if (!ue) {
              match.status = e.status;
              match.tore_heim = e.homeScore;
              match.tore_gast = e.awayScore;
              if (nameUpdated) {
                bracketUpdates++;
                match.heim_team = updatePayload.heim_team || match.heim_team;
                match.gast_team = updatePayload.gast_team || match.gast_team;
              }
              scoreUpdates++; stats[tourney].updated++; stats[tourney].espn++;
              const oldName = nameUpdated ? ` (war: ${match.heim_team} vs ${match.gast_team})` : '';
              results.push({ match: `${match.heim_team} vs ${match.gast_team}${oldName}`, oldStatus: match.status, newStatus: e.status, score: `${e.homeScore}:${e.awayScore}`, source: "espn" });
            }
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
          const nextMatch = upcoming[0];
          const nextKickoff = new Date(nextMatch.anpfiff);
          const minsUntil = (nextKickoff.getTime() - now.getTime()) / 60000;
          if (minsUntil > 0 && minsUntil < 30) {
            nextSync = Math.max(120, Math.floor(minsUntil * 60)); // in Seconds, min 2 Minuten
          } else if (minsUntil <= 0) {
            nextSync = 120; // imminent, alle 2 Minuten checken
          } else {
            nextSync = Math.min(1800, Math.floor(minsUntil * 30)); // bis 30 Min, max 30 Min
          }
          
          // ─── Phase 5: Push Notifications (Max once every 48 hours) ───
          if (minsUntil > 0 && minsUntil <= 60) {
            try {
              const { data: pushSettings } = await adminClient
                .from('app_settings')
                .select('value')
                .eq('key', 'last_push_time')
                .single();
              
              const lastPushTime = pushSettings?.value ? parseInt(pushSettings.value) : 0;
              const hoursSinceLastPush = (now.getTime() - lastPushTime) / (1000 * 60 * 60);
              
              if (hoursSinceLastPush >= 48) {
                // Get all users who have subscriptions
                const { data: subs } = await adminClient.from('push_subscriptions').select('user_id');
                if (subs && subs.length > 0) {
                  const uniqueUserIds = [...new Set(subs.map(s => s.user_id))];
                  
                  // Fire and forget push notification
                  fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
                    method: 'POST',
                    headers: {
                      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
                      'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                      userIds: uniqueUserIds,
                      title: '⚽ Spieltag startet gleich!',
                      body: `${nextMatch.heim_team} vs ${nextMatch.gast_team} startet bald. Hast du schon getippt?`,
                      url: '/'
                    })
                  }).catch(e => console.error('Error triggering send-push:', e));
                  
                  // Update last_push_time
                  await adminClient.from('app_settings').upsert({
                    key: 'last_push_time',
                    value: now.getTime().toString()
                  });
                  
                  console.log(`Push triggered for ${uniqueUserIds.length} users. Match: ${nextMatch.heim_team} vs ${nextMatch.gast_team}`);
                }
              }
            } catch (err) {
              console.error('Push Notification Trigger Error:', err);
            }
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

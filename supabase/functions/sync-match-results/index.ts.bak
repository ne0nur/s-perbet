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
  displayClock: string;
  isHalftime: boolean;
  homeLogo?: string;
  awayLogo?: string;
  venue?: string;
  espnId?: string;
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
      let halftime = false;
      const statusType = ev.status.type;
      const sn = statusType.name;
      const isCompleted = statusType.completed === true;
      const state = statusType.state; // "pre" | "in" | "post"

      // ─── DEFINITIVE: ESPN's state/completed fields ───
      // "post" = match over (full time, no matter the label)
      // "completed" = true → match is done
      // These are the SOURCE OF TRUTH. status.name is just a display label.
      if (isCompleted || state === "post") {
        // Always map to finished — ESPN says it's done.
        // STATUS_FULL_TIME → regulation finished (normal)
        // STATUS_FINAL_AET → after extra time
        // STATUS_FINAL → penalty shootout or group stage finish
        s = "finished";
      }
      // ─── LIVE STATES (only if not completed) ───
      else if (sn.includes("PENALTY")) {
        s = "live"; // Penalties in progress
      } else if (sn.includes("HALFTIME") || sn.includes("HALF_TIME")) {
        s = "live"; halftime = true;
      } else if (sn.includes("EXTRA_TIME") || sn.includes("OVERTIME") || sn.includes("IN_PROGRESS") || sn.includes("HALF") || sn.includes("FULL_TIME")) {
        s = "live"; // These only reach here if completed=false / state≠"post"
      }
      // ─── POSTPONED ───
      else if (sn.includes("POSTPONED") || sn.includes("CANCELED")) {
        s = "postponed";
      }
      // else: stays "upcoming" (STATUS_SCHEDULED or unknown)
      
      matches.push({
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

    // Prüfe, ob der Token ein Service-Role-Key ist, indem wir eine Tabelle testen,
    // die NUR für authentifizierte User (oder Service Role) lesbar ist.
    // profiles hat RLS: nur authentifizierte Nutzer — Anon-Key fliegt raus.
    const testClient = createClient(SUPABASE_URL, token);
    const { data: testData, error: testError } = await testClient
      .from("profiles").select("id").limit(1);

    if (!testError && testData && testData.length > 0) {
      // Service-Role-Key (oder Admin-User) → automatisierter Aufruf
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
      .or('status.in.(upcoming,live),and(status.eq.finished,tore_heim.is.null),and(status.eq.finished,anpfiff.gte.' + new Date(Date.now() - 5*60*60*1000).toISOString() + ')')
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
          
          let updatePayload: Record<string, unknown> = {
            tore_heim: e.homeScore, 
            tore_gast: e.awayScore, 
            status: e.status,
            spielminute: e.displayClock || null,
            espn_id: e.espnId || null,
          };
          if (e.homeLogo) updatePayload.heim_logo = e.homeLogo;
          if (e.awayLogo) updatePayload.gast_logo = e.awayLogo;
          if (e.venue) updatePayload.venue = e.venue;

          if (isRealTeam(e.homeTeam) && e.homeTeam !== match.heim_team) {
            updatePayload.heim_team = e.homeTeam;
            nameUpdated = true;
          }
          if (isRealTeam(e.awayTeam) && e.awayTeam !== match.gast_team) {
            updatePayload.gast_team = e.awayTeam;
            nameUpdated = true;
          }

          // Update wenn: Status/Score geändert ODER neue ESPN-Daten vorhanden (Logos/Venue)
          const hasNewEspnData = !match.heim_logo && (e.homeLogo || e.awayLogo || e.venue || e.espnId);
          if (hasNewEspnData || nameUpdated || match.status !== e.status || match.tore_heim !== e.homeScore || match.tore_gast !== e.awayScore || match.spielminute !== e.displayClock) {
            const { error: ue } = await adminClient.from("matches").update(updatePayload).eq("id", match.id);
            if (!ue) {
              match.status = e.status;
              match.tore_heim = e.homeScore;
              match.tore_gast = e.awayScore;
              match.spielminute = e.displayClock;
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
        // Time-based fallback NUR wenn kein ESPN-Match gefunden wurde ODER ESPN "upcoming" sagt
        const hasEspnData = !!e;
        if (match.status === "upcoming" && hours >= -0.25) ns = "live";
        // LIVE → FINISHED:
        // (a) >3.5h → Spiel garantiert vorbei (inkl. Verlängerung+Elfmeter+30min Puffer)
        // (b) >2.5h + kein ESPN-Daten
        // (c) >2.5h + Scores vorhanden → Spiel gelaufen, ESPN hängt (z.B. STATUS_FULL_TIME ohne FINAL)
        if (match.status === "live") {
          if (hours > 3.5) {
            ns = "finished";
          } else if (hours > 2.5 && !hasEspnData) {
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
    let nextSyncLabel = "💤 Kein Spiel aktiv";

    if (matches && matches.length > 0) {
      const matchList = matches as MatchRow[];
      const liveMatch = matchList.find(m => m.status === "live");

      if (liveMatch) {
        // ☕ Halbzeit-Erkennung via ESPN (spielminute = "HT") — Counter: max. 2× 8min
        const isHalftime = liveMatch.spielminute === "HT";
        let halbzeitCount = 0;

        if (isHalftime) {
          try {
            const { data: hzData } = await adminClient.from('app_settings')
              .select('value').eq('key', 'halbzeit_count').single();
            if (hzData?.value) {
              const [savedMatchId, savedCount] = hzData.value.split(':');
              if (savedMatchId === liveMatch.id) {
                halbzeitCount = parseInt(savedCount) || 0;
              }
            }
          } catch (e) { /* ignore */ }

          halbzeitCount++;
          if (halbzeitCount >= 3) {
            nextSync = 90;
            nextSyncLabel = "⚽ Live (Halbzeit-Counter überschritten)";
          } else {
            nextSync = 480; // 8 Minuten
            nextSyncLabel = `☕ Halbzeit — ESPN (${halbzeitCount}/2)`;
            try {
              await adminClient.from('app_settings').upsert({
                key: 'halbzeit_count',
                value: `${liveMatch.id}:${halbzeitCount}`
              });
            } catch (e) { /* ignore */ }
          }
        } else {
          // Nicht Halbzeit → Counter löschen
          try {
            await adminClient.from('app_settings').delete().eq('key', 'halbzeit_count');
          } catch (e) { /* ignore */ }

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
        // Kein Live-Spiel → schaue wann nächstes Match anpfiff
        const upcoming = matchList
          .filter(m => m.status === "upcoming")
          .sort((a, b) => new Date(a.anpfiff).getTime() - new Date(b.anpfiff).getTime());
        
        if (upcoming.length > 0) {
          const nextMatch = upcoming[0];
          const nextKickoff = new Date(nextMatch.anpfiff);
          const minsUntil = (nextKickoff.getTime() - now.getTime()) / 60000;
          if (minsUntil > 0 && minsUntil < 30) {
            nextSync = Math.max(90, Math.floor(minsUntil * 60)); // mindestens 90s
            nextSyncLabel = `⏰ Kickoff in ${Math.round(minsUntil)} Min`;
          } else if (minsUntil <= 0) {
            nextSync = 90;
            nextSyncLabel = "⏰ Kickoff imminent — wechsle auf Live";
          } else {
            nextSync = Math.min(1800, Math.floor(minsUntil * 30));
            nextSyncLabel = `⏳ Nächster Kickoff in ${Math.round(minsUntil)} Min`;
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

    // ─── Heartbeat: Always write last_sync + sync_label so clients know the sync is alive ───
    // Nutze immer Service-Role-Client — unabhängig vom Aufrufer — damit der Heartbeat nie ausfällt
    try {
      const serviceClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
      await serviceClient.from('app_settings').upsert({ key: 'last_sync', value: new Date().toISOString() })
      await serviceClient.from('app_settings').upsert({ key: 'sync_label', value: nextSyncLabel })
    } catch (e) {
      console.error("Heartbeat write failed:", e)
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
      nextSyncLabel,
    });

  } catch (er) {
    return eresp({ error: String(er), duration_ms: Date.now() - startTime }, 500);
  }
});

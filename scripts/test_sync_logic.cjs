const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const adminClient = createClient(supabaseUrl, supabaseKey)

const ESPN_LEAGUE_MAP = { "World Cup 2026": "fifa.world" }

function cleanName(name) {
  if (!name) return "";
  return name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ı/g, "i").replace(/[^a-z0-9]/g, "");
}

function getDateStr(date) {
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

async function fetchEspnScores(tournament, dateStr) {
  const code = ESPN_LEAGUE_MAP[tournament];
  if (!code) return [];
  try {
    const res = await fetch(`http://site.api.espn.com/apis/site/v2/sports/soccer/${code}/scoreboard?dates=${dateStr}`);
    if (!res.ok) return [];
    const data = await res.json();
    const matches = [];
    for (const ev of data.events || []) {
      const comp = ev.competitions[0];
      const home = comp.competitors.find((c) => c.homeAway === "home");
      const away = comp.competitors.find((c) => c.homeAway === "away");
      if (!home || !away) continue;
      
      let hScore = parseInt(home.score || "0", 10);
      let aScore = parseInt(away.score || "0", 10);
      
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
  } catch(e) { console.error(e); return []; }
}

async function run() {
  const { data: matches } = await adminClient
    .from("matches").select("*")
    .eq('tournament', 'World Cup 2026')
    .gte('spieltag', 4)
    .order("anpfiff", { ascending: true });

  const matchList = matches || [];
  const uniqueDates = [...new Set(matchList.map(m => getDateStr(new Date(m.anpfiff))))];
  const espnCache = new Map();

  for (const ds of uniqueDates) {
    if (!espnCache.has(`World Cup 2026_${ds}`)) espnCache.set(`World Cup 2026_${ds}`, await fetchEspnScores('World Cup 2026', ds));
  }

  for (const match of matchList) {
    const kickoff = new Date(match.anpfiff);
    const apiMatches = espnCache.get(`World Cup 2026_${getDateStr(kickoff)}`) || [];
    
    let e;
    e = apiMatches.find(am => cleanName(am.homeTeam) === cleanName(match.heim_team) && cleanName(am.awayTeam) === cleanName(match.gast_team));
    
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
      let nameUpdated = false;
      const isRealTeam = (n) => !n.toLowerCase().includes("winner") && !n.toLowerCase().includes("loser") && !n.toLowerCase().includes("tba") && !n.toLowerCase().includes("tbd");
      
      let updatePayload = {};

      if (isRealTeam(e.homeTeam) && e.homeTeam !== match.heim_team) {
        updatePayload.heim_team = e.homeTeam;
        nameUpdated = true;
      }
      if (isRealTeam(e.awayTeam) && e.awayTeam !== match.gast_team) {
        updatePayload.gast_team = e.awayTeam;
        nameUpdated = true;
      }

      if (nameUpdated) {
        console.log(`[UPDATE] ${match.heim_team} vs ${match.gast_team} -> ${e.homeTeam} vs ${e.awayTeam} (Time match: ${e.date.toISOString()})`);
        await adminClient.from("matches").update(updatePayload).eq("id", match.id);
      }
    }
  }
}
run()

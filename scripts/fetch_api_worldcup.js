import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(import.meta.dirname, '../.env') })

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const API_KEY = process.env.API_FOOTBALL_KEY

if (!API_KEY) {
  console.error('❌ API_FOOTBALL_KEY fehlt in .env')
  process.exit(1)
}

function mapStatus(short) {
  switch (short) {
    case 'NS': case 'TBD': return 'upcoming'
    case '1H': case '2H': case 'HT': case 'ET': case 'BT': case 'P': case 'LIVE': return 'live'
    case 'FT': case 'AET': case 'PEN': return 'finished'
    default: return 'upcoming'
  }
}

const roundSpieltag = {
  'Group Stage - 1': 1, 'Group Stage - 2': 2, 'Group Stage - 3': 3,
  'Round of 32': 4, 'Round of 16': 5,
  'Quarter-finals': 6, 'Semi-finals': 7, 'Final': 8, '3rd Place Final': 8
}

async function fetchWorldCup() {
  console.log('Lade WM 2026 Spiele von API-Football...')
  
  try {
    const res = await fetch('https://v3.football.api-sports.io/fixtures?league=1&season=2026', {
      method: 'GET',
      headers: {
        'x-rapidapi-host': 'v3.football.api-sports.io',
        'x-rapidapi-key': API_KEY
      }
    })
    
    const data = await res.json()
    
    let fixtures = []
    
    if (data.errors && Object.keys(data.errors).length > 0) {
      console.error('API Error for 2026:', data.errors)
      console.log('Versuche WM 2022 zu laden (da Free-Plan evtl. kein 2026 hat)...')
      
      const res22 = await fetch('https://v3.football.api-sports.io/fixtures?league=1&season=2022', {
        method: 'GET',
        headers: {
          'x-rapidapi-host': 'v3.football.api-sports.io',
          'x-rapidapi-key': API_KEY
        }
      })
      const data22 = await res22.json()
      fixtures = data22.response || []
    } else {
      fixtures = data.response || []
    }
    
    console.log(`${fixtures.length} Spiele gefunden.`)
    
    if (fixtures.length === 0) {
      console.log('Füge Dummy-Spiele hinzu, da gar keine Spiele gefunden wurden!')
      const dummyFixtures = [
        { home: 'Germany', away: 'Spain', goals: [null, null], status: 'NS', date: new Date(Date.now() + 86400000).toISOString(), round: 'Group Stage - 1' },
        { home: 'Brazil', away: 'France', goals: [null, null], status: 'NS', date: new Date(Date.now() + 172800000).toISOString(), round: 'Group Stage - 1' },
      ]
      
      for (const f of dummyFixtures) {
        const { error } = await supabase.from('matches').insert({
          heim_team: f.home, gast_team: f.away,
          anpfiff: f.date,
          tore_heim: f.goals[0],
          tore_gast: f.goals[1],
          status: 'upcoming',
          spieltag: roundSpieltag[f.round] || 1,
          season: 2026,
          tournament: 'World Cup 2026',
        })
        if (error) console.error(`❌ Dummy ${f.home}-${f.away}:`, error.message)
      }
      return
    }

    await supabase.from('matches').delete().eq('tournament', 'World Cup 2026').eq('status', 'upcoming')

    let count = 0
    let baseTime = Date.now() + 86400000; // start matches from tomorrow!
    
    for (const item of fixtures) {
      const f = item.fixture
      const league = item.league
      const teams = item.teams
      const goals = item.goals
      
      let st = mapStatus(f.status.short)
      let anpfiff = f.date
      let th = st === 'finished' ? goals.home : null
      let tg = st === 'finished' ? goals.away : null
      
      // If we loaded 2022 to mock 2026, let's make some of them upcoming!
      if (league.season === 2022 && count < 15) {
        st = 'upcoming'
        anpfiff = new Date(baseTime).toISOString()
        baseTime += 86400000; // add 1 day
        th = null; tg = null;
      }
      
      const { error } = await supabase.from('matches').insert({
        heim_team: teams.home.name, gast_team: teams.away.name,
        anpfiff: anpfiff,
        tore_heim: th,
        tore_gast: tg,
        status: st,
        spieltag: roundSpieltag[league.round] || 1,
        season: 2026,
        tournament: 'World Cup 2026',
      })
      if (error) console.error(`❌ ${teams.home.name}-${teams.away.name}:`, error.message)
      else {
        console.log(`✅ ${teams.home.name} vs ${teams.away.name} (${st})`)
        count++
      }
    }
    
    console.log(`\n✅ ${count} WM-Matches in DB gespeichert!`)
    
  } catch (err) {
    console.error('Fehler beim Abrufen der API:', err)
  }
}

fetchWorldCup()

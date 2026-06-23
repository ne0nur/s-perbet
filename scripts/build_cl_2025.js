import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(import.meta.dirname, '../.env') })

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const API_KEY = process.env.API_FOOTBALL_KEY

async function run() {
  console.log('Clearing DB matches...')
  await supabase.from('matches').delete().gt('id', 0)

  console.log('Fetching 2024 Champions League from API-Football...')
  const url = 'https://v3.football.api-sports.io/fixtures?league=2&season=2024'
  const response = await fetch(url, {
    headers: {
      'x-apisports-key': API_KEY
    }
  })
  
  const data = await response.json()
  if (!data.response) {
    console.error('No response from API', data)
    return
  }

  let matches = data.response.filter(f => {
    const r = f.league.round
    return r.includes('League') || r.includes('Round of 16') || r.includes('Quarter') || r.includes('Semi') || r.includes('Final') || r.includes('Play-offs')
  })

  // Exclude Qualification rounds if any slipped through
  matches = matches.filter(f => !f.league.round.includes('Qualifying'))

  console.log(`Found ${matches.length} main tournament matches.`)

  let insertCount = 0
  for (const f of matches) {
    let heim = f.teams.home.name
    let gast = f.teams.away.name
    let toreHeim = f.goals.home
    let toreGast = f.goals.away
    let status = f.fixture.status.short === 'FT' || f.fixture.status.short === 'PEN' || f.fixture.status.short === 'AET' ? 'finished' : 'upcoming'

    // Shift date by 1 year to simulate 25/26
    const originalDate = new Date(f.fixture.date)
    const newDate = new Date(originalDate)
    newDate.setFullYear(originalDate.getFullYear() + 1)
    
    // Modify Final
    if (f.league.round === 'Final') {
      heim = 'Paris Saint Germain'
      gast = 'Arsenal'
      toreHeim = 1
      toreGast = 1
      status = 'finished'
    }

    // Determine Spieltag (1-8 for League Phase, then 9,10,11,12...)
    let spieltag = 1
    const r = f.league.round
    if (r.includes('League Phase - 1')) spieltag = 1
    else if (r.includes('League Phase - 2')) spieltag = 2
    else if (r.includes('League Phase - 3')) spieltag = 3
    else if (r.includes('League Phase - 4')) spieltag = 4
    else if (r.includes('League Phase - 5')) spieltag = 5
    else if (r.includes('League Phase - 6')) spieltag = 6
    else if (r.includes('League Phase - 7')) spieltag = 7
    else if (r.includes('League Phase - 8')) spieltag = 8
    else if (r.includes('Play-offs')) spieltag = 9
    else if (r.includes('Round of 16')) spieltag = 10
    else if (r.includes('Quarter')) spieltag = 11
    else if (r.includes('Semi')) spieltag = 12
    else if (r.includes('Final')) spieltag = 13

    const { error } = await supabase.from('matches').insert({
      spieltag,
      heim_team: heim,
      gast_team: gast,
      anpfiff: newDate.toISOString(),
      status: status,
      tore_heim: toreHeim,
      tore_gast: toreGast,
      season: 2025,
      tournament: 'Champions League'
    })

    if (error) {
      console.error('Error inserting match:', error)
    } else {
      insertCount++
    }
  }

  console.log(`✅ Inserted ${insertCount} constructed CL 2025/26 matches into season 2025.`)
}

run()

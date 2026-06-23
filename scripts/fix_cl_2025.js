import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(import.meta.dirname, '../.env') })

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const API_KEY = process.env.API_FOOTBALL_KEY

async function run() {
  console.log('Fetching all 2025 CL matches to delete...')
  const { data: oldMatches } = await supabase.from('matches').select('id').eq('season', 2025).eq('tournament', 'Champions League')
  
  if (oldMatches && oldMatches.length > 0) {
    for (let i = 0; i < oldMatches.length; i += 100) {
      const batch = oldMatches.slice(i, i + 100).map(m => m.id)
      await supabase.from('matches').delete().in('id', batch)
    }
    console.log(`Deleted ${oldMatches.length} old matches.`)
  }

  console.log('Fetching 2024 Champions League from API-Football...')
  const url = 'https://v3.football.api-sports.io/fixtures?league=2&season=2024'
  const response = await fetch(url, { headers: { 'x-apisports-key': API_KEY } })
  const data = await response.json()

  let insertCount = 0

  const matchesToInsert = []

  for (const f of data.response) {
    let r = f.league.round
    
    let spieltag = 0
    if (r === 'League Stage - 1') spieltag = 1
    else if (r === 'League Stage - 2') spieltag = 2
    else if (r === 'League Stage - 3') spieltag = 3
    else if (r === 'League Stage - 4') spieltag = 4
    else if (r === 'League Stage - 5') spieltag = 5
    else if (r === 'League Stage - 6') spieltag = 6
    else if (r === 'League Stage - 7') spieltag = 7
    else if (r === 'League Stage - 8') spieltag = 8
    else if (r === 'Knockout Round Play-offs') spieltag = 9
    else if (r === 'Round of 16') spieltag = 10
    else if (r === 'Quarter-finals') spieltag = 11
    else if (r === 'Semi-finals') spieltag = 12
    else if (r === 'Final') spieltag = 13

    if (spieltag === 0) continue; // Skip all qualifications and regular play-offs

    let heim = f.teams.home.name
    let gast = f.teams.away.name
    let toreHeim = f.goals.home
    let toreGast = f.goals.away
    let status = f.fixture.status.short === 'FT' || f.fixture.status.short === 'PEN' || f.fixture.status.short === 'AET' ? 'finished' : 'upcoming'

    const originalDate = new Date(f.fixture.date)
    const newDate = new Date(originalDate)
    newDate.setFullYear(originalDate.getFullYear() + 1)
    
    if (r === 'Final') {
      heim = 'Paris Saint Germain'
      gast = 'Arsenal'
      toreHeim = 1
      toreGast = 1
      status = 'finished'
    }

    matchesToInsert.push({
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
  }

  console.log(`Prepared ${matchesToInsert.length} valid matches.`)

  for (let i = 0; i < matchesToInsert.length; i += 50) {
    const batch = matchesToInsert.slice(i, i + 50)
    const { error } = await supabase.from('matches').insert(batch)
    if (error) {
      console.error('Insert error:', error)
    } else {
      insertCount += batch.length
    }
  }

  console.log(`✅ Inserted ${insertCount} matches!`)
}

run()

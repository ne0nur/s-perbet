import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

const espnCode = 'fifa.world'

function cleanName(name) {
  if (!name) return ''
  return name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ı/g, "i").replace(/[^a-z0-9]/g, "")
}

function getDateStr(date) {
  return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`
}

async function fixScores() {
  const { data: matches, error } = await supabase
    .from('matches')
    .select('*')
    .eq('tournament', 'World Cup 2026')
    .gte('spieltag', 4)
    .eq('status', 'finished')

  if (error) {
    console.error('Error fetching matches:', error)
    return
  }

  const uniqueDates = [...new Set(matches.map(m => getDateStr(new Date(m.anpfiff))))]
  
  for (const dateStr of uniqueDates) {
    console.log(`Fetching ESPN data for ${dateStr}...`)
    const apiUrl = `http://site.api.espn.com/apis/site/v2/sports/soccer/${espnCode}/scoreboard?dates=${dateStr}`
    const res = await fetch(apiUrl)
    const espnData = await res.json()
    
    if (!espnData.events) continue;

    for (const event of espnData.events) {
      const comp = event.competitions[0]
      const homeComp = comp.competitors.find(c => c.homeAway === 'home')
      const awayComp = comp.competitors.find(c => c.homeAway === 'away')
      
      let homeScore = parseInt(homeComp?.score || '0', 10)
      let awayScore = parseInt(awayComp?.score || '0', 10)
      
      if (homeComp?.shootoutScore) homeScore += homeComp.shootoutScore
      if (awayComp?.shootoutScore) awayScore += awayComp.shootoutScore
      
      const homeName = cleanName(homeComp?.team?.name || '')
      const awayName = cleanName(awayComp?.team?.name || '')

      const dbMatch = matches.find(m => cleanName(m.heim_team) === homeName && cleanName(m.gast_team) === awayName)
      
      if (dbMatch) {
        if (dbMatch.tore_heim !== homeScore || dbMatch.tore_gast !== awayScore) {
          console.log(`Fixing match: ${dbMatch.heim_team} vs ${dbMatch.gast_team}. Old: ${dbMatch.tore_heim}:${dbMatch.tore_gast}, New: ${homeScore}:${awayScore}`)
          await supabase.from('matches').update({ tore_heim: homeScore, tore_gast: awayScore }).eq('id', dbMatch.id)
        }
      }
    }
  }
  
  console.log('Done fixing penalty shootout scores!')
}

fixScores()

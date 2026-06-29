import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(import.meta.dirname, '../.env') })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Konfiguration fehlt in .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

function getSpieltag(dateStr) {
  const d = new Date(dateStr).getTime()
  // Rough estimation for World Cup 2026 format (104 matches)
  // Group Stage: June 11 - June 27
  // Round of 32: June 28 - July 3
  // Round of 16: July 4 - July 7
  // QF: July 9 - 11
  // SF: July 14 - 15
  // Final: July 19
  
  const dObj = new Date(dateStr)
  const month = dObj.getMonth() + 1
  const day = dObj.getDate()
  
  if (month === 6 && day <= 27) {
    if (day <= 16) return 1
    if (day <= 21) return 2
    return 3
  }
  if ((month === 6 && day >= 28) || (month === 7 && day <= 3)) return 4 // Round of 32
  if (month === 7 && day >= 4 && day <= 7) return 5 // Round of 16
  if (month === 7 && day >= 9 && day <= 11) return 6 // QF
  if (month === 7 && day >= 14 && day <= 15) return 7 // SF
  if (month === 7 && day >= 18) return 8 // Final/3rd Place
  
  return 1
}

async function importWorldCup2026() {
  console.log('🌍 Lade offiziellen WM 2026 Spielplan von ESPN API...')
  
  try {
    // Hole alle Spiele der WM 2026 vom 11. Juni bis 19. Juli
    const apiUrl = 'http://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=20260611-20260719&limit=200'
    const res = await fetch(apiUrl)
    const data = await res.json()
    
    const events = data.events || []
    console.log(`📥 ${events.length} Spiele gefunden.`)
    
    if (events.length === 0) {
      console.log('Keine Spiele gefunden. Abbruch.')
      return
    }

    // Lösche alte WM 2026 Spiele
    await supabase.from('matches').delete().eq('tournament', 'World Cup 2026')
    console.log('🗑️ Alte (Fake) WM-Spiele gelöscht.')

    let count = 0
    for (const event of events) {
      const comp = event.competitions[0]
      const homeTeam = comp.competitors.find(c => c.homeAway === 'home')?.team?.name || 'TBA'
      const awayTeam = comp.competitors.find(c => c.homeAway === 'away')?.team?.name || 'TBA'
      
      const homeScore = parseInt(comp.competitors.find(c => c.homeAway === 'home')?.score || '0', 10)
      const awayScore = parseInt(comp.competitors.find(c => c.homeAway === 'away')?.score || '0', 10)
      
      const statusName = event.status.type.name
      let newStatus = 'upcoming'
      if (statusName.includes('FULL_TIME') || statusName.includes('FINAL')) newStatus = 'finished'
      else if (statusName.includes('HALF') || statusName.includes('IN_PROGRESS')) newStatus = 'live'
      else if (statusName.includes('POSTPONED') || statusName.includes('CANCELED')) newStatus = 'postponed'
      
      const anpfiff = event.date
      const spieltag = getSpieltag(anpfiff)
      
      const { error } = await supabase.from('matches').insert({
        heim_team: homeTeam, 
        gast_team: awayTeam,
        anpfiff: anpfiff,
        tore_heim: newStatus === 'finished' ? homeScore : null,
        tore_gast: newStatus === 'finished' ? awayScore : null,
        status: newStatus,
        spieltag: spieltag,
        season: 2026,
        tournament: 'World Cup 2026',
      })
      
      if (error) console.error(`❌ Fehler bei ${homeTeam} vs ${awayTeam}:`, error.message)
      else count++
    }
    
    console.log(`✅ ${count} echte WM 2026 Spiele in der Datenbank gespeichert!`)
  } catch (err) {
    console.error('❌ Fehler beim Import:', err.message)
  }
}

importWorldCup2026()

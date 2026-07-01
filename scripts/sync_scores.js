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

// Mapping der lokalen Turniere auf ESPN Ligen
const espnLeagueMap = {
  'Süper Lig': 'tur.1',
  'Champions League': 'uefa.champions',
  'World Cup 2026': 'fifa.world'
}

function cleanName(name) {
  if (!name) return ''
  return name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ı/g, 'i').replace(/[^a-z0-9]/g, '')
}

async function syncScores() {
  const force = process.argv.includes('--force')
  console.log(`🔄 ESPN Sync gestartet (Force: ${force})`)

  const now = new Date()
  const startOfToday = new Date(now); startOfToday.setHours(0,0,0,0)
  const endOfToday = new Date(now); endOfToday.setHours(23,59,59,999)

  // 1. Matches von heute aus DB laden (alle Turniere)
  const { data: dbMatches, error: dbError } = await supabase
    .from('matches')
    .select('*')
    .gte('anpfiff', startOfToday.toISOString())
    .lte('anpfiff', endOfToday.toISOString())

  if (dbError) { console.error('❌ DB-Fehler:', dbError.message); return }

  console.log(`📋 DB: ${dbMatches.length} Spiele heute anstehend.`)

  // Smart check: skip if no matches or all finished
  if (!force && dbMatches.length === 0) {
    console.log('💤 Keine Spiele heute. Fertig.')
    return
  }

  const allFinished = dbMatches.length > 0 && dbMatches.every(m => m.status === 'finished' && m.tore_heim !== null)
  const hasLive = dbMatches.some(m => m.status === 'live')

  if (!force && allFinished) {
    console.log('✅ Alle Spiele bereits finished. Überspringe API.')
    return
  }

  // Check if in live window
  if (!force && !hasLive) {
    const timestamps = dbMatches.map(m => new Date(m.anpfiff).getTime())
    const earliest = new Date(Math.min(...timestamps))
    const latest = new Date(Math.max(...timestamps))
    const liveWindow = now >= new Date(earliest.getTime() - 15*60000) && now <= new Date(latest.getTime() + 150*60000)
    const morningSync = now.getHours() >= 9 && now.getHours() <= 11
    if (!liveWindow && !morningSync) {
      console.log('💤 Kein Live-Fenster. Überspringe API.')
      return
    }
  }

  // Datumsbereich formatieren für ESPN (Gestern bis Morgen, YYYYMMDD-YYYYMMDD)
  const startDate = new Date(now)
  startDate.setDate(startDate.getDate() - 2)
  const yyyy1 = startDate.getFullYear()
  const mm1 = String(startDate.getMonth() + 1).padStart(2, '0')
  const dd1 = String(startDate.getDate()).padStart(2, '0')
  
  const endDate = new Date(now)
  endDate.setDate(endDate.getDate() + 1)
  const yyyy2 = endDate.getFullYear()
  const mm2 = String(endDate.getMonth() + 1).padStart(2, '0')
  const dd2 = String(endDate.getDate()).padStart(2, '0')
  
  const dateStr = `${yyyy1}${mm1}${dd1}-${yyyy2}${mm2}${dd2}`
  // Turniere aus den heutigen Matches extrahieren
  const tournamentsToday = [...new Set(dbMatches.map(m => m.tournament || 'Süper Lig'))]
  
  let updatedCount = 0

  // 2. Für jedes Turnier die spezifische ESPN API abfragen
  for (const tournament of tournamentsToday) {
    const espnCode = espnLeagueMap[tournament]
    if (!espnCode) {
      console.warn(`⚠️ Warnung: Keine ESPN Liga für "${tournament}" konfiguriert!`)
      continue
    }

    const apiUrl = `http://site.api.espn.com/apis/site/v2/sports/soccer/${espnCode}/scoreboard?dates=${dateStr}`
    console.log(`🌐 ESPN API [${tournament}]: ${apiUrl}`)

    try {
      const response = await fetch(apiUrl)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)

      const data = await response.json()
      const events = data.events || []
      console.log(`📥 ${events.length} Fixtures bei ESPN für ${tournament} gefunden.`)

      const tournamentMatches = dbMatches.filter(m => (m.tournament || 'Süper Lig') === tournament)

      for (const dbMatch of tournamentMatches) {
        const event = events.find(e => {
          const competitors = e.competitions[0].competitors
          const homeTeam = competitors.find(c => c.homeAway === 'home')?.team?.name || ''
          const awayTeam = competitors.find(c => c.homeAway === 'away')?.team?.name || ''
          return cleanName(homeTeam) === cleanName(dbMatch.heim_team) && cleanName(awayTeam) === cleanName(dbMatch.gast_team)
        })

        if (!event) {
          console.warn(`⚠️ Kein ESPN-Match für ${dbMatch.heim_team} vs ${dbMatch.gast_team}`)
          continue
        }

        const comp = event.competitions[0]
        const homeComp = comp.competitors.find(c => c.homeAway === 'home')
        const awayComp = comp.competitors.find(c => c.homeAway === 'away')
        
        let homeScore = parseInt(homeComp?.score || '0', 10)
        let awayScore = parseInt(awayComp?.score || '0', 10)
        
        // Elfmeterschießen dazurechnen (auf Userwunsch: "summiert wird mit allen toren auch elfmeterschießen")
        if (homeComp?.shootoutScore) homeScore += homeComp.shootoutScore
        if (awayComp?.shootoutScore) awayScore += awayComp.shootoutScore


        const statusName = event.status.type.name
        let newStatus = 'upcoming'
        if (statusName.includes('FULL_TIME') || statusName.includes('FINAL')) newStatus = 'finished'
        else if (statusName.includes('HALF') || statusName.includes('IN_PROGRESS')) newStatus = 'live'
        else if (statusName.includes('POSTPONED') || statusName.includes('CANCELED')) newStatus = 'postponed'

        const scoreChanged = dbMatch.tore_heim !== homeScore || dbMatch.tore_gast !== awayScore
        const statusChanged = dbMatch.status !== newStatus

        if (scoreChanged || statusChanged) {
          console.log(`🆙 [${tournament}] ${dbMatch.heim_team} ${homeScore}:${awayScore} ${dbMatch.gast_team} (${newStatus})`)

          const { error: updateError } = await supabase
            .from('matches')
            .update({ tore_heim: homeScore, tore_gast: awayScore, status: newStatus })
            .eq('id', dbMatch.id)

          if (updateError) console.error(`❌ Update:`, updateError.message)
          else updatedCount++
        }
      }
    } catch (error) {
      console.error(`❌ ESPN-Fehler für ${tournament}:`, error.message)
    }
  }

  console.log(`✅ Sync done. ${updatedCount} Spiele aktualisiert.`)
}

syncScores()

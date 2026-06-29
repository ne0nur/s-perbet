import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(import.meta.dirname, '../.env') })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const apiKey = process.env.API_FOOTBALL_KEY

if (!supabaseUrl || !serviceRoleKey || !apiKey) {
  console.error('❌ Konfiguration fehlt in .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

function cleanName(name) {
  if (!name) return ''
  return name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ı/g, 'i').replace(/[^a-z0-9]/g, '')
}

function mapStatus(apiStatus) {
  switch (apiStatus) {
    case 'NS': case 'TBD': return 'upcoming'
    case '1H': case '2H': case 'HT': case 'ET': case 'BT': case 'P': case 'LIVE': return 'live'
    case 'FT': case 'AET': case 'PEN': return 'finished'
    case 'PST': case 'CANC': case 'ABD': return 'postponed'
    default: return 'upcoming'
  }
}

async function syncScores() {
  const force = process.argv.includes('--force')
  console.log(`🔄 Sync gestartet (Force: ${force})`)

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

  // Separate WC and non-WC
  const wcMatches = dbMatches.filter(m => m.tournament === 'World Cup 2026')
  const otherMatches = dbMatches.filter(m => m.tournament !== 'World Cup 2026')
  console.log(`📋 DB: ${wcMatches.length} WM-Spiele, ${otherMatches.length} andere heute`)

  // Smart check: skip if no matches or all finished
  if (!force && dbMatches.length === 0) {
    console.log('💤 Keine Spiele heute. Fertig.')
    return
  }

  const allFinished = dbMatches.length > 0 && dbMatches.every(m => m.status === 'finished')
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

  // 2. API-Football: ALL fixtures for today (tournament-agnostic)
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  const dateStr = `${yyyy}-${mm}-${dd}`

  const apiUrl = `https://v3.football.api-sports.io/fixtures?date=${dateStr}`
  console.log(`🌐 API: ${apiUrl}`)

  try {
    const response = await fetch(apiUrl, { headers: { 'x-apisports-key': apiKey } })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)

    const result = await response.json()
    if (result.errors && Object.keys(result.errors).length > 0) {
      console.error('❌ API-Fehler:', result.errors)
      return
    }

    const fixtures = result.response || []
    console.log(`📥 ${fixtures.length} Fixtures von heute`)

    let updatedCount = 0

    for (const dbMatch of dbMatches) {
      const fixture = fixtures.find(f => {
        const homeMatch = cleanName(f.teams.home.name) === cleanName(dbMatch.heim_team)
        const awayMatch = cleanName(f.teams.away.name) === cleanName(dbMatch.gast_team)
        return homeMatch && awayMatch
      })

      if (!fixture) {
        console.warn(`⚠️ Kein API-Match für ${dbMatch.heim_team} vs ${dbMatch.gast_team}`)
        continue
      }

      const goalsHome = fixture.goals.home
      const goalsAway = fixture.goals.away
      const apiStatus = fixture.fixture.status.short
      const newStatus = mapStatus(apiStatus)

      const scoreChanged = dbMatch.tore_heim !== goalsHome || dbMatch.tore_gast !== goalsAway
      const statusChanged = dbMatch.status !== newStatus

      if (scoreChanged || statusChanged) {
        const tourney = dbMatch.tournament || ''
        console.log(`🆙 [${tourney}] ${dbMatch.heim_team} ${goalsHome}:${goalsAway} ${dbMatch.gast_team} (${newStatus})`)

        const { error: updateError } = await supabase
          .from('matches')
          .update({ tore_heim: goalsHome, tore_gast: goalsAway, status: newStatus })
          .eq('id', dbMatch.id)

        if (updateError) console.error(`❌ Update:`, updateError.message)
        else updatedCount++
      }
    }

    console.log(`✅ Sync done. ${updatedCount} Spiele aktualisiert.`)
  } catch (error) {
    console.error('❌ API-Fehler:', error.message)
  }
}

syncScores()

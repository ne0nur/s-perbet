import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(import.meta.dirname, '../.env') })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const apiFootballKey = process.env.API_FOOTBALL_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Supabase-Konfiguration fehlt in .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

// Teamnamen bereinigen für verlässlichen Vergleich
function cleanName(name) {
  if (!name) return ''
  return name.toLowerCase()
    .normalize('NFD') // Zerlegt Sonderzeichen (z. B. ş -> s + Akzent)
    .replace(/[\u0300-\u036f]/g, '') // Entfernt die Akzente
    .replace(/ı/g, 'i')
    .replace(/[^a-z0-9]/g, '') // Entfernt Leerzeichen und Sonderzeichen
}

// API-Status zu DB-Status mappen
function mapStatus(apiStatus) {
  switch (apiStatus) {
    case 'NS': // Not Started
      return 'upcoming'
    case '1H':
    case '2H':
    case 'HT': // Half Time
    case 'ET': // Extra Time
    case 'BT':
    case 'P': // Penalty Shootout
    case 'LIVE':
      return 'live'
    case 'FT': // Full Time
    case 'AET':
    case 'PEN':
      return 'finished'
    case 'PST': // Postponed
    case 'CANC': // Cancelled
    case 'ABD': // Abandoned
      return 'postponed'
    default:
      return 'upcoming'
  }
}

async function syncScores() {
  const force = process.argv.includes('--force')
  console.log(`🔄 Starte Spielstand-Synchronisierung (Force: ${force})...`)

  // 1. Heutigen Zeitbereich bestimmen (Lokal)
  const now = new Date()
  const startOfToday = new Date(now)
  startOfToday.setHours(0, 0, 0, 0)
  const endOfToday = new Date(now)
  endOfToday.setHours(23, 59, 59, 999)

  // 2. Spiele von heute aus der DB laden
  const { data: dbMatchesToday, error: dbError } = await supabase
    .from('matches')
    .select('*')
    .gte('anpfiff', startOfToday.toISOString())
    .lte('anpfiff', endOfToday.toISOString())

  if (dbError) {
    console.error('❌ Fehler beim Laden der heutigen Spiele aus DB:', dbError.message)
    return
  }

  console.log(`📋 Heute sind ${dbMatchesToday.length} Spiele in der Datenbank eingetragen.`)

  // 3. Smart-Check: Soll die API überhaupt aufgerufen werden?
  let shouldFetch = force

  if (!force && dbMatchesToday.length > 0) {
    const hasLiveMatches = dbMatchesToday.some(m => m.status === 'live')
    const allFinished = dbMatchesToday.every(m => m.status === 'finished')

    if (allFinished) {
      console.log('✅ Alle heutigen Spiele sind bereits beendet. Überspringe API-Aufruf zur Quotaschonung.')
      return
    }

    const timestamps = dbMatchesToday.map(m => new Date(m.anpfiff).getTime())
    const earliestKickoff = new Date(Math.min(...timestamps))
    const latestKickoff = new Date(Math.max(...timestamps))

    const startWindow = new Date(earliestKickoff.getTime() - 15 * 60 * 1000) // 15 Min vor Anpfiff
    const endWindow = new Date(latestKickoff.getTime() + 150 * 60 * 1000)    // 2.5 Std nach Anpfiff (Spielende)

    const isLiveWindow = now >= startWindow && now <= endWindow
    const isMorningSync = now.getHours() >= 9 && now.getHours() <= 11 // Morgenabgleich 09:00 - 11:59

    if (isLiveWindow) {
      console.log('⚽ Aktives Live-Fenster erkannt. API-Abfrage erlaubt.')
      shouldFetch = true
    } else if (hasLiveMatches) {
      console.log('📡 Live-Spiele in DB erkannt. API-Abfrage erlaubt.')
      shouldFetch = true
    } else if (isMorningSync) {
      console.log('⏰ Vormittags-Abgleich. API-Abfrage erlaubt.')
      shouldFetch = true
    } else {
      console.log('💤 Keine aktiven Spiele im Moment. Überspringe API-Aufruf zur Quotaschonung.')
      return
    }
  } else if (!force && dbMatchesToday.length === 0) {
    console.log('💤 Keine Spiele für heute angesetzt. Überspringe API-Aufruf zur Quotaschonung.')
    return
  }

  // 4. API-Schlüssel prüfen
  if (!apiFootballKey) {
    console.error('❌ API_FOOTBALL_KEY fehlt in .env. Überspringe Synchronisierung.')
    return
  }

  // 5. API-Football aufrufen (Spiele für das heutige Datum holen)
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  const dateStr = `${yyyy}-${mm}-${dd}`

  const league = process.env.API_FOOTBALL_LEAGUE || '203'
  const season = process.env.API_FOOTBALL_SEASON || '2026'

  const apiUrl = `https://v3.football.api-sports.io/fixtures?date=${dateStr}&league=${league}&season=${season}`
  console.log(`🌐 Rufe API-Football auf: ${apiUrl}`)

  try {
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'x-apisports-key': apiFootballKey
      }
    })

    if (!response.ok) {
      throw new Error(`HTTP-Error status: ${response.status}`)
    }

    const result = await response.json()
    
    if (result.errors && Object.keys(result.errors).length > 0) {
      console.error('❌ API-Football Fehler:', result.errors)
      return
    }

    const fixtures = result.response || []
    console.log(`📥 API lieferte ${fixtures.length} Spiele für heute.`)

    let updatedCount = 0

    // 6. DB-Spiele mit API-Fixture abgleichen und aktualisieren
    for (const dbMatch of dbMatchesToday) {
      // Passendes Spiel in den API-Daten finden (über bereinigte Teamnamen)
      const fixture = fixtures.find(f => {
        const homeMatch = cleanName(f.teams.home.name) === cleanName(dbMatch.heim_team)
        const awayMatch = cleanName(f.teams.away.name) === cleanName(dbMatch.gast_team)
        return homeMatch && awayMatch
      })

      if (!fixture) {
        console.warn(`⚠️ Kein passendes Spiel für ${dbMatch.heim_team} vs. ${dbMatch.gast_team} in API gefunden.`)
        continue
      }

      const goalsHome = fixture.goals.home
      const goalsAway = fixture.goals.away
      const apiStatus = fixture.fixture.status.short
      const newStatus = mapStatus(apiStatus)

      // Nur updaten wenn sich Tore oder Status geändert haben
      const scoreChanged = dbMatch.tore_heim !== goalsHome || dbMatch.tore_gast !== goalsAway
      const statusChanged = dbMatch.status !== newStatus

      if (scoreChanged || statusChanged) {
        console.log(`🆙 Update: ${dbMatch.heim_team} vs. ${dbMatch.gast_team} ➡️ ${goalsHome}:${goalsAway} (${newStatus})`)
        
        const { error: updateError } = await supabase
          .from('matches')
          .update({
            tore_heim: goalsHome,
            tore_gast: goalsAway,
            status: newStatus
          })
          .eq('id', dbMatch.id)

        if (updateError) {
          console.error(`❌ Fehler beim Update in DB:`, updateError.message)
        } else {
          updatedCount++
        }
      }
    }

    console.log(`✅ Synchronisierung abgeschlossen. ${updatedCount} Spiele aktualisiert. (1 API-Request verbraucht)`)

  } catch (error) {
    console.error('❌ Fehler beim API-Aufruf:', error.message)
  }
}

syncScores()

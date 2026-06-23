import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(import.meta.dirname, '../.env') })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const apiFootballKey = process.env.API_FOOTBALL_KEY
const leagueId = process.env.API_FOOTBALL_LEAGUE || '203'
const season = process.env.API_FOOTBALL_SEASON || '2024'

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Supabase-Konfiguration fehlt in .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

// Clean names for team comparisons
function cleanName(name) {
  if (!name) return ''
  return name.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .replace(/[^a-z0-9]/g, '')
}

// Map API status to DB status
function mapStatus(apiStatus) {
  switch (apiStatus) {
    case 'NS': return 'upcoming'
    case '1H':
    case '2H':
    case 'HT':
    case 'ET':
    case 'BT':
    case 'P':
    case 'LIVE':
      return 'live'
    case 'FT':
    case 'AET':
    case 'PEN':
      return 'finished'
    case 'PST':
    case 'CANC':
    case 'ABD':
      return 'postponed'
    default:
      return 'upcoming'
  }
}

async function syncAllFixtures() {
  const shiftDates = process.argv.includes('--shift-to-future')
  const hasValidApiKey = apiFootballKey && apiFootballKey !== 'your-api-sports-key'

  if (shiftDates) {
    console.log('🔄 Modus: Verschiebe vorhandene Spiele in der DB um 2 Jahre in die Zukunft...')
    
    // Alle Spiele holen
    const { data: dbMatches, error: fetchError } = await supabase
      .from('matches')
      .select('*')

    if (fetchError) {
      console.error('❌ Fehler beim Laden der Spiele:', fetchError.message)
      return
    }

    console.log(`Loaded ${dbMatches.length} matches. Shifting dates...`)
    let updatedCount = 0

    for (const match of dbMatches) {
      const originalAnpfiff = new Date(match.anpfiff)
      // Add exactly 2 years (24 months)
      const newAnpfiff = new Date(originalAnpfiff)
      newAnpfiff.setFullYear(originalAnpfiff.getFullYear() + 2)

      const isFuture = newAnpfiff > new Date()
      const newStatus = isFuture ? 'upcoming' : match.status
      const newToreHeim = isFuture ? null : match.tore_heim
      const newToreGast = isFuture ? null : match.tore_gast

      const { error: updateError } = await supabase
        .from('matches')
        .update({
          anpfiff: newAnpfiff.toISOString(),
          status: newStatus,
          tore_heim: newToreHeim,
          tore_gast: newToreGast
        })
        .eq('id', match.id)

      if (updateError) {
        console.error(`❌ Error updating match ${match.id}:`, updateError.message)
      } else {
        updatedCount++
      }
    }

    console.log(`✅ Shifting complete. ${updatedCount} matches updated.`)
    return
  }

  // Real API Sync
  if (!hasValidApiKey) {
    console.error('❌ Kein gültiger API_FOOTBALL_KEY in .env gefunden.')
    console.log('Falls du die bestehenden Spiele einfach nur in die Zukunft verschieben willst, starte das Skript mit:')
    console.log('  node scripts/import_fixtures.js --shift-to-future')
    return
  }

  const apiUrl = `https://v3.football.api-sports.io/fixtures?league=${leagueId}&season=${season}`
  console.log(`🌐 Rufe API-Football auf für alle Spiele der Saison ${season} (League: ${leagueId})...`)
  console.log(`URL: ${apiUrl}`)

  try {
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'x-apisports-key': apiFootballKey
      }
    })

    if (!response.ok) {
      throw new Error(`HTTP Error Status: ${response.status}`)
    }

    const result = await response.json()
    if (result.errors && Object.keys(result.errors).length > 0) {
      console.error('❌ API-Football Fehler:', result.errors)
      return
    }

    const fixtures = result.response || []
    console.log(`📥 API lieferte ${fixtures.length} Spiele für die Saison.`)

    if (fixtures.length === 0) {
      console.log('⚠️ Keine Spiele gefunden.')
      return
    }

    // Vorhandene Spiele laden, um zu sehen was wir aktualisieren müssen
    const { data: dbMatches, error: dbError } = await supabase
      .from('matches')
      .select('*')

    if (dbError) {
      console.error('❌ Fehler beim Laden der DB-Spiele:', dbError.message)
      return
    }

    let insertCount = 0
    let updateCount = 0

    for (const f of fixtures) {
      // Spieltag ermitteln aus "Regular Season - 1" -> 1
      const roundStr = f.league.round || ''
      let spieltag = 1;
      if (roundStr.includes('Regular Season') || roundStr.includes('League Phase') || roundStr.includes('Group Stage')) {
        const match = roundStr.match(/\d+/);
        spieltag = match ? parseInt(match[0]) : 1;
      } else if (roundStr.includes('Play-offs') || roundStr.includes('Knockout Round Play-offs')) {
        spieltag = 9;
      } else if (roundStr.includes('Round of 16') || roundStr.includes('16')) {
        spieltag = 10;
      } else if (roundStr.includes('Quarter-finals') || roundStr.includes('Quarter')) {
        spieltag = 11;
      } else if (roundStr.includes('Semi-finals') || roundStr.includes('Semi')) {
        spieltag = 12;
      } else if (roundStr.includes('Final')) {
        spieltag = 13;
      } else {
        const match = roundStr.match(/\d+/);
        spieltag = match ? parseInt(match[0]) : 1;
      }

      const heim = f.teams.home.name
      const gast = f.teams.away.name
      const originalAnpfiff = new Date(f.fixture.date)
      const anpfiffDate = new Date(originalAnpfiff)
      anpfiffDate.setFullYear(originalAnpfiff.getFullYear() + 2) // Shift 2 years to 2025/26
      const anpfiff = anpfiffDate.toISOString()

      const status = mapStatus(f.fixture.status.short)
      const toreHeim = f.goals.home
      const toreGast = f.goals.away

      // Prüfen ob bereits in DB vorhanden
      const dbMatch = dbMatches.find(m => 
        m.spieltag === spieltag && 
        cleanName(m.heim_team) === cleanName(heim) && 
        cleanName(m.gast_team) === cleanName(gast)
      )

      if (dbMatch) {
        // Update
        const { error: updateError } = await supabase
          .from('matches')
          .update({
            anpfiff,
            status,
            tore_heim: toreHeim,
            tore_gast: toreGast,
            season: 2025,
            tournament: 'Champions League'
          })
          .eq('id', dbMatch.id)

        if (updateError) {
          console.error(`❌ Fehler beim Update von ${heim} vs ${gast}:`, updateError.message)
        } else {
          updateCount++
        }
      } else {
        // Insert
        const { error: insertError } = await supabase
          .from('matches')
          .insert({
            spieltag,
            heim_team: heim,
            gast_team: gast,
            anpfiff,
            status,
            tore_heim: toreHeim,
            tore_gast: toreGast,
            season: 2025,
            tournament: 'Champions League'
          })

        if (insertError) {
          console.error(`❌ Fehler beim Einfügen von ${heim} vs ${gast}:`, insertError.message)
        } else {
          insertCount++
        }
      }
    }

    console.log(`✅ Synchronisierung beendet: ${updateCount} Spiele aktualisiert, ${insertCount} Spiele neu hinzugefügt.`)

  } catch (err) {
    console.error('❌ Fehler bei der API-Synchronisierung:', err.message)
  }
}

syncAllFixtures()

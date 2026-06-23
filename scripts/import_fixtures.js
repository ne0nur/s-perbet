import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(import.meta.dirname, '../.env') })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const apiFootballKey = process.env.API_FOOTBALL_KEY
const leagueId = process.env.API_FOOTBALL_LEAGUE || '203'
const season = parseInt(process.env.API_FOOTBALL_SEASON || '2026')

const tournamentName = leagueId === '203' ? 'Süper Lig' : leagueId === '2' ? 'Champions League' : 'Unbekannt'

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
  const hasValidApiKey = apiFootballKey && apiFootballKey !== 'your-api-sports-key'

  if (!hasValidApiKey) {
    console.error('❌ Kein gültiger API_FOOTBALL_KEY in .env gefunden.')
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

    const { data: dbMatches, error: dbError } = await supabase
      .from('matches')
      .select('*')
      .eq('tournament', tournamentName)
      .eq('season', season)

    if (dbError) {
      console.error('❌ Fehler beim Laden der DB-Spiele:', dbError.message)
      return
    }

    let insertCount = 0
    let updateCount = 0

    for (const f of fixtures) {
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
      const anpfiff = new Date(f.fixture.date).toISOString()
      const status = mapStatus(f.fixture.status.short)
      const toreHeim = f.goals.home
      const toreGast = f.goals.away

      const dbMatch = dbMatches.find(m => 
        m.spieltag === spieltag && 
        cleanName(m.heim_team) === cleanName(heim) && 
        cleanName(m.gast_team) === cleanName(gast)
      )

      if (dbMatch) {
        const { error: updateError } = await supabase
          .from('matches')
          .update({
            anpfiff,
            status,
            tore_heim: toreHeim,
            tore_gast: toreGast
          })
          .eq('id', dbMatch.id)

        if (updateError) {
          console.error(`❌ Fehler beim Update von ${heim} vs ${gast}:`, updateError.message)
        } else {
          updateCount++
        }
      } else {
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
            season: season,
            tournament: tournamentName
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

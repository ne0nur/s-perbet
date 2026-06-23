import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(import.meta.dirname, '../.env') })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const apiFootballKey = process.env.API_FOOTBALL_KEY
const leagueId = process.env.API_FOOTBALL_LEAGUE || '203' // Süper Lig

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Supabase-Konfiguration fehlt in .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function importSeason(season) {
  console.log(`🌐 Rufe API-Football auf für die Saison ${season}...`)
  
  if (!apiFootballKey || apiFootballKey === 'your-api-sports-key') {
    console.error('❌ API_FOOTBALL_KEY fehlt oder ist ungültig in .env')
    return false;
  }

  const apiUrl = `https://v3.football.api-sports.io/standings?league=${leagueId}&season=${season}`
  
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
      console.error(`❌ API-Football Fehler für Saison ${season}:`, result.errors)
      return false
    }

    const leagueData = result.response?.[0]?.league
    const standings = leagueData?.standings?.[0] || []

    if (standings.length === 0) {
      console.log(`⚠️ Keine Tabellendaten für Saison ${season} gefunden.`)
      return false
    }

    console.log(`📥 API lieferte ${standings.length} Teams für Saison ${season}. Schreibe in Datenbank...`)

    for (const item of standings) {
      const row = {
        season: parseInt(season),
        rank: item.rank,
        team_name: item.team.name,
        played: item.all.played,
        won: item.all.win,
        drawn: item.all.draw,
        lost: item.all.lose,
        goals_for: item.all.goals.for,
        goals_against: item.all.goals.against,
        goal_difference: item.goalsDiff,
        points: item.points,
        form: item.form || null
      }

      // Upsert: Einfügen oder aktualisieren basierend auf (season, team_name)
      const { error } = await supabase
        .from('historical_standings')
        .upsert(row, { onConflict: 'season,team_name' })

      if (error) {
        console.error(`❌ Fehler beim Speichern von ${item.team.name}:`, error.message)
      }
    }

    console.log(`✅ Saison ${season} erfolgreich importiert.`)
    return true
  } catch (err) {
    console.error(`❌ Unerwarteter Fehler bei Saison ${season}:`, err.message)
    return false
  }
}

async function main() {
  // Die letzten 5 Saisons importieren (2021, 2022, 2023, 2024, 2025)
  const seasons = ['2021', '2022', '2023', '2024', '2025']
  console.log(`🚀 Starte Import der letzten 5 Saisons: ${seasons.join(', ')}`)

  for (const season of seasons) {
    const success = await importSeason(season)
    if (!success) {
      console.warn(`⚠️ Import für Saison ${season} fehlgeschlagen. Fahre fort...`)
    }
    // Kurze Pause, um API-Rate Limits zu schonen
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  console.log('🏁 Alle Importe abgeschlossen!')
}

main()

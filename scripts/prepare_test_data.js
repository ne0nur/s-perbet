import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(import.meta.dirname, '../.env') })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ SUPABASE_URL oder SUPABASE_SERVICE_ROLE_KEY fehlt in .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function prepareTestData() {
  console.log('🔄 Setze Spieltag 5 Matches zurück in die Zukunft...')

  // 1. Zuerst alle Tipps für Spieltag 5 Matches löschen, damit wir sauber testen können
  const { data: matches, error: fetchError } = await supabase
    .from('matches')
    .select('id')
    .eq('spieltag', 5)

  if (fetchError) {
    console.error('❌ Fehler beim Laden von Spieltag 5 Matches:', fetchError.message)
    return
  }

  const matchIds = matches.map(m => m.id)
  
  if (matchIds.length > 0) {
    const { error: deleteTipsError } = await supabase
      .from('tips')
      .delete()
      .in('match_id', matchIds)

    if (deleteTipsError) {
      console.warn('⚠️ Warnung beim Löschen alter Tipps:', deleteTipsError.message)
    }
  }

  // 2. Setze die Kickoff-Zeitpunkte in die Zukunft (z.B. ab heute + 2 Tage)
  const baseTime = new Date()
  baseTime.setDate(baseTime.getDate() + 2) // In 2 Tagen

  const { error: updateError } = await supabase
    .from('matches')
    .update({
      status: 'upcoming',
      tore_heim: null,
      tore_gast: null,
      anpfiff: baseTime.toISOString()
    })
    .eq('spieltag', 5)

  if (updateError) {
    console.error('❌ Fehler beim Zurücksetzen der Matches:', updateError.message)
    return
  }

  console.log('✅ Spieltag 5 erfolgreich zurückgesetzt! Die Spiele liegen nun in der Zukunft und haben keine Tore.')
}

prepareTestData()

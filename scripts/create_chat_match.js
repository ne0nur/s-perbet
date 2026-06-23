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

const CHAT_MATCH_ID = '00000000-0000-0000-0000-000000000000'

async function createChatMatch() {
  console.log('🔄 Erstelle Dummy-Match für den globalen Gruppen-Chat...')

  // Prüfen, ob das Match bereits existiert
  const { data: existing, error: fetchError } = await supabase
    .from('matches')
    .select('id')
    .eq('id', CHAT_MATCH_ID)
    .single()

  if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116: no rows returned
    console.error('❌ Fehler beim Prüfen des Matches:', fetchError.message)
    return
  }

  if (existing) {
    console.log('✅ Dummy-Match für globalen Chat existiert bereits.')
    return
  }

  // Dummy-Match einfügen
  const { error: insertError } = await supabase
    .from('matches')
    .insert({
      id: CHAT_MATCH_ID,
      spieltag: 999, // Außerhalb der regulären Spieltage
      heim_team: 'LIGA',
      gast_team: 'CHAT',
      anpfiff: '2020-01-01T00:00:00.000Z',
      status: 'postponed'
    })

  if (insertError) {
    console.error('❌ Fehler beim Erstellen des Dummy-Matches:', insertError.message)
    return
  }

  console.log('✅ Dummy-Match für den globalen Chat erfolgreich erstellt!')
}

createChatMatch()

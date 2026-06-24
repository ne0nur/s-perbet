import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(import.meta.dirname, '../.env') })
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const targetIds = [
  { name: 'tipper_8456', id: 'a3ca5663-dc8e-47d7-8906-30539f5c6dbc' },
  { name: 'test_admin_created', id: '93c29a44-af8e-48c2-810c-afbbd9caccb5' }
]

const tables = [
  'tips',
  'bonus_tipps',
  'chat_nachrichten',
  'league_members',
  'user_season_points',
  'leagues'
]

async function run() {
  for (const target of targetIds) {
    console.log(`\n🔍 Checking dependencies for user: ${target.name} (${target.id})`)
    
    // Check in public.profiles first
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', target.id).single()
    console.log('Profile details:', profile)

    for (const table of tables) {
      let query = supabase.from(table).select('*', { count: 'exact' })
      if (table === 'leagues') {
        // leagues can use creator_id or created_by depending on actual columns
        query = query.or(`creator_id.eq.${target.id}`)
      } else {
        query = query.eq(table === 'league_members' ? 'user_id' : 'user_id', target.id)
      }
      
      const { data, count, error } = await query
      if (error) {
        // Fallback check for leagues 'created_by'
        if (table === 'leagues') {
          const { data: fallbackData, count: fallbackCount } = await supabase.from(table).select('*', { count: 'exact' }).eq('created_by', target.id)
          console.log(`  Table '${table}' (created_by): found ${fallbackCount} rows`)
        } else {
          console.error(`  Error checking table '${table}':`, error.message)
        }
      } else {
        console.log(`  Table '${table}': found ${count} rows`)
        if (count > 0) {
          console.log('  Rows:', data)
        }
      }
    }
  }
}
run()

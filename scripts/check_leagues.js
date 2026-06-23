import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(import.meta.dirname, '../.env') })

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function checkLeagues() {
  const { data: leagues } = await supabase.from('leagues').select('*')
  console.log(`Total leagues in DB: ${leagues?.length || 0}`)
  
  const { data: users } = await supabase.from('profiles').select('username, is_admin').eq('username', 'test')
  console.log(`User "test" is_admin:`, users)
}

checkLeagues()

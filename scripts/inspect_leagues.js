import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(import.meta.dirname, '../.env') })
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function run() {
  const { data: leagues, error } = await supabase.from('leagues').select('*')
  console.log('Leagues error:', error)
  console.log('Leagues data:', leagues)
}
run()

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
async function run() {
  const { error } = await supabase.from('tournament_configs').update({ has_historical_data: true }).eq('name', 'Süper Lig')
  console.log('Update done, error:', error)
}
run()

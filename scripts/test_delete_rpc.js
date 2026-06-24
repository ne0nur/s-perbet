import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(import.meta.dirname, '../.env') })
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function run() {
  console.log('Testing RPC admin_delete_user for spieler1...')
  const { data, error } = await supabase.rpc('admin_delete_user', { target_username: 'spieler1' })
  console.log('Error:', error)
  console.log('Data:', data)
}
run()

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)

async function run() {
  const { data: { user } } = await supabase.auth.signInWithPassword({ email: 'onurhamza@web.de', password: 'test' })
  const { data } = await supabase.rpc('get_ranking_with_trend')
  console.log(data)
}
run()

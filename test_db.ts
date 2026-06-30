import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function run() {
  const { data } = await supabase.from('tips').select('user_id, punkte')
  
  const sums = {}
  data.forEach(t => {
    sums[t.user_id] = (sums[t.user_id] || 0) + (t.punkte || 0)
  })
  console.log(sums)
  
  const { data: pData } = await supabase.from('profiles').select('id, gesamt_punkte')
  console.log("Profiles DB:", pData)
}
run()

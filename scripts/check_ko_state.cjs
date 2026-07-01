const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  const { data, error } = await supabase.from('matches').select('*').eq('tournament', 'World Cup 2026').gte('spieltag', 4).order('anpfiff')
  if (error) console.error(error)
  else {
    console.log("DB Matches ab Sechzehntelfinale:")
    data.forEach(m => console.log(`${m.spieltag} | ${m.anpfiff} | ${m.heim_team} vs ${m.gast_team}`))
  }
}
run()

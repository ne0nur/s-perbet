import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(import.meta.dirname, '../.env') })

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const { data: s5 } = await supabase
  .from('matches')
  .select('heim_team, gast_team, spieltag, status')
  .eq('tournament', 'World Cup 2026')
  .eq('spieltag', 5)
  .order('anpfiff')

console.log('S5 Achtelfinale:')
s5.forEach((m, i) => console.log(`  [${i}] ${m.heim_team} vs ${m.gast_team} | ${m.status}`))

const { data: s4 } = await supabase
  .from('matches')
  .select('heim_team, gast_team, status, tore_heim, tore_gast')
  .eq('tournament', 'World Cup 2026')
  .eq('spieltag', 4)
  .order('anpfiff')

console.log('\nS4 (nur finished):')
s4.filter(m => m.status === 'finished').forEach(m => {
  console.log(`  ${m.heim_team} ${m.tore_heim}:${m.tore_gast} ${m.gast_team}`)
})

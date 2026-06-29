// scripts/test_bracket_propagation.js
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(import.meta.dirname, '../.env') })

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Rufe die Edge Function mit Service Role auf
const fnUrl = `${process.env.VITE_SUPABASE_URL}/functions/v1/sync-match-results`
const res = await fetch(fnUrl, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
  },
})
const result = await res.json()
console.log(JSON.stringify(result, null, 2))

// Check S5[0] heim_team
if (result.success) {
  const { data: s5 } = await supabase
    .from('matches')
    .select('heim_team, gast_team, spieltag')
    .eq('tournament', 'World Cup 2026')
    .eq('spieltag', 5)
    .order('anpfiff', { ascending: true })
    .limit(1)
    .single()
  console.log('\nS5[0] Achtelfinale:', s5?.heim_team, 'vs', s5?.gast_team)
}

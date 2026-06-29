import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(import.meta.dirname, '../.env') })

const url = process.env.VITE_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

const res = await fetch(`${url}/functions/v1/sync-match-results`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${key}`,
    'Content-Type': 'application/json',
  },
})
const data = await res.json()
console.log(JSON.stringify(data, null, 2))

// Check S5
import { createClient } from '@supabase/supabase-js'
const s = createClient(url, key)
const { data: s5 } = await s.from('matches')
  .select('heim_team, gast_team, spieltag, status')
  .eq('tournament', 'World Cup 2026')
  .eq('spieltag', 5)
  .order('anpfiff')
  .limit(1)
  .single()
console.log('\nS5[0]:', s5?.heim_team, 'vs', s5?.gast_team)

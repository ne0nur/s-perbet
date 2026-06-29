import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(import.meta.dirname, '../.env') })

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

function mapStatus(short) {
  switch (short) {
    case 'NS': case 'TBD': return 'upcoming'
    case '1H': case '2H': case 'HT': case 'ET': case 'BT': case 'P': case 'LIVE': return 'live'
    case 'FT': case 'AET': case 'PEN': return 'finished'
    default: return 'upcoming'
  }
}

const roundSpieltag = {
  'Group Stage - 1': 1, 'Group Stage - 2': 2, 'Group Stage - 3': 3,
  'Round of 32': 4, 'Round of 16': 5,
  'Quarter-finals': 6, 'Semi-finals': 7, 'Final': 8, '3rd Place Final': 8
}

const fixtures = [
  { home: 'Algeria', away: 'Austria', goals: [3,3], status: 'FT', date: '2026-06-28T02:00:00Z', round: 'Group Stage - 3' },
  { home: 'Jordan', away: 'Argentina', goals: [1,3], status: 'FT', date: '2026-06-28T02:00:00Z', round: 'Group Stage - 3' },
  { home: 'South Africa', away: 'Canada', goals: [0,1], status: 'FT', date: '2026-06-28T19:00:00Z', round: 'Round of 32' },
  { home: 'Brazil', away: 'Japan', goals: [null,null], status: 'NS', date: '2026-06-29T17:00:00Z', round: 'Round of 32' },
  { home: 'Germany', away: 'Paraguay', goals: [null,null], status: 'NS', date: '2026-06-29T20:30:00Z', round: 'Round of 32' },
]

// Delete old WC matches
await supabase.from('matches').delete().eq('tournament', 'World Cup 2026')

for (const f of fixtures) {
  const st = mapStatus(f.status)
  const { error } = await supabase.from('matches').insert({
    heim_team: f.home, gast_team: f.away,
    anpfiff: f.date,
    tore_heim: st === 'finished' ? f.goals[0] : null,
    tore_gast: st === 'finished' ? f.goals[1] : null,
    status: st,
    spieltag: roundSpieltag[f.round] || 1,
    season: 2026,
    tournament: 'World Cup 2026',
  })
  if (error) console.error(`❌ ${f.home}-${f.away}:`, error.message)
  else console.log(`✅ ${f.home} vs ${f.away} (${st})`)
}

const { count } = await supabase.from('matches').select('*', { count: 'exact', head: true }).eq('tournament', 'World Cup 2026')
console.log(`\n✅ ${count} WM-Matches in DB`)

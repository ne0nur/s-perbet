// scripts/export_ko_matches.js
// Exportiert alle KO-Matches für die Bracket-Map-Erstellung
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(import.meta.dirname, '../.env') })

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const { data, error } = await supabase
  .from('matches')
  .select('id, spieltag, heim_team, gast_team, tore_heim, tore_gast, status, anpfiff, tournament')
  .eq('tournament', 'World Cup 2026')
  .gte('spieltag', 4)
  .order('spieltag', { ascending: true })
  .order('anpfiff', { ascending: true })

if (error) {
  console.error('❌', error.message)
  process.exit(1)
}

// Gruppiere nach Spieltag
const bySpieltag = {}
for (const m of data) {
  if (!bySpieltag[m.spieltag]) bySpieltag[m.spieltag] = []
  bySpieltag[m.spieltag].push(m)
}

for (const [st, matches] of Object.entries(bySpieltag)) {
  console.log(`\n=== Spieltag ${st} (${matches.length} Matches) ===`)
  matches.forEach((m, i) => {
    const score = m.tore_heim !== null ? ` [${m.tore_heim}:${m.tore_gast}]` : ''
    console.log(`  [${i}] ${m.heim_team} vs ${m.gast_team}${score} | ${m.status} | id=${m.id}`)
  })
}

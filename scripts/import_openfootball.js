import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'
import { readFileSync } from 'fs'

config({ path: resolve(import.meta.dirname, '../.env') })
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function run() {
  // Delete all existing matches
  await supabase.from('matches').delete().gt('id', 0)

  // Read tr.json
  const data = JSON.parse(readFileSync('/tmp/tr.json', 'utf8'))
  let insertCount = 0

  for (const m of data.matches) {
    const spieltag = parseInt(m.round.replace(/[^0-9]/g, '')) || 1
    const anpfiff = new Date(`${m.date}T${m.time || '18:00'}:00Z`).toISOString()
    const tore_heim = m.score?.ft ? m.score.ft[0] : null
    const tore_gast = m.score?.ft ? m.score.ft[1] : null
    const status = tore_heim !== null ? 'finished' : 'upcoming'

    await supabase.from('matches').insert({
      spieltag,
      heim_team: m.team1,
      gast_team: m.team2,
      anpfiff,
      status,
      tore_heim,
      tore_gast
    })
    insertCount++
  }
  console.log(`✅ Inserted ${insertCount} true 2025/2026 matches`)
}
run()

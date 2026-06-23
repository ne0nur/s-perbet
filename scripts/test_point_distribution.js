import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(import.meta.dirname, '../.env') })

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function testPointsDistribution() {
  console.log('🧪 Starte Test der Punkteverteilung...')
  
  // 1. Create a dummy match
  const matchId = '11111111-1111-1111-1111-111111111111'
  const { error: matchError } = await supabase.from('matches').upsert({
    id: matchId,
    heim_team: 'Test Heim',
    gast_team: 'Test Gast',
    spieltag: 99,
    status: 'upcoming',
    anpfiff: new Date().toISOString(),
    tournament: 'TEST',
    season: 2026
  })
  
  if (matchError) return console.error('Match creation error:', matchError)
  console.log('✅ Dummy Match erstellt.')

  // 2. Fetch some existing users to attach tips to
  const { data: users } = await supabase.from('profiles').select('id, username').limit(2)
  if (!users || users.length < 2) return console.error('Not enough users for test.')
  
  const user1 = users[0]
  const user2 = users[1]

  // 3. Insert tips
  // User 1 tips 2:1
  // User 2 tips 3:0
  await supabase.from('tips').upsert([
    { user_id: user1.id, match_id: matchId, tipp_heim: 2, tipp_gast: 1 },
    { user_id: user2.id, match_id: matchId, tipp_heim: 3, tipp_gast: 0 }
  ])
  console.log(`✅ Tipps erstellt: ${user1.username} (2:1) und ${user2.username} (3:0).`)

  // 4. Update Match to 2:1 (Finished)
  console.log('⚽ Beende Match mit Ergebnis 2:1...')
  await supabase.from('matches').update({
    tore_heim: 2,
    tore_gast: 1,
    status: 'finished'
  }).eq('id', matchId)

  // Wait a tiny bit for the trigger (though it's synchronous)
  await new Promise(r => setTimeout(r, 1000))

  // 5. Verify Tips points
  const { data: tips } = await supabase.from('tips').select('user_id, punkte').eq('match_id', matchId)
  
  let success = true
  for (const tip of tips) {
    if (tip.user_id === user1.id) {
      if (tip.punkte === 4) console.log(`🎉 SUCCESS: ${user1.username} hat exakt getippt und 4 Punkte erhalten!`)
      else { console.error(`❌ FEHLER: ${user1.username} hat ${tip.punkte} statt 4 Punkten erhalten.`); success = false; }
    }
    if (tip.user_id === user2.id) {
      if (tip.punkte === 2) console.log(`🎉 SUCCESS: ${user2.username} hat die Tendenz getippt und 2 Punkte erhalten!`)
      else { console.error(`❌ FEHLER: ${user2.username} hat ${tip.punkte} statt 2 Punkten erhalten.`); success = false; }
    }
  }

  // 6. Check Overall Points
  const { data: profiles } = await supabase.from('profiles').select('username, gesamt_punkte').in('id', [user1.id, user2.id])
  console.log('Aktuelle Gesamtpunkte:', profiles)

  // 7. Cleanup
  console.log('🧹 Räume Testdaten auf...')
  await supabase.from('matches').delete().eq('id', matchId)
  
  if (success) {
    console.log('🚀 SYSTEMABNAHME BESTANDEN! Die Automatisierung und Punkteverteilung funktioniert einwandfrei.')
  }
}

testPointsDistribution()

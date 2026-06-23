/**
 * Admin-Script für die Tipprunde
 * 
 * Nutzung:
 *   node scripts/admin.js create <username> <passwort>
 *   node scripts/admin.js reset-pw <username> <neues-passwort>
 *   node scripts/admin.js list
 *   node scripts/admin.js clear-tipps --confirm
 * 
 * Voraussetzung: SUPABASE_SERVICE_ROLE_KEY in .env
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(import.meta.dirname, '../.env') })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ SUPABASE_URL oder SUPABASE_SERVICE_ROLE_KEY fehlt in .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const command = process.argv[2]

async function createUser(username, passwort) {
  const email = `${username}@gmail.com`

  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email,
    password: passwort,
    email_confirm: true,
    user_metadata: { username },
  })

  if (authError) {
    console.error(`❌ Fehler: ${authError.message}`)
    return
  }

  const { error: profileError } = await supabase
    .from('profiles')
    .update({ username, muss_passwort_aendern: true })
    .eq('id', authUser.user.id)

  if (profileError) {
    console.error(`⚠️  Profil-Update fehlgeschlagen: ${profileError.message}`)
  }

  console.log(`✅ User erstellt: ${username}`)
  console.log(`   E-Mail (intern): ${email}`)
  console.log(`   Passwort: ${passwort}`)
  console.log(`   Muss PW ändern: ja`)
}

async function resetPassword(username, neuesPasswort) {
  const email = `${username}@gmail.com`

  const { data: users, error: listError } = await supabase.auth.admin.listUsers()
  if (listError) {
    console.error(`❌ Fehler: ${listError.message}`)
    return
  }

  const user = users.users.find(u => u.email === email)
  if (!user) {
    console.error(`❌ User "${username}" nicht gefunden.`)
    return
  }

  const { error } = await supabase.auth.admin.updateUserById(user.id, {
    password: neuesPasswort,
  })

  if (error) {
    console.error(`❌ Fehler: ${error.message}`)
    return
  }

  await supabase.from('profiles').update({ muss_passwort_aendern: true }).eq('id', user.id)

  console.log(`✅ Passwort für ${username} zurückgesetzt: ${neuesPasswort}`)
}

async function clearTipps() {
  console.log('🗑️  Lösche alle Tipps & Bonus-Tipps...')

  const args = process.argv.slice(2)
  if (!args.includes('--confirm')) {
    console.log('⚠️  Bitte mit --confirm bestätigen!')
    console.log('   node scripts/admin.js clear-tipps --confirm')
    return
  }

  const { error: tipsError, count: tipsCount } = await supabase
    .from('tips')
    .delete({ count: 'exact' })
    .neq('id', '00000000-0000-0000-0000-000000000000')

  if (tipsError) {
    console.error(`❌ Fehler bei tips: ${tipsError.message}`)
  } else {
    console.log(`✅ ${tipsCount} Tipps gelöscht`)
  }

  const { error: bonusError, count: bonusCount } = await supabase
    .from('bonus_tipps')
    .delete({ count: 'exact' })
    .neq('id', '00000000-0000-0000-0000-000000000000')

  if (bonusError) {
    console.error(`❌ Fehler bei bonus_tipps: ${bonusError.message}`)
  } else {
    console.log(`✅ ${bonusCount} Bonus-Tipps gelöscht`)
  }
}

async function listUsers() {
  const { data: users, error } = await supabase.auth.admin.listUsers()
  if (error) {
    console.error(`❌ Fehler: ${error.message}`)
    return
  }

  console.log(`📋 ${users.users.length} User:\n`)
  for (const u of users.users) {
    const { data: profile } = await supabase.from('profiles').select('username,muss_passwort_aendern,is_admin').eq('id', u.id).single()
    const name = profile?.username || u.email
    const admin = profile?.is_admin ? ' 👑' : ''
    const pwAendern = profile?.muss_passwort_aendern ? ' ⚠️ PW-Änderung nötig' : ''
    const lastSignIn = u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString('de-DE') : 'nie'
    console.log(`  ${name}${admin}${pwAendern}`)
    console.log(`    Letzter Login: ${lastSignIn}`)
  }
}

async function main() {
  switch (command) {
    case 'create':
      if (!process.argv[3] || !process.argv[4]) {
        console.log('Nutzung: node scripts/admin.js create <username> <passwort>')
        return
      }
      await createUser(process.argv[3], process.argv[4])
      break

    case 'reset-pw':
      if (!process.argv[3] || !process.argv[4]) {
        console.log('Nutzung: node scripts/admin.js reset-pw <username> <neues-passwort>')
        return
      }
      await resetPassword(process.argv[3], process.argv[4])
      break

    case 'list':
      await listUsers()
      break

    case 'clear-tipps':
      await clearTipps()
      break

    default:
      console.log('Tipprunde Admin-Script')
      console.log('  create <username> <passwort>      – User erstellen')
      console.log('  reset-pw <username> <passwort>    – Passwort zurücksetzen')
      console.log('  list                              – Alle User auflisten')
      console.log('  clear-tipps --confirm             – Alle Tipps & Bonus-Tipps löschen')
  }
}

main()

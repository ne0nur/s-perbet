import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(import.meta.dirname, '../.env') })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function run() {
  console.log('🔄 Fetching users from auth.users...')
  const { data, error } = await supabase.auth.admin.listUsers()
  
  if (error) {
    console.error('❌ Error fetching users:', JSON.stringify(error, null, 2))
    return
  }

  const users = data?.users || []
  console.log(`📋 Found ${users.length} users in Supabase Auth. Checking profiles...`)

  let deleteCount = 0;
  for (const user of users) {
    // Get username from profiles
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', user.id)
      .single()

    const username = profile?.username || user.email || user.id
    console.log(`👤 User: ${username} (ID: ${user.id})`)

    if (username.toLowerCase() === 'test') {
      console.log(`⭐️ Keeping user: ${username}`)
    } else {
      console.log(`🗑️ Deleting user: ${username}...`)
      const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id)
      if (deleteError) {
        console.error(`❌ Failed to delete user ${username}:`, JSON.stringify(deleteError, null, 2))
      } else {
        console.log(`✅ Deleted user: ${username}`)
        deleteCount++
      }
    }
  }

  console.log(`🎉 Done! Deleted ${deleteCount} users.`)
}

run().catch(err => console.error('❌ Script failed:', err))

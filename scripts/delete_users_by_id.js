import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(import.meta.dirname, '../.env') })
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function run() {
  console.log('🔄 Fetching user profiles via public REST API...')
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('id, username')
  
  if (profileError) {
    console.error('❌ Error fetching profiles:', profileError)
    return
  }

  console.log(`📋 Found ${profiles.length} profiles. Filtering out 'test'...`)

  let deleteCount = 0
  for (const profile of profiles) {
    const { id, username } = profile
    if (!username) continue

    if (username.toLowerCase() === 'test') {
      console.log(`⭐️ Keeping user: ${username} (ID: ${id})`)
      continue
    }

    console.log(`🗑️ Deleting auth user: ${username} (ID: ${id})...`)
    const { error: deleteError } = await supabase.auth.admin.deleteUser(id)
    if (deleteError) {
      console.error(`❌ Failed to delete auth user ${username}:`, JSON.stringify(deleteError, null, 2))
    } else {
      console.log(`✅ Deleted user: ${username}`)
      deleteCount++
    }
  }

  console.log(`🎉 Done! Attempted to clean up. Successfully deleted ${deleteCount} users.`)
}

run().catch(err => console.error('❌ Script failed:', err))

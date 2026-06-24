import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(import.meta.dirname, '../.env') })
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const targetIds = [
  { name: 'tipper_8456', id: 'a3ca5663-dc8e-47d7-8906-30539f5c6dbc' },
  { name: 'test_admin_created', id: '93c29a44-af8e-48c2-810c-afbbd9caccb5' }
]

async function run() {
  for (const target of targetIds) {
    console.log(`🗑️ Deleting profile directly from public.profiles: ${target.name} (${target.id})...`)
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', target.id)
    
    if (error) {
      console.error(`❌ Failed to delete profile ${target.name}:`, error)
    } else {
      console.log(`✅ Successfully deleted profile: ${target.name}`)
    }
  }

  // Check if they are still listed in profiles
  const { data: profiles } = await supabase.from('profiles').select('id, username')
  console.log('remaining profiles in database:', profiles)
}

run().catch(console.error)

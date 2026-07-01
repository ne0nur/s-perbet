const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

async function run() {
  const url = `${supabaseUrl}/functions/v1/sync-match-results`
  console.log("Triggering: ", url)
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${supabaseKey}` }
  })
  const text = await res.text()
  console.log("Response:", text)
}
run()

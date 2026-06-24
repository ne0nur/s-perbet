import https from 'https'
import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(import.meta.dirname, '../.env') })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing credentials')
  process.exit(1)
}

const hostname = supabaseUrl.replace('https://', '')

const req = https.request({
  hostname,
  path: '/auth/v1/admin/users',
  method: 'GET',
  headers: {
    'apikey': serviceRoleKey,
    'Authorization': `Bearer ${serviceRoleKey}`
  }
}, (res) => {
  console.log(`Status Code: ${res.statusCode}`)
  console.log('Headers:', res.headers)
  
  let data = ''
  res.on('data', chunk => data += chunk)
  res.on('end', () => {
    console.log('Body:', data)
  })
})

req.on('error', err => console.error('Request Error:', err))
req.end()

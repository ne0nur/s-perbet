import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'
import fs from 'fs'

config({ path: resolve(import.meta.dirname, '../.env') })

const API_KEY = process.env.API_FOOTBALL_KEY

function normalizeName(name) {
  if (!name) return ''
  return name.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .replace(/[^a-z0-9]/g, '')
}

async function run() {
  console.log('Fetching 2024 Champions League from API-Football...')
  const url = 'https://v3.football.api-sports.io/fixtures?league=2&season=2024'
  const response = await fetch(url, { headers: { 'x-apisports-key': API_KEY } })
  const data = await response.json()

  const validRounds = [
    'League Stage - 1', 'League Stage - 2', 'League Stage - 3', 'League Stage - 4', 
    'League Stage - 5', 'League Stage - 6', 'League Stage - 7', 'League Stage - 8',
    'Knockout Round Play-offs', 'Round of 16', 'Quarter-finals', 'Semi-finals', 'Final'
  ]

  const teams = new Map()

  for (const f of data.response) {
    if (!validRounds.includes(f.league.round)) continue;

    const home = f.teams.home
    const away = f.teams.away

    teams.set(normalizeName(home.name), home.logo)
    teams.set(normalizeName(away.name), away.logo)
  }

  console.log(`Found ${teams.size} teams. Downloading logos...`)

  for (const [cleanName, logoUrl] of teams.entries()) {
    const dest = resolve(import.meta.dirname, `../public/logos/${cleanName}.png`)
    if (!fs.existsSync(dest)) {
      console.log(`Downloading ${cleanName}... (${logoUrl})`)
      const res = await fetch(logoUrl)
      const buffer = await res.arrayBuffer()
      fs.writeFileSync(dest, Buffer.from(buffer))
    }
  }

  console.log('Done downloading. Added names:')
  console.log(Array.from(teams.keys()).map(name => `'${name}'`).join(',\n'))
}

run()

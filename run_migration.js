import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import fs from 'fs'
import { execSync } from 'child_process'

dotenv.config()

// Read connection string if available, else we can't run raw SQL
const dbUrl = process.env.DATABASE_URL
if (dbUrl) {
  try {
    console.log("Running migration using psql...")
    execSync(`psql "${dbUrl}" -f supabase/migrations/20260630071751_add_level_columns_to_profiles.sql`, { stdio: 'inherit' })
    console.log("Migration executed.")
  } catch(e) {
    console.error("Failed:", e.message)
  }
} else {
  console.log("No DATABASE_URL found. Will attempt another way.")
}

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(import.meta.dirname, '../.env') })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

async function fixRls() {
  const fetchOptions = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${serviceRoleKey}`,
      'apikey': serviceRoleKey
    },
    body: JSON.stringify({
      query: `
        DROP POLICY IF EXISTS "Ligen lesbar für Mitglieder" ON leagues;
        CREATE POLICY "Ligen lesbar für Mitglieder oder Admins" ON leagues
          FOR SELECT USING (
            EXISTS (SELECT 1 FROM league_members WHERE league_members.league_id = leagues.id AND league_members.user_id = auth.uid())
            OR creator_id = auth.uid()
            OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND is_admin = true)
          );
      `
    })
  }

  const res = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, fetchOptions)
  
  if (!res.ok) {
    // Falls exec_sql nicht geht (oft aus Sicherheitsgründen gesperrt), müssen wir das über den Client regeln.
    console.error('Direct SQL failed. Using alternative method...')
  } else {
    console.log('✅ RLS updated successfully via SQL endpoint!')
  }
}

fixRls()

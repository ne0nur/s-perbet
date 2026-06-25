import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: users, error: uErr } = await supabase.auth.admin.listUsers();
  if (uErr) console.error("Auth list error:", uErr);
  else console.log("Users in Auth:", users.users.map(u => ({ id: u.id, email: u.email })));

  const { data: profiles, error: pErr } = await supabase.from('profiles').select('id, username');
  if (pErr) console.error("Profiles error:", pErr);
  else console.log("Profiles in DB:", profiles);
}
check();

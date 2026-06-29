import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data: leagues } = await supabase.from('leagues').select('*');
  console.log('Leagues:', leagues);

  const { data: members } = await supabase.from('league_members').select('*');
  console.log('Members:', members);

  const { data: profiles } = await supabase.from('profiles').select('*');
  console.log('Profiles:', profiles);
}
run();

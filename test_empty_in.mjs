import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const matchIds = [];
  const { data, error } = await supabase.from('tips').select('*').in('match_id', matchIds);
  console.log('Data:', data);
  console.log('Error:', error);
}
run();

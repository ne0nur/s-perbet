import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data, error } = await supabase.rpc('get_policies');
  if (error) {
    // alternative: query pg_policies
    const res = await supabase.from('pg_policies').select('*').eq('tablename', 'chat_nachrichten');
    console.log(res);
  } else {
    console.log(data);
  }
}
run();

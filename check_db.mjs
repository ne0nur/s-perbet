import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data: seasons, error: err1 } = await supabase.from('seasons').select('*').limit(2);
  console.log("Seasons:", seasons, "Error:", err1);
  
  const { data: chat, error: err2 } = await supabase.from('chat_nachrichten').select('*').limit(2);
  console.log("Chat:", chat, "Error:", err2);
  
  const { data: configs } = await supabase.from('tournament_configs').select('*');
  console.log("Configs:", configs);
}
check();

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data, error } = await supabase
    .from('leagues')
    .select('id, name, active_tournaments')
    .eq('id', 'c78450c0-374e-4056-8542-68010a85e12c')
    .single();
  console.log("ZENO league:", data, "Error:", error);
}
run();

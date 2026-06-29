import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseAnon = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  // Login as mausabi
  const { data: authData, error: authError } = await supabaseAnon.auth.signInWithPassword({
    email: 'mausabi@example.com',
    password: 'password123'
  });
  
  if (authError) {
    console.log("Auth Error:", authError);
    return;
  }
  
  console.log("Logged in as mausabi");
  
  // Try to read leagues
  const { data: leagues, error: leaguesErr } = await supabaseAnon.from('leagues').select('*').limit(5);
  console.log("Leagues read:", leagues ? leagues.length : 0, leaguesErr || 'OK');
  
  if (leagues && leagues.length > 0) {
    const leagueId = leagues[0].id;
    console.log("Testing chat for league:", leagueId);
    
    // Read chat
    const { data: chatData, error: chatErr } = await supabaseAnon
      .from('chat_nachrichten')
      .select('*')
      .eq('league_id', leagueId);
      
    console.log("Chat Read:", chatData ? chatData.length : 0, chatErr || 'OK');
    
    // Write chat
    const { data: insertData, error: insertErr } = await supabaseAnon
      .from('chat_nachrichten')
      .insert({
        league_id: leagueId,
        user_id: authData.user.id,
        nachricht: 'test message from script'
      })
      .select();
      
    console.log("Chat Insert:", insertData ? 'Success' : 'Fail', insertErr || 'OK');
  }
}
run();

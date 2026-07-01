const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()
const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const adminClient = createClient(supabaseUrl, supabaseKey)

async function run() {
  const { data: matches } = await adminClient.from('matches').select('id, heim_team, gast_team, spieltag').eq('tournament', 'World Cup 2026').gte('spieltag', 4);
  if (!matches) {
    console.log("No KO matches found.");
    return;
  }
  const matchIds = matches.map(m => m.id);

  const { data: tips } = await adminClient.from('tips').select('id, match_id, created_at, updated_at').in('match_id', matchIds);
  if (!tips) {
    console.log("No tips found.");
    return;
  }

  // 11:35 UTC is 13:35 Local Time (when we pushed the UI fix / Backend fix)
  const fixDate = new Date('2026-07-01T11:35:00.000Z');
  const tipsToDelete = [];

  for (const tip of tips) {
    const match = matches.find(m => m.id === tip.match_id);
    if (!match) continue;
    
    const isPlaceholder = (name) => /winner|loser|tba|tbd|placeholder/i.test(name);
    const teamsStehenFest = !isPlaceholder(match.heim_team) && !isPlaceholder(match.gast_team);
    
    const tipDate = new Date(tip.updated_at || tip.created_at);

    if (!teamsStehenFest || tipDate < fixDate) {
      tipsToDelete.push(tip.id);
    }
  }

  console.log(`Found ${tipsToDelete.length} invalid tips. Deleting...`);
  
  const chunkSize = 100;
  for (let i = 0; i < tipsToDelete.length; i += chunkSize) {
    const chunk = tipsToDelete.slice(i, i + chunkSize);
    const { error } = await adminClient.from('tips').delete().in('id', chunk);
    if (error) console.error("Error deleting:", error);
  }
  console.log("Cleanup complete!");
}
run();

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function run() {
  // 1. Get user ID for mausabi
  const { data: profile } = await supabase.from('profiles').select('id').eq('username', 'mausabi').single()
  if (!profile) {
    console.error("User mausabi not found!");
    return;
  }
  const userId = profile.id;
  console.log(`Found mausabi ID: ${userId}`);

  // 2. Get all matches for World Cup 2026 in spieltag 4 (Sechzehntelfinale)
  const { data: matches } = await supabase.from('matches')
    .select('id, heim_team, gast_team')
    .eq('tournament', 'World Cup 2026')
    .eq('spieltag', 4);
  
  if (!matches || matches.length === 0) {
    console.error("No matches found in spieltag 4!");
    return;
  }
  console.log(`Found ${matches.length} matches in spieltag 4.`);

  // 3. Get existing tips for mausabi in these matches
  const matchIds = matches.map(m => m.id);
  const { data: existingTips } = await supabase.from('tips')
    .select('match_id')
    .eq('user_id', userId)
    .in('match_id', matchIds);

  const tippedMatchIds = new Set((existingTips || []).map(t => t.match_id));
  console.log(`mausabi has already tipped ${tippedMatchIds.size} matches.`);

  // 4. Generate random (non-draw) tips for matches without tips
  const tipsToInsert = [];
  const scorePairs = [
    [1, 0], [2, 1], [0, 1], [1, 2], [2, 0], [0, 2], [3, 1], [1, 3], [3, 2], [2, 3]
  ];

  for (const match of matches) {
    if (!tippedMatchIds.has(match.id)) {
      // Pick a random score pair (non-draw)
      const [h, a] = scorePairs[Math.floor(Math.random() * scorePairs.length)];
      tipsToInsert.push({
        user_id: userId,
        match_id: match.id,
        tipp_heim: h,
        tipp_gast: a,
        punkte: null
      });
    }
  }

  if (tipsToInsert.length === 0) {
    console.log("No new tips to insert.");
    return;
  }

  console.log(`Inserting ${tipsToInsert.length} tips for mausabi...`);
  const { error } = await supabase.from('tips').insert(tipsToInsert);
  if (error) {
    console.error("Error inserting tips:", error);
  } else {
    console.log("Successfully inserted all tips!");
  }
}
run();

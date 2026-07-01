import { createClient } from "npm:@supabase/supabase-js@2.39.0"
import { evaluateAchievements } from "./achievementEvaluator.ts"

// EXP per rarity — MUST stay in sync with AchievementsSection.tsx RARITY_CONFIG
const RARITY_EXP: Record<string, number> = {
  legendary: 500, legendaer: 500,
  epic: 200, episch: 200,
  rare: 200, random: 200,  // "random" mapped to random rarity
  selten: 100,
  common: 50, gewoehnlich: 50,
  local: 50, toxic: 50,
}

// Achievement ID → rarity lookup (compact map, keep in sync with getAchievementsList)
const ACH_RARITY: Record<string, string> = {
  domstadt_don: 'local', brezelfest_kral: 'local', maxi_flaneur: 'local',
  schorle_cay: 'local', technik_museum: 'local', altpoertel_sniper: 'local',
  speyer_boss: 'local',
  vallah_krise: 'toxic', kupon_yirtan: 'toxic', amk_modus: 'toxic',
  ters_koese: 'toxic', hayalet: 'toxic', ugursuz: 'toxic',
  kral_ciplak: 'toxic', finito: 'toxic',
  derby_baba: 'rare', der_alman: 'rare', hadi_lan: 'rare', son_dakika: 'rare',
  cim_bom_bom: 'common', kadikoy_bogazi: 'common', kara_kartal: 'common',
  bize_her_yer_trabzon: 'common', ilk_kan: 'common', hosgeldin_abi: 'common',
  kardesim_benim: 'common',
  gurbetci: 'epic', macher: 'epic', bereket: 'epic',
  sifir_sikinti: 'epic', gegen_den_strom: 'epic',
  kahin: 'legendary', psikopat: 'legendary', kebap_spiess: 'legendary',
}

function getAchievementExp(unlockedIds: Set<string>): number {
  let total = 0
  for (const id of unlockedIds) {
    const rarity = ACH_RARITY[id] || 'common'
    total += RARITY_EXP[rarity] || 50
  }
  return total
}

// Kopie von calculateLevelDetails aus utils.ts für Deno (MUST stay in sync)
function calculateLevelDetails(punkte: number, achievementsCount: number = 0, bonusTippsCount: number = 0, achievementExp?: number) {
  // achievementExp by rarity: gewöhnlich=50, selten=100, episch=200, legendaer=500
  const achExp = achievementExp ?? (achievementsCount * 50)
  const calculatedExp = (Math.max(0, punkte) * 10) + achExp + (bonusTippsCount * 50)
  const totalExp = Math.max(0, calculatedExp)

  let remainingExp = totalExp
  let level = 1
  let xpRequired = 80 + (level * 8) // 88, 96, 104, 112...

  while (remainingExp >= xpRequired) {
    remainingExp -= xpRequired
    level++
    xpRequired = 80 + (level * 8)
  }

  const xpCurrent = remainingExp
  const xpPct = (xpCurrent / xpRequired) * 100

  return {
    level,
    xpCurrent,
    xpRequired,
    xpPct,
    totalExp
  }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // 1. Fetch all profiles
    const { data: profiles, error: pError } = await supabase.from('profiles').select('id, username, avatar_url, gesamt_punkte')
    if (pError) throw pError

    // 2. Fetch all matches (needed for achievement evaluation)
    const { data: matches, error: mError } = await supabase.from('matches').select('*')
    if (mError) throw mError
    const matchMap = new Map()
    matches.forEach((m: any) => matchMap.set(m.id, m))

    // 3. Fetch all tips
    const { data: tips, error: tError } = await supabase.from('tips').select('*')
    if (tError) throw tError
    
    // Group tips by user (include ALL tips, even upcoming — needed for ilk_kan etc.)
    const tipsByUser = new Map()
    tips.forEach((t: any) => {
      if (!tipsByUser.has(t.user_id)) tipsByUser.set(t.user_id, [])
      tipsByUser.get(t.user_id).push({
        ...t,
        match: matchMap.get(t.match_id) || null
      })
    })

    const updates = []

    // 4. Evaluate achievements & level for each user
    for (const profile of profiles) {
      const userTips = tipsByUser.get(profile.id) || []
      
      const unlocked = evaluateAchievements(
        userTips,
        {
          gesamt_punkte: profile.gesamt_punkte || 0,
          exakte_treffer: 0,
          rang: 1,
          is_admin: false,
          league_count: 1
        },
        profile.avatar_url,
        profile.username
      )
      
      const achievementsCount = unlocked.size
      const achievementExp = getAchievementExp(unlocked)
      const bonusTippsCount = 0

      const details = calculateLevelDetails(profile.gesamt_punkte || 0, achievementsCount, bonusTippsCount, achievementExp)

      updates.push({
        id: profile.id,
        achievements_count: achievementsCount,
        level: details.level,
        xp_current: details.xpCurrent,
        xp_required: details.xpRequired,
        total_exp: details.totalExp
      })
    }

    // 5. Bulk update profiles
    for (const u of updates) {
      await supabase.from('profiles').update({
        achievements_count: u.achievements_count,
        level: u.level,
        xp_current: u.xp_current,
        xp_required: u.xp_required,
        total_exp: u.total_exp
      }).eq('id', u.id)
    }

    return new Response(JSON.stringify({ success: true, updated: updates.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})

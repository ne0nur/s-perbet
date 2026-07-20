import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0"

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  )

  const isDryRun = req.method === "GET"

  try {
    // Aktuelle Saison
    const { data: currentSeason } = await supabase
      .from("seasons").select("id, name").eq("is_current", true).single()
    if (!currentSeason) {
      return new Response(JSON.stringify({ error: "Keine aktuelle Saison gefunden" }), { status: 400 })
    }

    // Offene Matches zählen
    const { count: openCount } = await supabase
      .from("matches")
      .select("*", { count: "exact", head: true })
      .neq("status", "finished")
      .eq("season", currentSeason.id)

    // Total Matches
    const { count: totalCount } = await supabase
      .from("matches")
      .select("*", { count: "exact", head: true })
      .eq("season", currentSeason.id)

    // Profil-Stats
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, gesamt_punkte, achievements_count, exakte_treffer, level")

    const userCount = profiles?.length ?? 0
    const totalPoints = profiles?.reduce((s, p) => s + (p.gesamt_punkte || 0), 0) ?? 0
    const totalAchievements = profiles?.reduce((s, p) => s + (p.achievements_count || 0), 0) ?? 0

    const canRollover = (openCount ?? 0) === 0 && (totalCount ?? 0) > 0

    // Nur Status zurück (GET = dry run)
    if (isDryRun) {
      return new Response(JSON.stringify({
        canRollover,
        season: currentSeason,
        stats: {
          totalMatches: totalCount ?? 0,
          openMatches: openCount ?? 0,
          users: userCount,
          totalPoints,
          totalAchievements,
        },
      }))
    }

    // POST = Rollover ausführen
    if (!canRollover) {
      return new Response(JSON.stringify({
        error: `Noch ${openCount} Matches nicht beendet`,
        canRollover: false,
        openMatches: openCount ?? 0,
      }), { status: 400 })
    }

    const { error: rpcError } = await supabase.rpc("saison_rollover")
    if (rpcError) throw rpcError

    const { data: newSeason } = await supabase
      .from("seasons").select("id, name").eq("is_current", true).single()

    return new Response(JSON.stringify({
      ok: true,
      canRollover: true,
      archived: {
        users: userCount,
        totalPoints,
        totalAchievements,
      },
      previousSeason: currentSeason.id,
      newSeason: newSeason ?? null,
    }))
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 })
  }
})

import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import postgres from "https://deno.land/x/postgresjs@v3.4.4/mod.js"

serve(async (req) => {
  try {
    const url = Deno.env.get("SUPABASE_URL") || ""
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
    const projectRef = url.replace("https://", "").split(".")[0]

    // Session pooler with service_role key
    const sql = postgres(`postgresql://postgres.${projectRef}:${serviceKey}@${projectRef}.pooler.supabase.com:5432/postgres`, {
      max: 1,
      ssl: { rejectUnauthorized: false },
    })

    // Apply migration
    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS profile_seasons (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
        season INTEGER REFERENCES seasons(id) NOT NULL,
        gesamt_punkte INTEGER DEFAULT 0,
        achievements_count INTEGER DEFAULT 0,
        exakte_treffer INTEGER DEFAULT 0,
        level INTEGER DEFAULT 1,
        created_at TIMESTAMPTZ DEFAULT now(),
        UNIQUE(user_id, season)
      );

      ALTER TABLE league_members ADD COLUMN IF NOT EXISTS season INTEGER REFERENCES seasons(id);
      UPDATE league_members SET season = (SELECT id FROM seasons WHERE is_current = true LIMIT 1) WHERE season IS NULL;
      ALTER TABLE league_members ALTER COLUMN season SET NOT NULL;
    `)

    await sql.end()
    return new Response(JSON.stringify({ ok: true }))
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 })
  }
})

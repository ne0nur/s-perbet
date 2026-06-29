// supabase/functions/sync-match-results/index.ts
// Edge Function: Aktualisiert Ergebnisse für alle Turniere
// Nur vom Admin aufrufbar. Deploy: supabase functions deploy sync-match-results

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;

interface MatchRow {
  id: string;
  heim_team: string;
  gast_team: string;
  tore_heim: number | null;
  tore_gast: number | null;
  status: string;
  anpfiff: string;
  spieltag: number;
  tournament: string;
  season: number;
}

serve(async (req: Request) => {
  const startTime = Date.now();
  const results: string[] = [];

  try {
    // --- Auth Check ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No auth header" }), { status: 401 });
    }

    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const { data: profile } = await userClient
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();
    if (!profile?.is_admin) {
      return new Response(JSON.stringify({ error: "Admin only" }), { status: 403 });
    }

    // --- Admin-Client mit Service Role (bypass RLS) ---
    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const now = new Date();

    // 1. Alle nicht-finalen Matches laden
    const { data: matches, error: fetchError } = await adminClient
      .from("matches")
      .select("*")
      .not("status", "in", '("finished","postponed")')
      .order("anpfiff", { ascending: true });

    if (fetchError) {
      return new Response(JSON.stringify({ error: fetchError.message }), { status: 500 });
    }

    if (!matches || matches.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: "Alle Spiele sind bereits abgeschlossen oder verschoben.",
        updated: 0,
        duration_ms: Date.now() - startTime,
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    }

    const matchList = matches as MatchRow[];
    let updatedCount = 0;
    const tournamentStats: Record<string, { checked: number; updated: number }> = {};

    // 2. Für jedes Match prüfen, ob ein Update nötig ist
    for (const match of matchList) {
      const kickoff = new Date(match.anpfiff);
      const hoursSinceKickoff = (now.getTime() - kickoff.getTime()) / (1000 * 60 * 60);

      // Initialisiere Turnier-Statistik
      const tourney = match.tournament || "Unbekannt";
      if (!tournamentStats[tourney]) {
        tournamentStats[tourney] = { checked: 0, updated: 0 };
      }
      tournamentStats[tourney].checked++;

      let newStatus = match.status;
      let needsUpdate = false;

      // --- Smart Time-based Transitions ---
      // upcoming → live: Anpfiff erreicht oder überschritten
      if (match.status === "upcoming" && hoursSinceKickoff >= -0.25) {
        newStatus = "live";
        needsUpdate = true;
        results.push(`🟢 ${match.heim_team} vs ${match.gast_team} → LIVE (Spieltag ${match.spieltag})`);
      }

      // live → finished: Mehr als 2.5h nach Anpfiff
      if (match.status === "live" && hoursSinceKickoff > 2.5) {
        newStatus = "finished";
        needsUpdate = true;
        results.push(`🏁 ${match.heim_team} vs ${match.gast_team} → BEENDET (Spieltag ${match.spieltag})`);
      }

      // upcoming → finished: Mehr als 3h nach Anpfiff, wurde nie auf live gesetzt
      if (match.status === "upcoming" && hoursSinceKickoff > 3) {
        newStatus = "finished";
        needsUpdate = true;
        results.push(`⏭️ ${match.heim_team} vs ${match.gast_team} → ÜBERSPRUNGEN (Spieltag ${match.spieltag})`);
      }

      if (needsUpdate) {
        const updatePayload: Record<string, unknown> = { status: newStatus };
        
        // Wenn Ergebnisse in der DB fehlen UND das Spiel finished ist,
        // setze Dummy-Ergebnisse damit der Trigger feuert? NEIN — das wäre Datenmüll.
        // Der Admin muss Ergebnisse manuell eintragen oder eine echte API liefert sie.
        // Wir markieren nur den Status, Trigger feuert nur wenn tore_heim/tore_gast existieren.

        const { error: updateError } = await adminClient
          .from("matches")
          .update(updatePayload)
          .eq("id", match.id);

        if (!updateError) {
          updatedCount++;
          tournamentStats[tourney].updated++;
        } else {
          results.push(`❌ Fehler bei ${match.heim_team} vs ${match.gast_team}: ${updateError.message}`);
        }
      }
    }

    const summary = tournamentStats;

    return new Response(JSON.stringify({
      success: true,
      message: `${updatedCount} von ${matchList.length} Spielen aktualisiert`,
      updated: updatedCount,
      checked: matchList.length,
      tournaments: summary,
      details: results,
      duration_ms: Date.now() - startTime,
    }), { status: 200, headers: { "Content-Type": "application/json" } });

  } catch (err) {
    return new Response(JSON.stringify({
      error: String(err),
      duration_ms: Date.now() - startTime,
    }), { status: 500 });
  }
});

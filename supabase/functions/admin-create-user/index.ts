// supabase/functions/admin-create-user/index.ts
// Edge Function: Creates users via GoTrue Admin API (proper Auth)
// Deploy: supabase functions deploy admin-create-user

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;

serve(async (req: Request) => {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No auth header" }), { status: 401 });
    }

    // Verify the caller is an admin
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    // Check admin status
    const { data: profile } = await userClient
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();
    if (!profile?.is_admin) {
      return new Response(JSON.stringify({ error: "Admin only" }), { status: 403 });
    }

    const { username, password, league_id } = await req.json();
    if (!username || !password) {
      return new Response(JSON.stringify({ error: "username and password required" }), { status: 400 });
    }

    // Use service_role to create user via GoTrue Admin API
    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email: `${username}@tipp.local`,
      password: password,
      email_confirm: true,
      user_metadata: { username },
      app_metadata: { provider: "email", providers: ["email"] },
    });

    if (createError) {
      return new Response(JSON.stringify({ error: createError.message }), { status: 400 });
    }

    // Update profile
    await adminClient
      .from("profiles")
      .update({ username, muss_passwort_aendern: true })
      .eq("id", newUser.user.id);

    // Optionally add to league
    if (league_id) {
      await adminClient
        .from("league_members")
        .insert({ league_id, user_id: newUser.user.id });
    }

    return new Response(JSON.stringify({
      success: true,
      user_id: newUser.user.id,
      username,
    }), { status: 200, headers: { "Content-Type": "application/json" } });

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});

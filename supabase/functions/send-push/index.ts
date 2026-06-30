import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import webpush from "https://esm.sh/web-push@3.6.7"
import { createClient } from 'jsr:@supabase/supabase-js@2'

// Setup Web Push with VAPID keys
webpush.setVapidDetails(
  Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@superbet.com',
  Deno.env.get('VAPID_PUBLIC_KEY') || '',
  Deno.env.get('VAPID_PRIVATE_KEY') || ''
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { userIds, title, body, url, broadcast } = await req.json()

    if (!broadcast && (!userIds || !Array.isArray(userIds) || userIds.length === 0)) {
      return new Response(JSON.stringify({ error: 'userIds array is required unless broadcast is true' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Fetch subscriptions for all specified users or broadcast to all
    let query = supabaseClient.from('push_subscriptions').select('*')
    if (!broadcast) {
      query = query.in('user_id', userIds)
    }

    const { data: subscriptions, error } = await query

    if (error) {
      throw error
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ message: 'No subscriptions found for these users' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const payload = JSON.stringify({
      title: title || 'SuperBET',
      body: body || 'Eine neue Benachrichtigung.',
      url: url || '/'
    })

    const results = []

    for (const sub of subscriptions) {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth
        }
      }

      try {
        await webpush.sendNotification(pushSubscription, payload)
        results.push({ user_id: sub.user_id, status: 'success' })
      } catch (err) {
        console.error(`Error sending to subscription ${sub.id}:`, err)
        results.push({ user_id: sub.user_id, status: 'error', error: err.message })
        
        // If the subscription is no longer valid (e.g. 410 Gone), we should delete it
        if (err.statusCode === 410 || err.statusCode === 404) {
          await supabaseClient.from('push_subscriptions').delete().eq('id', sub.id)
        }
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Push Notification Error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

import { useState, useEffect } from 'react'
import { Bell, BellOff, BellRing } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import { useToastStore } from '../../stores/toastStore'

export function PushSubscriptionManager() {
  const { user } = useAuthStore()
  const { toast } = useToastStore()
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isSupported, setIsSupported] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true)
      checkSubscription()
    }
  }, [])

  const checkSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      setIsSubscribed(!!subscription)
    } catch (err) {
      console.error('Error checking push subscription:', err)
    }
  }

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4)
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/')

    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray
  }

  const subscribe = async () => {
    if (!user) return
    setLoading(true)

    try {
      // Check permission
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        toast('Berechtigung verweigert', 'error')
        setLoading(false)
        return
      }

      const registration = await navigator.serviceWorker.ready
      
      const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY
      const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey)

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey
      })

      const subJSON = subscription.toJSON()
      
      // Save to Supabase
      const { error } = await supabase.from('push_subscriptions').upsert({
        user_id: user.id,
        endpoint: subJSON.endpoint,
        p256dh: subJSON.keys?.p256dh,
        auth: subJSON.keys?.auth
      }, { onConflict: 'user_id, endpoint' })

      if (error) throw error

      setIsSubscribed(true)
      toast('Benachrichtigungen aktiviert!', 'success')
      
      // Test push
      await supabase.functions.invoke('send-push', {
        body: {
          userIds: [user.id],
          title: 'SuperBET',
          body: 'Benachrichtigungen funktionieren einwandfrei! 🏆'
        }
      })

    } catch (err: any) {
      console.error('Subscription error:', err)
      toast('Fehler beim Aktivieren der Benachrichtigungen', 'error')
    } finally {
      setLoading(false)
    }
  }

  const unsubscribe = async () => {
    if (!user) return
    setLoading(true)
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      
      if (subscription) {
        await subscription.unsubscribe()
        // Remove from Supabase
        await supabase.from('push_subscriptions')
          .delete()
          .eq('endpoint', subscription.endpoint)
          .eq('user_id', user.id)
      }
      setIsSubscribed(false)
      toast('Benachrichtigungen deaktiviert', 'success')
    } catch (err) {
      console.error('Unsubscribe error:', err)
      toast('Fehler beim Deaktivieren', 'error')
    } finally {
      setLoading(false)
    }
  }

  if (!isSupported) return null

  return (
    <div className="bg-surface-container border border-surface-container-high rounded-xl p-4 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${isSubscribed ? 'bg-primary-container text-on-primary-container' : 'bg-surface-container-highest text-on-surface-variant'}`}>
          {isSubscribed ? <BellRing size={20} /> : <BellOff size={20} />}
        </div>
        <div>
          <h3 className="text-sm font-bold text-on-surface">Push-Benachrichtigungen</h3>
          <p className="text-[11px] text-on-surface-variant max-w-[200px] leading-snug mt-0.5">
            {isSubscribed 
              ? 'Du wirst benachrichtigt, wenn Spiele starten.' 
              : 'Aktiviere Push, um keine Anpfiffe zu verpassen!'}
          </p>
        </div>
      </div>
      
      <button 
        onClick={isSubscribed ? unsubscribe : subscribe}
        disabled={loading}
        className={`px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-colors disabled:opacity-50
          ${isSubscribed 
            ? 'text-red-400 bg-red-400/10 hover:bg-red-400/20' 
            : 'bg-primary text-on-primary shadow shadow-primary/20 hover:opacity-90'}`}
      >
        {loading ? '...' : isSubscribed ? 'Aus' : 'Ein'}
      </button>
    </div>
  )
}

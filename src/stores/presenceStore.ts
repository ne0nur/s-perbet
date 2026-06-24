import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { useAuthStore } from './authStore'
import { RealtimeChannel } from '@supabase/supabase-js'

export interface OnlineUser {
  id: string
  username: string
  avatar_url: string | null
  onlineAt: string
}

interface PresenceState {
  onlineUsers: Record<string, OnlineUser>
  channel: RealtimeChannel | null
  isInitializing: boolean
  initPresence: () => void
  cleanupPresence: () => void
}

export const usePresenceStore = create<PresenceState>((set, get) => ({
  onlineUsers: {},
  channel: null,
  isInitializing: false,
  initPresence: () => {
    const state = get()
    if (state.channel || state.isInitializing) return // Already initialized or in progress

    const user = useAuthStore.getState().user
    if (!user) return

    set({ isInitializing: true })

    // Fetch the current user profile to broadcast it
    const init = async () => {
      try {
        const { data } = await supabase.from('profiles').select('username, avatar_url').eq('id', user.id).single()
        if (!get().isInitializing) return // Cleanup was called during fetch

        // Clean up any lingering channel from React StrictMode
        const existing = supabase.getChannels().find(c => c.topic === 'realtime:online-users')
        if (existing) {
          supabase.removeChannel(existing)
        }

        const username = data?.username || 'Unbekannt'
        const avatar_url = data?.avatar_url || null

        const channel = supabase.channel('online-users')

        channel
          .on('presence', { event: 'sync' }, () => {
            const presenceState = channel.presenceState()
            const users: Record<string, OnlineUser> = {}
            
            for (const id in presenceState) {
              // Take the first presence instance for each user
              const presence = presenceState[id][0] as unknown as {
                user_id: string
                username: string
                avatar_url: string | null
                onlineAt: string
              }
              users[presence.user_id] = {
                id: presence.user_id,
                username: presence.username,
                avatar_url: presence.avatar_url,
                onlineAt: presence.onlineAt
              }
            }
            set({ onlineUsers: users })
          })
          .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
              await channel.track({
                user_id: user.id,
                username,
                avatar_url,
                onlineAt: new Date().toISOString()
              })
            }
          })

        set({ channel, isInitializing: false })
      } catch (err) {
        console.error('Failed to init presence:', err)
        set({ isInitializing: false })
      }
    }
    init()
  },
  cleanupPresence: () => {
    set({ isInitializing: false })
    const { channel } = get()
    if (channel) {
      supabase.removeChannel(channel)
      set({ channel: null, onlineUsers: {} })
    }
  }
}))

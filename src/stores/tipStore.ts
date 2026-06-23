import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import type { Tip } from './matchStore'

interface TipState {
  meineTipps: Tip[]
  isLaden: boolean
  fehler: string | null
  cacheTipps: Record<number, Tip[]>
  cacheTimestamps: Record<number, number>
  ladeMeineTipps: (spieltag?: number, forceRefresh?: boolean) => Promise<void>
  tippSpeichern: (matchId: string, tippHeim: number, tippGast: number, spieltag?: number) => Promise<void>
  getTippFuerMatch: (matchId: string) => Tip | undefined
  getTippsFuerMatch: (matchId: string) => Promise<Tip[]>
}

import { persist } from 'zustand/middleware'

export const useTipStore = create<TipState>()(
  persist(
    (set, get) => ({
      meineTipps: [],
      isLaden: false,
      fehler: null,
      cacheTipps: {},
      cacheTimestamps: {},

      ladeMeineTipps: async (spieltag?: number, forceRefresh?: boolean) => {
        const now = Date.now()
        const cached = spieltag ? get().cacheTipps[spieltag] : undefined
        const timestamp = spieltag ? (get().cacheTimestamps[spieltag] || 0) : 0

        if (spieltag && !forceRefresh && cached && cached.length > 0) {
          const isFresh = (now - timestamp) < 60000 // 60 Sekunden
          if (isFresh) {
            set({ meineTipps: cached, isLaden: false })
            return
          }
          // Stale-While-Revalidate: Cached Tipps sofort anzeigen, aber im Hintergrund abfragen
          set({ meineTipps: cached, isLaden: false })
        } else if (!cached || forceRefresh) {
          set({ isLaden: true })
        }

        try {
          let query = supabase.from('tips').select('*, profile:profiles(username, avatar_url)')

          if (spieltag) {
            query = supabase
              .from('tips')
              .select('*, matches!inner(spieltag), profile:profiles(username, avatar_url)')
              .eq('matches.spieltag', spieltag)
          }

          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            query = query.eq('user_id', user.id)
          }

          const { data, error } = await query.order('created_at', { ascending: false })

          if (!error && data) {
            const fetchedTips = data as Tip[]
            const currentNow = Date.now()
            set((s) => {
              const nextCache = spieltag ? { ...s.cacheTipps, [spieltag]: fetchedTips } : s.cacheTipps
              const nextTimestamps = spieltag ? { ...s.cacheTimestamps, [spieltag]: currentNow } : s.cacheTimestamps
              return {
                meineTipps: fetchedTips,
                cacheTipps: nextCache,
                cacheTimestamps: nextTimestamps
              }
            })
          } else if (error) {
            console.error('Fehler beim Laden der eigenen Tipps:', error)
          }
        } catch (error) {
          console.error('Unerwarteter Fehler beim Laden der Tipps:', error)
        } finally {
          set({ isLaden: false })
        }
      },

      tippSpeichern: async (matchId: string, tippHeim: number, tippGast: number, spieltag?: number) => {
        set({ fehler: null })
        try {
          const { data: { user } } = await supabase.auth.getUser()
          if (!user) {
            const errorMsg = 'Nicht eingeloggt'
            set({ fehler: errorMsg })
            throw new Error(errorMsg)
          }

          // Strict Client-Side Validation
          if (typeof tippHeim !== 'number' || typeof tippGast !== 'number' || isNaN(tippHeim) || isNaN(tippGast)) {
            const errorMsg = 'Ungültige Tore'
            set({ fehler: errorMsg })
            throw new Error(errorMsg)
          }
          if (tippHeim < 0 || tippGast < 0 || !Number.isInteger(tippHeim) || !Number.isInteger(tippGast)) {
            const errorMsg = 'Tore müssen positive ganze Zahlen sein'
            set({ fehler: errorMsg })
            throw new Error(errorMsg)
          }

          const existing = get().meineTipps.find(t => t.match_id === matchId)

          if (existing) {
            const { error } = await supabase
              .from('tips')
              .update({ tipp_heim: tippHeim, tipp_gast: tippGast, updated_at: new Date().toISOString() })
              .eq('id', existing.id)

            if (error) {
              set({ fehler: error.message })
              throw error
            }
          } else {
            const { error } = await supabase
              .from('tips')
              .insert({
                user_id: user.id,
                match_id: matchId,
                tipp_heim: tippHeim,
                tipp_gast: tippGast,
              })

            if (error) {
              set({ fehler: error.message })
              throw error
            }
          }

          await get().ladeMeineTipps(spieltag, true)
        } catch (error) {
          console.error('Fehler beim Speichern des Tipps:', error)
          const msg = (error as Error | null)?.message || 'Unerwarteter Fehler beim Speichern'
          set({ fehler: msg })
          throw error
        }
      },

      getTippFuerMatch: (matchId: string) => {
        return get().meineTipps.find(t => t.match_id === matchId)
      },

      getTippsFuerMatch: async (matchId: string) => {
        const { data, error } = await supabase
          .from('tips')
          .select('*, profile:profiles(username, avatar_url)')
          .eq('match_id', matchId)
          .order('created_at', { ascending: true })

        if (error) {
          console.error('Fehler beim Laden der Tipps:', error)
          return []
        }
        return (data as Tip[]) || []
      },
    }),
    {
      name: 'tip-store-cache',
      partialize: (state) => ({
        meineTipps: state.meineTipps,
        cacheTipps: state.cacheTipps,
        cacheTimestamps: state.cacheTimestamps,
      }),
    }
  )
)

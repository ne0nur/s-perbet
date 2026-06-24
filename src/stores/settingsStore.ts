import { create } from 'zustand'
import { supabase } from '../lib/supabase'

interface SettingsState {
  tippsFreigeschaltet: boolean
  isLaden: boolean
  ladeSettings: () => Promise<void>
  setTippsFreigeschaltet: (wert: boolean) => Promise<void>
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  tippsFreigeschaltet: false,
  isLaden: true,

  ladeSettings: async () => {
    try {
      const { data } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'tipps_freigeschaltet')
        .single()

      set({
        tippsFreigeschaltet: data?.value === 'true',
        isLaden: false,
      })
    } catch {
      // Fallback: verwende config.ts Wert
      try {
        const { TIPPS_FREIGESCHALTET } = await import('../config')
        set({ tippsFreigeschaltet: TIPPS_FREIGESCHALTET, isLaden: false })
      } catch {
        set({ isLaden: false })
      }
    }
  },

  setTippsFreigeschaltet: async (wert: boolean) => {
    // Optimistisches UI-Update
    set({ tippsFreigeschaltet: wert })

    const { error } = await supabase
      .from('app_settings')
      .upsert({ key: 'tipps_freigeschaltet', value: wert ? 'true' : 'false' })

    if (error) {
      // Rollback bei Fehler
      set({ tippsFreigeschaltet: !wert })
      console.error('Fehler beim Setzen der Tipp-Freigabe:', error)
    }
  },
}))

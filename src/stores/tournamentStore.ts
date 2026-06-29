import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export interface TournamentConfig {
  id: number
  name: string
  emoji: string
  season: number
  has_table: boolean
  has_knockout: boolean
  group_stage_matchdays: number
  cl_spots: number
  cl_playoff_spots: number
  el_spots: number
  conf_spots: number
  relegation_playoff_count: number
  relegation_count: number
  ko_direct_spots: number
  ko_playoff_spots: number
  has_historical_data: boolean
}

interface TournamentState {
  tournaments: TournamentConfig[]
  isLaden: boolean
  ladeTournaments: () => Promise<void>
  getTournament: (name: string) => TournamentConfig | undefined
  detectActiveTournaments: () => TournamentConfig[]
}

const FALLBACK_TOURNAMENTS: TournamentConfig[] = [
  {
    id: 0, name: 'Süper Lig', emoji: '🇹🇷', season: 2026,
    has_table: true, has_knockout: false, group_stage_matchdays: 100,
    cl_spots: 1, cl_playoff_spots: 1, el_spots: 1, conf_spots: 1,
    relegation_playoff_count: 1, relegation_count: 3,
    ko_direct_spots: 0, ko_playoff_spots: 0, has_historical_data: true,
  },
  {
    id: 1, name: 'Champions League', emoji: '⭐', season: 2026,
    has_table: true, has_knockout: true, group_stage_matchdays: 8,
    cl_spots: 0, cl_playoff_spots: 0, el_spots: 0, conf_spots: 0,
    relegation_playoff_count: 0, relegation_count: 0,
    ko_direct_spots: 8, ko_playoff_spots: 16, has_historical_data: false,
  },
]

export const useTournamentStore = create<TournamentState>((set, get) => ({
  tournaments: [],
  isLaden: false,

  ladeTournaments: async () => {
    if (get().tournaments.length > 0) return // Schon geladen
    set({ isLaden: true })
    
    try {
      const { data, error } = await supabase
        .from('tournament_configs')
        .select('*')
        .order('name')

      if (!error && data && data.length > 0) {
        set({ tournaments: data as TournamentConfig[], isLaden: false })
        return
      }
    } catch (e) {
      console.warn('tournament_configs nicht erreichbar, nutze Fallbacks', e)
    }

    // Fallback: Hardcoded defaults wenn DB leer/unerreichbar
    set({ tournaments: FALLBACK_TOURNAMENTS, isLaden: false })
  },

  getTournament: (name: string) => get().tournaments.find(t => t.name === name),

  detectActiveTournaments: () => {
    // Gibt Turniere zurück, die in der aktuellen Season Matches haben
    // (wird später durch DB-Query ersetzt, aktuell alle)
    return get().tournaments
  },
}))

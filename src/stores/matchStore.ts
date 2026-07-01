import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { RealtimeChannel } from '@supabase/supabase-js'

// Typen
export interface Match {
  id: string
  spieltag: number
  heim_team: string
  gast_team: string
  anpfiff: string
  tore_heim: number | null
  tore_gast: number | null
  status: 'upcoming' | 'live' | 'finished' | 'postponed'
  season: number
  tournament?: string
}

export interface Tip {
  id: string
  user_id: string
  match_id: string
  tipp_heim: number
  tipp_gast: number
  punkte: number
  profile?: { username: string; avatar_url: string | null }
}

interface MatchState {
  matches: Match[]
  aktuellerSpieltag: number
  aktuelleSaison: number | null
  selectedTournament: string
  aktivePhase: number | null
  isLaden: boolean
  cacheMatches: Record<number, Match[]>
  cacheTimestamps: Record<number, number>
  letztesUpdate: string | null
  subscription: RealtimeChannel | null
  heartbeatSub: RealtimeChannel | null
  ladeMatches: (spieltag: number) => Promise<void>
  setSpieltag: (spieltag: number) => void
  setSaison: (saison: number) => void
  setSelectedTournament: (name: string) => Promise<void>
  smartSelectSpieltag: (tournament: string) => Promise<number>
  getMatchesBySpieltag: (spieltag: number) => Match[]
  getLiveMatches: () => Match[]
  initialisiereSpieltag: () => Promise<number>
  abonnierenRealtimeMatches: () => void
  abonnierenHeartbeat: () => void
  recalculateAktivePhase: () => Promise<void>
  cleanup: () => void
}

import { persist } from 'zustand/middleware'

export const useMatchStore = create<MatchState>()(
  persist(
    (set, get) => ({
      matches: [],
      aktuellerSpieltag: 1, // Default fallback
      aktuelleSaison: null,
      selectedTournament: 'Süper Lig',
      aktivePhase: null,
      isLaden: false,
      cacheMatches: {},
      cacheTimestamps: {},
      letztesUpdate: null,
      subscription: null,
      heartbeatSub: null,

      ladeMatches: async (spieltag: number) => {
        const state = get()
        const cached = state.cacheMatches[spieltag]

        if (cached && cached.length > 0) {
          // Zeige Cache sofort an
          set({ matches: cached, isLaden: false })
          // Führe trotzdem einen Hintergrund-Fetch aus (Stale-While-Revalidate)
        } else {
          // Keine Daten vorhanden: Ladespinner anzeigen
          set({ isLaden: true })
        }

        // Führe active phase check aus
        get().recalculateAktivePhase()

        try {
          let currentSeason = state.aktuelleSaison
          if (!currentSeason) {
            const { data: seasonData } = await supabase.from('seasons').select('id').eq('is_current', true).limit(1)
            if (seasonData && seasonData.length > 0) {
              currentSeason = seasonData[0].id
              set({ aktuelleSaison: currentSeason })
            }
          }

          let query = supabase
            .from('matches')
            .select('*')
            .order('anpfiff', { ascending: true })

          // spieltag === 0 means load ALL matchdays (all tournaments)
          if (spieltag > 0) {
            query = query.eq('spieltag', spieltag)
          }
            
          if (currentSeason) {
            query = query.eq('season', currentSeason)
          }

          // Tournament filter: when a specific tournament is selected (and not "ALLE"),
          // only load matches for that tournament
          const tourney = state.selectedTournament
          if (tourney && spieltag > 0) {
            query = query.eq('tournament', tourney)
          }

          const { data, error } = await query

          if (!error && data) {
            const fetchedMatches = data as Match[]
            const currentNow = Date.now()
            
            // Nur updaten, wenn der User nicht schon den Tab gewechselt hat
            if (get().aktuellerSpieltag === spieltag) {
              set((s) => ({
                matches: fetchedMatches,
                cacheMatches: { ...s.cacheMatches, [spieltag]: fetchedMatches },
                cacheTimestamps: { ...s.cacheTimestamps, [spieltag]: currentNow }
              }))
            } else {
              // Nur im Cache speichern, UI in Ruhe lassen
              set((s) => ({
                cacheMatches: { ...s.cacheMatches, [spieltag]: fetchedMatches },
                cacheTimestamps: { ...s.cacheTimestamps, [spieltag]: currentNow }
              }))
            }
          } else if (error) {
            console.error('Fehler beim Laden der Matches:', error)
          }
        } catch (error) {
          console.error('Unerwarteter Fehler beim Laden der Matches:', error)
        } finally {
          set({ isLaden: false })
        }
      },

      setSpieltag: (spieltag: number) => {
        set({ aktuellerSpieltag: spieltag })
      },

      setSaison: (saison: number) => {
        set({ aktuelleSaison: saison, cacheMatches: {}, cacheTimestamps: {}, matches: [] })
        const currentSpieltag = get().aktuellerSpieltag
        get().ladeMatches(currentSpieltag)
      },

      smartSelectSpieltag: async (tournament: string) => {
        const season = get().aktuelleSaison

        // 1. Live-Spiel in diesem Turnier?
        let liveQuery = supabase.from('matches').select('spieltag')
          .eq('status', 'live').eq('tournament', tournament).limit(1)
        if (season) liveQuery = liveQuery.eq('season', season)
        const { data: liveData } = await liveQuery
        if (liveData?.length) {
          set({ aktuellerSpieltag: liveData[0].spieltag, aktivePhase: liveData[0].spieltag })
          await get().recalculateAktivePhase()
          return liveData[0].spieltag
        }

        // 2. Nächstes upcoming-Spiel?
        let upcomingQuery = supabase.from('matches').select('spieltag')
          .eq('status', 'upcoming').eq('tournament', tournament)
          .order('anpfiff', { ascending: true }).limit(1)
        if (season) upcomingQuery = upcomingQuery.eq('season', season)
        const { data: upcomingData } = await upcomingQuery
        if (upcomingData?.length) {
          set({ aktuellerSpieltag: upcomingData[0].spieltag, aktivePhase: upcomingData[0].spieltag })
          await get().recalculateAktivePhase()
          return upcomingData[0].spieltag
        }

        // 3. Höchster existierender Spieltag im Turnier
        let maxQuery = supabase.from('matches').select('spieltag')
          .eq('tournament', tournament)
          .order('spieltag', { ascending: false }).limit(1)
        if (season) maxQuery = maxQuery.eq('season', season)
        const { data: maxData } = await maxQuery
        if (maxData?.length) {
          set({ aktuellerSpieltag: maxData[0].spieltag, aktivePhase: null })
          return maxData[0].spieltag
        }

        // 4. Fallback
        set({ aktuellerSpieltag: 1 })
        return 1
      },

      setSelectedTournament: async (name: string) => {
        set({ selectedTournament: name })
        const st = await get().smartSelectSpieltag(name)
        await get().ladeMatches(st)
      },

      getMatchesBySpieltag: (spieltag: number) => {
        return get().matches.filter(m => m.spieltag === spieltag)
      },

      getLiveMatches: () => {
        return get().matches.filter(m => m.status === 'live')
      },

      initialisiereSpieltag: async () => {
        try {
          // 0. Aktuelle Saison holen
          let currentSeason = get().aktuelleSaison
          if (!currentSeason) {
            const { data: sData } = await supabase.from('seasons').select('id').eq('is_current', true).limit(1)
            if (sData && sData.length > 0) {
              currentSeason = sData[0].id
              set({ aktuelleSaison: currentSeason })
            }
          }

          // 1. Gibt es ein Live-Spiel in der aktuellen Saison?
          let liveQuery = supabase.from('matches').select('spieltag, tournament').eq('status', 'live').limit(1)
          if (currentSeason) liveQuery = liveQuery.eq('season', currentSeason)
          const { data: liveData } = await liveQuery

          if (liveData && liveData.length > 0) {
            const st = liveData[0].spieltag
            set({ aktuellerSpieltag: st, selectedTournament: liveData[0].tournament, aktivePhase: st })
            await get().recalculateAktivePhase()
            return st
          }

          // 2. Gibt es ein upcoming-Spiel?
          let upcomingQuery = supabase.from('matches').select('spieltag, tournament').eq('status', 'upcoming').order('anpfiff', { ascending: true }).limit(1)
          if (currentSeason) upcomingQuery = upcomingQuery.eq('season', currentSeason)
          const { data: upcomingData } = await upcomingQuery

          if (upcomingData && upcomingData.length > 0) {
            const st = upcomingData[0].spieltag
            set({ aktuellerSpieltag: st, selectedTournament: upcomingData[0].tournament, aktivePhase: st })
            await get().recalculateAktivePhase()
            return st
          }

          // 3. Gibt es ein Spiel in der Zukunft?
          let futureQuery = supabase.from('matches').select('spieltag, tournament').gt('anpfiff', new Date().toISOString()).order('anpfiff', { ascending: true }).limit(1)
          if (currentSeason) futureQuery = futureQuery.eq('season', currentSeason)
          const { data: futureData } = await futureQuery

          if (futureData && futureData.length > 0) {
            const st = futureData[0].spieltag
            set({ aktuellerSpieltag: st, selectedTournament: futureData[0].tournament, aktivePhase: st })
            await get().recalculateAktivePhase()
            return st
          }

          // 4. Höchsten Spieltag (letzten) nehmen, falls alles vorbei ist
          let lastQuery = supabase.from('matches').select('spieltag, tournament').order('spieltag', { ascending: false }).limit(1)
          if (currentSeason) lastQuery = lastQuery.eq('season', currentSeason)
          const { data: lastData } = await lastQuery

          if (lastData && lastData.length > 0) {
            const st = lastData[0].spieltag
            set({ aktuellerSpieltag: st, selectedTournament: lastData[0].tournament })
            return st
          }

          set({ aktuellerSpieltag: 1 })
          return 1
        } catch (error) {
          console.error('Fehler bei der Spieltag-Initialisierung:', error)
          set({ aktuellerSpieltag: 1 })
          return 1
        }
      },

      abonnierenRealtimeMatches: () => {
        if (get().subscription) return // Bereits abonniert

        const sub = supabase
          .channel('realtime-matches')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'matches' },
            (payload) => {
              const updated = payload.new as Match
              if (!updated || !updated.id) return

              // Recalculate active phase reactively when match details change
              get().recalculateAktivePhase()

              set((state) => {
                let currentMatches = [...state.matches]
                const exists = currentMatches.some(m => m.id === updated.id)
                
                if (exists) {
                  currentMatches = currentMatches.map(m => m.id === updated.id ? { ...m, ...updated } : m)
                } else if (updated.spieltag === state.aktuellerSpieltag && updated.season === state.aktuelleSaison) {
                  // Bei INSERT: hinzufügen und sortieren, falls es zur aktuellen View passt
                  currentMatches.push(updated)
                  currentMatches.sort((a, b) => new Date(a.anpfiff).getTime() - new Date(b.anpfiff).getTime())
                }

                const st = updated.spieltag
                const cached = state.cacheMatches[st] || []
                let updatedCache = [...cached]
                if (cached.some(m => m.id === updated.id)) {
                  updatedCache = cached.map(m => m.id === updated.id ? { ...m, ...updated } : m)
                } else if (updated.season === state.aktuelleSaison) {
                  updatedCache.push(updated)
                  updatedCache.sort((a, b) => new Date(a.anpfiff).getTime() - new Date(b.anpfiff).getTime())
                }

                const timeString = new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

                return {
                  matches: currentMatches,
                  cacheMatches: { ...state.cacheMatches, [st]: updatedCache },
                  letztesUpdate: timeString
                }
              })
            }
          )
          .subscribe()

        set({ subscription: sub })
      },

      abonnierenHeartbeat: () => {
        if (get().heartbeatSub) return // Bereits abonniert

        const sub = supabase
          .channel('heartbeat-sync')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'app_settings', filter: 'key=eq.last_sync' },
            (payload) => {
              const row = payload.new as { key: string; value: string } | null
              if (row?.value) {
                const d = new Date(row.value)
                const timeString = d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                set({ letztesUpdate: timeString })
              }
            }
          )
          .subscribe()

        set({ heartbeatSub: sub })
      },

      recalculateAktivePhase: async () => {
        const tourney = get().selectedTournament
        const currentSeason = get().aktuelleSaison
        if (!tourney) return

        try {
          let activeQuery = supabase.from('matches')
            .select('spieltag')
            .eq('tournament', tourney)
            .in('status', ['live', 'upcoming'])
            .order('spieltag', { ascending: true })
            .limit(1)
          if (currentSeason) activeQuery = activeQuery.eq('season', currentSeason)

          const { data: activeData } = await activeQuery
          if (activeData && activeData.length > 0) {
            set({ aktivePhase: activeData[0].spieltag })
          } else {
            set({ aktivePhase: null })
          }
        } catch (e) {
          console.error("Error recalculating active phase:", e)
        }
      },
      
      cleanup: () => {
        const sub = get().subscription
        if (sub) {
          supabase.removeChannel(sub)
          set({ subscription: null })
        }
        const hb = get().heartbeatSub
        if (hb) {
          supabase.removeChannel(hb)
          set({ heartbeatSub: null })
        }
      }
    }),
    {
      name: 'match-store-cache',
      partialize: (state) => ({
        matches: state.matches,
        aktuellerSpieltag: state.aktuellerSpieltag,
        selectedTournament: state.selectedTournament,
        cacheMatches: state.cacheMatches,
        cacheTimestamps: state.cacheTimestamps,
        letztesUpdate: state.letztesUpdate,
      }),
    }
  )
)


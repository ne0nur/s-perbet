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
  spielminute?: string | null
  heim_logo?: string | null
  gast_logo?: string | null
  venue?: string | null
  espn_id?: string | null
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
  tournamentSpieltag: Record<string, number>  // Letzten Spieltag pro Turnier merken
  aktivePhase: number | null
  isLaden: boolean
  cacheMatches: Record<number, Match[]>
  cacheTimestamps: Record<number, number>
  letztesUpdate: string | null
  syncLabel: string | null
  subscription: RealtimeChannel | null
  heartbeatSub: RealtimeChannel | null
  livePollTimer: ReturnType<typeof setInterval> | null
  ladeMatches: (spieltag: number) => Promise<void>
  prefetchMatches: (spieltag: number) => Promise<void>  // Hintergrund-Cache füllen
  setSpieltag: (spieltag: number) => void
  setSaison: (saison: number) => void
  setSelectedTournament: (name: string) => Promise<void>
  smartSelectSpieltag: (tournament: string) => Promise<number>
  getMatchesBySpieltag: (spieltag: number) => Match[]
  getLiveMatches: () => Match[]
  initialisiereSpieltag: () => Promise<number>
  abonnierenRealtimeMatches: () => void
  abonnierenHeartbeat: () => void
  starteLiveMatchPoll: () => void
  stoppeLiveMatchPoll: () => void
  recalculateAktivePhase: () => Promise<void>
  cleanup: () => void
}

import { persist } from 'zustand/middleware'

export const useMatchStore = create<MatchState>()(
  persist(
    (set, get) => ({
      matches: [],
      aktuellerSpieltag: 1,
      aktuelleSaison: null,
      selectedTournament: 'Süper Lig',
      tournamentSpieltag: {},
      aktivePhase: null,
      isLaden: true,
      cacheMatches: {},
      cacheTimestamps: {},
      letztesUpdate: null,
      syncLabel: null,
      subscription: null,
      heartbeatSub: null,
      livePollTimer: null,

      ladeMatches: async (spieltag: number) => {
        const state = get()
        const cached = state.cacheMatches[spieltag]

        if (cached && cached.length > 0) {
          // Cache sofort anzeigen — kein Ladespinner
          set({ matches: cached, isLaden: false })
        } else {
          // Kein Cache: alte Matches BEHALTEN (nicht leeren!), nur subtle Loading-Indikator
          // isLaden wird NICHT auf true gesetzt, um Skeletons zu vermeiden
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

      // Hintergrund-Prefetch: lädt in Cache, OHNE UI zu beeinflussen
      prefetchMatches: async (spieltag: number) => {
        const state = get()
        if (spieltag <= 0) return
        // Schon gecached? Überspringen
        if (state.cacheMatches[spieltag]?.length) return

        try {
          const currentSeason = state.aktuelleSaison
          let query = supabase.from('matches').select('*').eq('spieltag', spieltag).order('anpfiff', { ascending: true })
          if (currentSeason) query = query.eq('season', currentSeason)
          if (state.selectedTournament && spieltag > 0) query = query.eq('tournament', state.selectedTournament)

          const { data } = await query
          if (data?.length) {
            set(s => ({
              cacheMatches: { ...s.cacheMatches, [spieltag]: data as Match[] },
              cacheTimestamps: { ...s.cacheTimestamps, [spieltag]: Date.now() },
            }))
          }
        } catch { /* silent — prefetch darf nie stören */ }
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
        const state = get()
        // Merke aktuellen Spieltag für altes Turnier
        const updatedMap = { ...state.tournamentSpieltag, [state.selectedTournament]: state.aktuellerSpieltag }
        set({ tournamentSpieltag: updatedMap })

        set({ selectedTournament: name })
        // Stelle letzten Spieltag für neues Turnier wieder her, sonst smart-select
        const saved = updatedMap[name]
        if (saved) {
          set({ aktuellerSpieltag: saved })
          await get().ladeMatches(saved)
        } else {
          const st = await get().smartSelectSpieltag(name)
          await get().ladeMatches(st)
        }
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

      abonnierenHeartbeat: async () => {
        const existing = get().heartbeatSub
        if (existing) {
          const state = (existing as any).state
          if (state === 'joined' || state === 'subscribed') return
          try { supabase.removeChannel(existing) } catch (e) {}
        }

        // Initialen syncLabel-Wert laden (nur Label, nicht letztesUpdate!)
        try {
          const { data } = await supabase.from('app_settings').select('key,value').eq('key', 'sync_label').limit(1)
          if (data?.length) {
            set({ syncLabel: data[0].value })
          }
        } catch (e) {
          console.error('[Heartbeat] initial fetch error:', e)
        }

        const sub = supabase
          .channel('heartbeat-sync')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'app_settings' },
            (payload) => {
              const row = payload.new as { key: string; value: string } | null
              if (!row) return
              // Nur syncLabel via Heartbeat — letztesUpdate kommt vom Live-Poll
              if (row.key === 'sync_label') {
                set({ syncLabel: row.value })
              }
            }
          )
          .subscribe((status) => {
            console.log('[Heartbeat] subscription status:', status)
          })

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
        const timer = get().livePollTimer
        if (timer) {
          clearInterval(timer)
          set({ livePollTimer: null })
        }
      },

      starteLiveMatchPoll: () => {
        if (get().livePollTimer) return
        const pollen = async () => {
          const { matches, aktuellerSpieltag } = get()
          const liveIds = matches.filter(m => m.status === 'live').map(m => m.id)
          if (liveIds.length === 0) return
          try {
            // Einheitlicher Poll: Match-Daten + Sync-Info zusammen laden
            const [matchResult, settingsResult] = await Promise.all([
              supabase.from('matches').select('*').in('id', liveIds),
              supabase.from('app_settings').select('key,value').in('key', ['last_sync', 'sync_label']),
            ])

            const data = matchResult.data
            const timeString = new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

            // Sync-Label aus app_settings extrahieren
            let neuesSyncLabel: string | null = null
            if (settingsResult.data) {
              const labelRow = settingsResult.data.find((r: any) => r.key === 'sync_label')
              if (labelRow?.value) neuesSyncLabel = labelRow.value
            }

            if (data?.length) {
              // ─── PWA Badge: Zähle neu beendete Spiele ───
              const prevFinishedIds = new Set(get().matches.filter(m => m.status === 'finished').map(m => m.id))
              let newFinishedCount = 0
              data.forEach((fresh: Match) => {
                if (fresh.status === 'finished' && !prevFinishedIds.has(fresh.id)) {
                  newFinishedCount++
                }
              })
              if (newFinishedCount > 0 && 'setAppBadge' in navigator) {
                try {
                  const current = await (navigator as any).getAppBadge?.() ?? 0
                  await (navigator as any).setAppBadge?.(current + newFinishedCount)
                } catch { /* badge API optional */ }
              }

              set(s => {
                const updated = [...s.matches]
                data.forEach((fresh: Match) => {
                  const idx = updated.findIndex(m => m.id === fresh.id)
                  if (idx >= 0) updated[idx] = { ...updated[idx], ...fresh }
                })
                const cached = s.cacheMatches[aktuellerSpieltag]
                if (cached) {
                  const updatedCache = [...cached]
                  data.forEach((fresh: Match) => {
                    const ci = updatedCache.findIndex(m => m.id === fresh.id)
                    if (ci >= 0) updatedCache[ci] = { ...updatedCache[ci], ...fresh }
                  })
                  return { matches: updated, cacheMatches: { ...s.cacheMatches, [aktuellerSpieltag]: updatedCache }, letztesUpdate: timeString, syncLabel: neuesSyncLabel ?? s.syncLabel }
                }
                return { matches: updated, letztesUpdate: timeString, syncLabel: neuesSyncLabel ?? s.syncLabel }
              })
            }
          } catch (e) { /* silent */ }
        }

        // Sofort ersten Poll starten, dann alle 30s
        pollen()
        const timer = setInterval(pollen, 30000)
        set({ livePollTimer: timer })
      },

      stoppeLiveMatchPoll: () => {
        const timer = get().livePollTimer
        if (timer) {
          clearInterval(timer)
          set({ livePollTimer: null })
        }
      },
    }),
    {
      name: 'match-store-cache',
      partialize: (state) => ({
        matches: state.matches,
        selectedTournament: state.selectedTournament,
        tournamentSpieltag: state.tournamentSpieltag,
        cacheMatches: state.cacheMatches,
        cacheTimestamps: state.cacheTimestamps,
      }),
    }
  )
)


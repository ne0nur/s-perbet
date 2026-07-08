import { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import { useMatchStore, type Match } from '../stores/matchStore'
import { useTipStore } from '../stores/tipStore'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { MatchCard } from '../components/MatchCard'
import { MatchDetailPanel } from '../components/MatchDetailPanel'
import { Lock, Check, ChevronRight } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { useSettingsStore } from '../stores/settingsStore'
import { useTournamentStore } from '../stores/tournamentStore'
import { useToastStore } from '../stores/toastStore'
import { useTranslation } from '../utils/translations'
import { getTournamentLogo } from '../lib/utils'
import { motion } from 'framer-motion'
import { PullToRefresh } from '../components/ui/PullToRefresh'

export function DashboardPage() {
  const { t, language } = useTranslation()
  const { matches, aktuellerSpieltag, aktuelleSaison, selectedTournament, isLaden, setSpieltag, ladeMatches, prefetchMatches, initialisiereSpieltag, letztesUpdate, syncLabel, abonnierenRealtimeMatches, abonnierenHeartbeat, starteLiveMatchPoll, stoppeLiveMatchPoll, setSelectedTournament } = useMatchStore()
  const ladeMeineTipps = useTipStore(s => s.ladeMeineTipps)
  const meineTipps = useTipStore(s => s.meineTipps)
  const getTippFuerMatch = useTipStore(s => s.getTippFuerMatch)
  const trendVersion = useTipStore(s => s.trendVersion)
  const { user } = useAuthStore()
  const tippsFreigeschaltet = useSettingsStore(s => s.tippsFreigeschaltet)
  const navigate = useNavigate()
  const [maxSpieltag, setMaxSpieltag] = useState(38)
  const [filter, setFilter] = useState<'alle' | 'live'>('alle')
  const [spieltagInfo, setSpieltagInfo] = useState<Record<number, { fullyTipped: boolean; isLive: boolean }>>({})
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null)
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024)
  const sliderRef = useRef<HTMLDivElement>(null)
  const initialized = useRef(false)

  // Turniere aus der zentralen Tournament-Registry (nie aus geladenen Matches)
  // Turniere verschwinden NIE — die Liste kommt immer aus tournament_configs
  const tournamentConfigs = useTournamentStore(s => s.tournaments)
  const availableTournaments = useMemo(() => {
    if (tournamentConfigs.length > 0) {
      return tournamentConfigs.map(t => t.name)
    }
    // Fallback während DB-Ladephase — NIE leer
    return ['Süper Lig', 'Champions League', 'World Cup 2026']
  }, [tournamentConfigs])

  // Responsive Check
  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Beim ersten Mount den richtigen Spieltag ermitteln & Realtime-Abo starten\n  useEffect(() => {\n    if (initialized.current) return\n    initialized.current = true\n    initialisiereSpieltag()\n    abonnierenRealtimeMatches()\n    abonnierenHeartbeat()\n  }, [initialisiereSpieltag, abonnierenRealtimeMatches, abonnierenHeartbeat])\n\n  // Reconnect Realtime wenn App aus Hintergrund zurückkommt\n  useEffect(() => {\n    const handleVisibility = () => {\n      if (document.visibilityState === 'visible') {\n        abonnierenRealtimeMatches()\n        abonnierenHeartbeat()\n      }\n    }\n    document.addEventListener('visibilitychange', handleVisibility)\n    return () => document.removeEventListener('visibilitychange', handleVisibility)\n  }, [abonnierenRealtimeMatches, abonnierenHeartbeat])\n\n  // Cleanup beim Unmount\n  useEffect(() => {\n    return () => {\n      const store = useMatchStore.getState()\n      store.cleanup()\n    }\n  }, [])

  // Live-Match-Poll: aktualisiert Spielminuten + Scores
  useEffect(() => {
    starteLiveMatchPoll()
    return () => stoppeLiveMatchPoll()
  }, [starteLiveMatchPoll, stoppeLiveMatchPoll])

  // Background-Tip-Poll: alle 60s Tipps lautlos refreshen — keine Ladeindikatoren
  useEffect(() => {
    const interval = setInterval(() => {
      ladeMeineTipps(aktuellerSpieltag, true)
    }, 60000)
    return () => clearInterval(interval)
  }, [aktuellerSpieltag, ladeMeineTipps])

  // PWA Badge clearen beim Betreten der App
  useEffect(() => {
    if ('clearAppBadge' in navigator) {
      (navigator as any).clearAppBadge?.()
    }
  }, [])

  useEffect(() => {
    ladeMatches(aktuellerSpieltag)
    ladeMeineTipps(aktuellerSpieltag)
  }, [aktuellerSpieltag, selectedTournament, ladeMatches, ladeMeineTipps])

  // Prefetch Nachbar-Spieltages im Hintergrund — Tab-Wechsel werden instant
  useEffect(() => {
    if (aktuellerSpieltag > 1) prefetchMatches(aktuellerSpieltag - 1)
    if (aktuellerSpieltag < maxSpieltag) prefetchMatches(aktuellerSpieltag + 1)
  }, [aktuellerSpieltag, maxSpieltag, prefetchMatches])

  useEffect(() => {
    let query = supabase.from('matches').select('spieltag').order('spieltag', { ascending: false }).limit(1)
    if (aktuelleSaison) query = query.eq('season', aktuelleSaison)
    query.then(({ data }) => { if (data?.length) setMaxSpieltag(data[0].spieltag) })
  }, [aktuelleSaison])

  // Auto-scroll zum aktuellen Spieltag
  useEffect(() => {
    if (!sliderRef.current) return
    const btn = sliderRef.current.querySelector(`[data-st="${aktuellerSpieltag}"]`) as HTMLElement | null
    if (btn) setTimeout(() => btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' }), 100)
  }, [aktuellerSpieltag, maxSpieltag])

  const ladeSpieltagInfos = useCallback(async () => {
    try {
      const [{ data: matchesData }, { data: tipsData }] = await Promise.all([
        supabase.from('matches').select('spieltag, status'),
        supabase.from('tips').select('matches!inner(spieltag)').eq('user_id', user!.id)
      ])

      const matchCounts: Record<number, number> = {}
      const tipCounts: Record<number, number> = {}
      const liveSpieltage = new Set<number>()

      if (matchesData) {
        matchesData.forEach(m => {
          if (m.spieltag) {
            matchCounts[m.spieltag] = (matchCounts[m.spieltag] || 0) + 1
            if (m.status === 'live') {
              liveSpieltage.add(m.spieltag)
            }
          }
        })
      }

      if (tipsData) {
        tipsData.forEach(t => {
          const st = (t.matches as unknown as { spieltag: number })?.spieltag
          if (st) {
            tipCounts[st] = (tipCounts[st] || 0) + 1
          }
        })
      }

      const infoMap: Record<number, { fullyTipped: boolean; isLive: boolean }> = {}
      const maxSt = matchesData && matchesData.length > 0 ? Math.max(...matchesData.map(m => m.spieltag), 1) : 38
      for (let st = 1; st <= maxSt; st++) {
        const totalMatches = matchCounts[st] || 0
        const totalTips = tipCounts[st] || 0
        infoMap[st] = {
          fullyTipped: totalMatches > 0 && totalTips === totalMatches,
          isLive: liveSpieltage.has(st)
        }
      }
      setSpieltagInfo(infoMap)
    } catch (e) {
      console.error('Fehler beim Laden der Spieltag-Infos:', e)
      useToastStore.getState().toast(t('errorLoadingMatchInfo'), 'error')
    }
  }, [user])

  // Spieltag-Infos (live, fullyTipped) laden. Nur beim Start oder wenn sich der User ändert.
  useEffect(() => {
    if (!user) return
    ladeSpieltagInfos()
  }, [user, ladeSpieltagInfos])

  // Visibility-Change: Bei Rückkehr zur App Tipps + Trend-Stats lautlos refreshen
  useEffect(() => {
    const handleVisible = () => {
      if (document.visibilityState === 'visible') {
        ladeMeineTipps(aktuellerSpieltag, true)
        if (user) ladeSpieltagInfos()
      }
    }
    document.addEventListener('visibilitychange', handleVisible)
    return () => document.removeEventListener('visibilitychange', handleVisible)
  }, [aktuellerSpieltag, ladeMeineTipps, ladeSpieltagInfos, user])

  // Auto-select first match on desktop when matches list changes
  const anzeigeMatches = filter === 'live'
    ? matches.filter(m => m.status === 'live')
    : matches
  const [trendStatsMap, setTrendStatsMap] = useState<Record<string, { home: number, draw: number, away: number }>>({})

  // Fetch trend stats for displayed matches
  useEffect(() => {
    const matchIds = anzeigeMatches.map(m => m.id)
    if (matchIds.length === 0) return
    
    let isMounted = true
    // Try RPC first
    supabase.rpc('get_match_trends', { p_match_ids: matchIds }).then(({ data, error }) => {
      if (error || !data) {
        // Fallback to querying tips directly
        supabase.from('tips').select('match_id, tipp_heim, tipp_gast').in('match_id', matchIds).then(({ data: fallbackData }) => {
          if (!fallbackData || !isMounted) return
          const map: Record<string, { home: number, draw: number, away: number }> = {}
          matchIds.forEach(id => map[id] = { home: 0, draw: 0, away: 0 })
          fallbackData.forEach((t: any) => {
            if (!map[t.match_id]) map[t.match_id] = { home: 0, draw: 0, away: 0 }
            if (t.tipp_heim > t.tipp_gast) map[t.match_id].home++
            else if (t.tipp_heim === t.tipp_gast) map[t.match_id].draw++
            else map[t.match_id].away++
          })
          setTrendStatsMap(map)
        })
        return
      }
      
      if (isMounted) {
        const map: Record<string, { home: number, draw: number, away: number }> = {}
        data.forEach((d: any) => {
          map[d.match_id] = { home: Number(d.home_tips), draw: Number(d.draw_tips), away: Number(d.away_tips) }
        })
        setTrendStatsMap(map)
      }
    })
    
    return () => { isMounted = false }
  }, [anzeigeMatches, trendVersion])  // Group matches by tournament
  
  const matchesByTournament = useMemo(() => {
    const groups: Record<string, typeof anzeigeMatches> = {}
    anzeigeMatches.forEach(m => {
      const t = m.tournament || 'Süper Lig'
      if (!groups[t]) groups[t] = []
      groups[t].push(m)
    })
    return groups
  }, [anzeigeMatches])

  useEffect(() => {
    if (isDesktop && anzeigeMatches.length > 0) {
      const hasMatch = anzeigeMatches.some(m => m.id === selectedMatchId)
      if (!hasMatch) {
        setSelectedMatchId(anzeigeMatches[0].id)
      }
    } else if (!isDesktop) {
      setSelectedMatchId(null)
    }
  }, [isDesktop, anzeigeMatches, selectedMatchId])

  useEffect(() => {
    if (anzeigeMatches.length === 0 || filter !== 'alle') return
    
    // Auto-Scroll zur relevantesten Begegnung
    let targetMatch = anzeigeMatches.find(m => m.status === 'live' || m.status === 'upcoming')
    
    // Falls keine ausstehend/live sind, nimm das letzte beendete Spiel
    if (!targetMatch) {
      targetMatch = [...anzeigeMatches].reverse().find(m => m.status === 'finished')
    }
    
    if (targetMatch) {
      // Timeout stellt sicher, dass das Element im DOM gerendert ist
      setTimeout(() => {
        const el = document.getElementById(`match-card-${targetMatch?.id}`)
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }, 100)
    }
  }, [anzeigeMatches, filter])

  // Lokales Update der Spieltag-Info, wenn sich meineTipps (für den aktuellen Spieltag) ändern
  useEffect(() => {
    if (!spieltagInfo[aktuellerSpieltag]) return
    const totalMatchesForCurrent = matches.length
    const totalTipsForCurrent = Object.keys(meineTipps).length
    const isFullyTipped = totalMatchesForCurrent > 0 && totalTipsForCurrent === totalMatchesForCurrent
    
    if (spieltagInfo[aktuellerSpieltag].fullyTipped !== isFullyTipped) {
      setSpieltagInfo(prev => ({
        ...prev,
        [aktuellerSpieltag]: {
          ...prev[aktuellerSpieltag],
          fullyTipped: isFullyTipped
        }
      }))
    }
  }, [meineTipps, matches, aktuellerSpieltag, spieltagInfo])
  const offeneTipps = matches.filter(m => m.status === 'upcoming' && !getTippFuerMatch(m.id)).length

  const getPhaseLabel = (st: number, tournament: string) => {
    const config = useTournamentStore.getState().getTournament(tournament)
    
    // K.o.-Turniere (CL, WM, etc.): zeige Phase statt "Spieltag X"
    if (config?.has_knockout) {
      const groupStages = config.group_stage_matchdays
      if (st <= groupStages) {
        return t('clRoundLeague', { st })
      }
      // K.o.-Runde aus Spieltag-Nummer berechnen
      const koRound = st - groupStages
      const isWC = tournament.toLowerCase().includes('world cup') || tournament.toLowerCase().includes('wm')
      
      if (isWC) {
        const wmLabels: Record<number, string> = {
          1: t('koPhase32'),
          2: t('koPhase16'),
          3: t('koPhase8'),
          4: t('koPhase4'),
          5: t('koPhase2'),
        }
        return wmLabels[koRound] || `Runde ${koRound}`
      }
      
      const koLabels: Record<number, string> = {
        1: t('clRoundPlayoffs'),
        2: t('clRoundLast16'),
        3: t('clRoundQuarter'),
        4: t('clRoundSemi'),
        5: t('clRoundFinal'),
      }
      return koLabels[koRound] || `${t('clRoundLeague', { st: koRound })}`
    }
    
    // Liga-Turniere: "Spieltag X"
    return t('slRoundLabel', { st })
  }

  // Bestimme wie viele Tabs gezeigt werden dynamically
  const getTabsCount = () => {
    const config = useTournamentStore.getState().getTournament(selectedTournament)
    // K.o.-Turniere: benutze group_stage_matchdays + KO-Runden als Konstante
    if (config?.has_knockout) {
      return config.group_stage_matchdays + 5  // Gruppenphase + KO-Runden
    }
    // Liga-Turniere
    return maxSpieltag || 38
  }

  const handleManualRefresh = async () => {
    await Promise.all([
      ladeMatches(aktuellerSpieltag),
      ladeMeineTipps(aktuellerSpieltag),
    ])
  }

  return (
    <PullToRefresh onRefresh={handleManualRefresh}>
    <div className="min-h-full flex flex-col pb-24 md:pb-6 animate-page-enter">
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-xl shrink-0 border-b border-white/5 px-4 md:px-6 lg:px-8 pt-2.5 pb-1">
        <div className="max-w-[1600px] mx-auto w-full">
          {/* Row 1: Turnier-Filter & Saison-Selector & All/Live Toggle */}
          <div className="flex justify-between items-center mb-2 gap-2 max-w-full">
            <div 
              className="flex overflow-x-auto no-scrollbar bg-surface-container/50 border border-white/5 p-0.5 rounded-xl gap-1 backdrop-blur-md flex-1 relative"
              style={{ 
                maskImage: 'linear-gradient(to right, black calc(100% - 24px), transparent 100%)', 
                WebkitMaskImage: 'linear-gradient(to right, black calc(100% - 24px), transparent 100%)' 
              }}
            >
              {availableTournaments.map(tName => (
                <button
                  key={tName}
                  onClick={() => { 
                    setSelectedTournament(tName)
                    useMatchStore.getState().setSelectedTournament(tName)
                  }}
                  className={`px-2.5 py-1.5 text-[8px] xs:text-[9px] md:text-xs font-mono font-black uppercase tracking-wider rounded-lg whitespace-nowrap transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${selectedTournament === tName ? 'bg-primary-container text-on-primary-container shadow-[0_1.5px_6px_rgba(var(--primary-rgb),0.1)] border border-primary/20 scale-[1.01]' : 'text-on-surface-variant hover:text-on-surface hover:bg-white/5 border border-transparent'}`}
                >
                  <img src={getTournamentLogo(tName)} alt={tName} className="w-4 h-4 object-contain drop-shadow-[0_0_8px_rgba(255,255,255,0.6)] brightness-110 shrink-0" onError={(e) => { (e.target as HTMLImageElement).src = `${import.meta.env.BASE_URL}logos/soccer_ball.png` }} />
                  <span className="hidden xs:inline">{tName}</span>
                  <span className="xs:hidden">{tName.split(' ')[0]}</span>
                </button>
              ))}
            </div>

            {/* Saison-Selector */}
              <select
                value={useMatchStore.getState().aktuelleSaison || 2026}
                onChange={(e) => useMatchStore.getState().setSaison(parseInt(e.target.value))}
                className="bg-surface-container border border-surface-container-high rounded-lg px-2 py-1 text-[10px] text-on-surface focus:outline-none focus:border-primary-container font-mono cursor-pointer"
              >
                {(() => {
                  const config = useTournamentStore.getState().getTournament(selectedTournament)
                  let seasons = [2026, 2025, 2024]
                  if (config && !config.has_historical_data) {
                    seasons = [config.season]
                  }
                  return seasons.map(s => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))
                })()}
              </select>
          </div>

          {/* Row 2: Spieltag-Slider Segmented Control */}
          <div className="py-1.5 border-t border-white/5 relative flex items-center gap-1.5">
            <div className="bg-surface-container/40 border border-white/5 p-0.5 rounded-xl flex items-center gap-1 overflow-hidden backdrop-blur-sm w-full">
              {/* Sticky "ALLE" Button — immer sichtbar */}
              <button
                onClick={() => { setSpieltag(0); ladeMatches(0); }}
                className={`flex-shrink-0 px-2.5 py-1.5 rounded-lg text-[8px] xs:text-[9px] md:text-xs font-mono font-black uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                  aktuellerSpieltag === 0
                    ? 'bg-primary-container text-on-primary-container shadow-[0_1.5px_6px_rgba(var(--primary-rgb),0.1)] border border-primary/20 scale-[1.01]'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-white/5 border border-transparent'
                }`}
              >
                {t('filterAll')}
              </button>

              <span className="w-[1px] h-3.5 bg-white/10 shrink-0" />

              {/* Slider (scrollbar) */}
              <div className="relative flex-1 min-w-0">
                <div ref={sliderRef} className="flex overflow-x-auto no-scrollbar gap-1 px-1 relative z-0" style={{ maskImage: 'linear-gradient(to right, transparent 0px, black 8px, black calc(100% - 16px), transparent 100%)', WebkitMaskImage: 'linear-gradient(to right, transparent 0px, black 8px, black calc(100% - 16px), transparent 100%)' }}>
                  {Array.from({ length: getTabsCount() }, (_, i) => i + 1).map(st => {
                    const isActive = st === aktuellerSpieltag
                    const info = spieltagInfo[st]
                    const isLive = info?.isLive
                    const fullyTipped = info?.fullyTipped

                    let btnStyle = 'text-on-surface-variant hover:text-on-surface hover:bg-white/5 border border-transparent'
                    if (isActive) {
                      btnStyle = 'bg-primary-container text-on-primary-container font-black shadow-[0_1.5px_6px_rgba(var(--primary-rgb),0.1)] border border-primary/20 scale-[1.01]'
                    } else if (st < aktuellerSpieltag) {
                      if (fullyTipped) {
                        btnStyle = 'border border-green-500/20 text-green-400 bg-green-500/5 hover:bg-green-500/10'
                      } else {
                        btnStyle = 'border border-primary/10 text-primary/70 bg-primary/5 hover:bg-primary/10 opacity-70'
                      }
                    }

                    return (
                      <button
                        key={st}
                        data-st={st}
                        onClick={() => setSpieltag(st)}
                        className={`flex-shrink-0 px-2 py-1.5 rounded-lg text-[8px] xs:text-[9px] md:text-xs font-mono font-black uppercase tracking-wider transition-all duration-200 cursor-pointer relative flex items-center gap-1 ${btnStyle}`}
                      >
                        {getPhaseLabel(st, selectedTournament)}
                        {fullyTipped && st < aktuellerSpieltag && !isActive && (
                          <Check size={9} className="text-green-400" />
                        )}
                        {isLive && (
                          <span className="w-1 h-1 bg-red-500 rounded-full animate-pulse" />
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
              {/* Desktop Next Button */}
              <button
                onClick={() => setSpieltag(aktuellerSpieltag + 1)}
                className="hidden md:flex flex-shrink-0 px-1.5 py-1.5 rounded-lg text-on-surface-variant/50 hover:text-on-surface hover:bg-white/5 transition-colors cursor-pointer"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Tiny Letztes Update Row */}
          {letztesUpdate && (
            <div className={`flex justify-end items-center gap-1 text-[8px] font-mono mt-0.5 opacity-60 ${
              syncLabel?.includes('Live') || syncLabel?.includes('Crunch') 
                ? 'text-green-400 font-bold' 
                : syncLabel?.includes('Halbzeit') 
                  ? 'text-amber-400' 
                  : syncLabel?.includes('Kickoff') 
                    ? 'text-blue-400' 
                    : 'text-on-surface-variant'
            }`}>
              <span className={`w-1 h-1 rounded-full ${
                syncLabel?.includes('Live') || syncLabel?.includes('Crunch') 
                  ? 'bg-green-500' 
                  : syncLabel?.includes('Halbzeit') 
                    ? 'bg-amber-500' 
                    : syncLabel?.includes('Kickoff') 
                      ? 'bg-blue-500' 
                      : 'bg-slate-500'
              }`} />
              <span>{letztesUpdate}</span>
            </div>
          )}
        </div>
      </header>

      {/* Banners */}
      {( !tippsFreigeschaltet || (tippsFreigeschaltet && offeneTipps > 0) ) && (
        <div className="px-4 md:px-6 lg:px-8 max-w-[1600px] mx-auto w-full mt-4 flex flex-col gap-3">
          {!tippsFreigeschaltet && (
            <div className="px-4 py-3 bg-surface-container-low border border-surface-container-high rounded-xl flex items-center gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-container/10 flex items-center justify-center">
                <Lock size={14} className="text-primary-fixed-dim" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-mono font-bold uppercase tracking-wider text-on-surface-variant mb-0.5 whitespace-normal break-words">{t('tippingLocked')}</p>
                <p className="text-[11px] text-on-surface-variant/50 font-mono whitespace-normal break-words leading-snug">
                  {t('tippingLockedDesc')}
                </p>
              </div>
            </div>
          )}

          {tippsFreigeschaltet && offeneTipps > 0 && (
            <div className="px-3 py-2 bg-primary-container/10 border border-primary-container/30 rounded-lg flex items-center gap-2 animate-glow-pulse">
              <span className="text-xs shrink-0">⏳</span>
              <span className="text-[10px] font-mono font-bold text-primary-fixed-dim whitespace-nowrap">
                {offeneTipps} {offeneTipps === 1 ? t('openTipSingular') : t('openTipsPlural', { count: offeneTipps })}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 px-4 md:px-6 lg:px-8 pt-4 md:pt-6 max-w-[1600px] mx-auto w-full relative">
        {/* Subtiler Loading-Balken wenn Cache da ist — keine Skeletons! */}
        {isLaden && matches.length > 0 && (
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-surface-container-high overflow-hidden z-10">
            <div className="h-full bg-primary animate-loading-bar" style={{ width: '30%' }} />
          </div>
        )}
        {isLaden && matches.length === 0 ? (
          <div className="space-y-3">
            {[1,2,3,4].map(i => (
              <div key={i} className="skeleton rounded-xl h-[112px]" style={{ animationDelay: `${(i-1) * 80}ms` }} />
            ))}
          </div>
        ) : anzeigeMatches.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 gap-4 bg-surface-container/30 border border-white/5 rounded-3xl text-center">
            <div className="w-20 h-20 rounded-full bg-surface-container flex items-center justify-center mb-2 shadow-inner">
              <img 
                src={getTournamentLogo(selectedTournament)} 
                alt={selectedTournament} 
                className="w-10 h-10 object-contain opacity-40 grayscale" 
                loading="lazy"
                onError={(e) => { (e.target as HTMLImageElement).src = `${import.meta.env.BASE_URL}logos/soccer_ball.png` }} 
              />
            </div>
            <h3 className="text-lg font-bold text-on-surface">{t('noMatchesFound')}</h3>
            <p className="text-on-surface-variant/70 text-xs md:text-sm max-w-md font-mono leading-relaxed">
              {filter === 'live' 
                ? (language === 'tr' ? 'Şu anda bu turnuvada canlı maç yok. Daha sonra tekrar kontrol et!' : language === 'en' ? 'There are no live matches in this tournament right now. Check back later!' : 'Aktuell laufen in diesem Turnier keine Spiele. Schau später wieder vorbei!')
                : (language === 'tr' ? 'Bu turnuva için şu anda planlanmış maç yok. Turnuva şu anda tatilde olabilir veya yanlış sezonu seçmiş olabilirsin.' : language === 'en' ? 'There are currently no matches scheduled for this tournament. The league might be on a break or you have selected the wrong season.' : 'Für dieses Turnier sind aktuell keine Spiele angesetzt. Entweder pausiert die Liga aktuell oder du hast die falsche Saison ausgewählt.')}
            </p>
            {filter === 'live' && (
              <button onClick={() => setFilter('alle')} className="mt-4 bg-surface-container-high border border-white/10 text-on-surface px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-white/5 transition-all shadow-sm active:scale-95">
                {t('showAllMatches')}
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop: cards shift left when detail panel is open */}
            <div className={isDesktop && selectedMatchId ? 'lg:mr-96 transition-all duration-300' : 'transition-all duration-300'}>
              {Object.entries(matchesByTournament)
                .filter(([tournamentName]) => {
                  if (aktuellerSpieltag === 0) return true
                  return tournamentName === selectedTournament;
                })
                .map(([tournamentName, tourneyMatches]) => {
                  // Dynamic grid: 2 cols for 6 or fewer matches, 3 cols for more
                  const cols = tourneyMatches.length <= 6 
                    ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-2' 
                    : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
                  
                  return (
                    <div key={tournamentName} className="mb-8">
                      {/* Tournament header — subtle, desktop-only styling */}
                      <h2 className="hidden md:flex items-center gap-2 text-xs font-bold text-on-surface-variant/60 uppercase tracking-widest mb-4 pb-2 border-b border-white/[0.04]">
                        <img 
                          src={getTournamentLogo(tournamentName)} 
                          alt={tournamentName} 
                          className="w-4 h-4 object-contain opacity-60" 
                          onError={(e) => { (e.target as HTMLImageElement).src = `${import.meta.env.BASE_URL}logos/soccer_ball.png` }}
                        />
                        {tournamentName}
                      </h2>
                      {/* Mobile tournament header (simpler) */}
                      <h2 className="md:hidden text-xs font-bold text-on-surface/70 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                        <img 
                          src={getTournamentLogo(tournamentName)} 
                          alt={tournamentName} 
                          className="w-4 h-4 object-contain opacity-60" 
                          onError={(e) => { (e.target as HTMLImageElement).src = `${import.meta.env.BASE_URL}logos/soccer_ball.png` }}
                        />
                        {tournamentName}
                      </h2>
                      <div className={`grid ${cols} gap-4 xl:gap-5 w-full`}>
                        {tourneyMatches.map((match: Match) => {
                          const isSelected = selectedMatchId === match.id
                          return (
                            <div key={match.id} id={`match-card-${match.id}`} className="stagger-in">
                              <MatchCard
                                match={match}
                                trendStats={trendStatsMap[match.id]}
                                onNavigate={() => {
                                  if (isDesktop) {
                                    setSelectedMatchId(match.id)
                                  } else {
                                    navigate(`/match/${match.id}`)
                                  }
                                }}
                                className={isSelected && isDesktop ? 'ring-1 ring-primary/50 shadow-[0_0_20px_rgba(var(--primary-rgb),0.12)] bg-surface-container-high/70 scale-[1.01]' : ''}
                              />
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
            </div>

            {/* Desktop slide-in detail panel */}
            {isDesktop && selectedMatchId && (
              <motion.div 
                initial={{ x: 400, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 400, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="hidden lg:block fixed right-0 top-[65px] bottom-6 w-96 z-40"
              >
                <div className="h-full bg-surface/90 backdrop-blur-2xl border-l border-white/[0.06] rounded-l-2xl shadow-[-8px_0_40px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col">
                  <MatchDetailPanel matchId={selectedMatchId} onClose={() => setSelectedMatchId(null)} />
                </div>
              </motion.div>
            )}
          </>
        )}
      </main>
    </div>
    </PullToRefresh>
  )
}

import { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import { useMatchStore, type Match } from '../stores/matchStore'
import { useTipStore } from '../stores/tipStore'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { MatchCard } from '../components/MatchCard'
import { MatchDetailPanel } from '../components/MatchDetailPanel'
import { Lock, Check } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { useSettingsStore } from '../stores/settingsStore'
import { useTournamentStore } from '../stores/tournamentStore'
import { useToastStore } from '../stores/toastStore'
import { useTranslation } from '../utils/translations'
import { getTournamentLogo } from '../lib/utils'

export function DashboardPage() {
  const { t } = useTranslation()
  const { matches, aktuellerSpieltag, aktuelleSaison, selectedTournament, isLaden, setSpieltag, ladeMatches, initialisiereSpieltag, letztesUpdate, abonnierenRealtimeMatches, setSelectedTournament } = useMatchStore()
  const ladeMeineTipps = useTipStore(s => s.ladeMeineTipps)
  const meineTipps = useTipStore(s => s.meineTipps)
  const getTippFuerMatch = useTipStore(s => s.getTippFuerMatch)
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
    return ['Süper Lig', 'Champions League']
  }, [tournamentConfigs])

  // Responsive Check
  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Beim ersten Mount den richtigen Spieltag ermitteln & Realtime-Abo starten
  useEffect(() => {
    if (initialized.current) return
    initialized.current = true
    initialisiereSpieltag()
    abonnierenRealtimeMatches()
  }, [initialisiereSpieltag, abonnierenRealtimeMatches])

  useEffect(() => {
    ladeMatches(aktuellerSpieltag)
    ladeMeineTipps(aktuellerSpieltag)
  }, [aktuellerSpieltag, ladeMatches, ladeMeineTipps])

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
      useToastStore.getState().toast('Fehler beim Laden der Spieltag-Infos', 'error')
    }
  }, [user])

  // Spieltag-Infos (live, fullyTipped) laden. Nur beim Start oder wenn sich der User ändert.
  useEffect(() => {
    if (!user) return
    ladeSpieltagInfos()
  }, [user, ladeSpieltagInfos])

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
  }, [anzeigeMatches])  // Group matches by tournament
  
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

  return (
    <div className="min-h-full flex flex-col pb-24 md:pb-6 animate-page-enter">
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-xl shrink-0 border-b border-white/5 px-4 md:px-6 lg:px-8 pt-4 pb-1">
        <div className="max-w-[1600px] mx-auto w-full">
          {/* Turnier-Filter & Saison-Selector */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-3 max-w-full">
            <div className="flex overflow-x-auto no-scrollbar bg-surface-container/50 border border-white/5 p-1 rounded-2xl gap-1.5 backdrop-blur-md max-w-full">
              {availableTournaments.map(tName => (
                <button
                  key={tName}
                  onClick={() => { 
                    setSelectedTournament(tName)
                    useMatchStore.getState().setSelectedTournament(tName)
                  }}
                  className={`px-3 py-2 text-[9px] xs:text-[10px] md:text-xs font-mono font-black uppercase tracking-wider rounded-xl whitespace-nowrap transition-all duration-200 cursor-pointer flex items-center gap-2 ${selectedTournament === tName ? 'bg-primary-container text-on-primary-container shadow-[0_2px_8px_rgba(var(--primary-rgb),0.15)] border border-primary/20 scale-[1.01]' : 'text-on-surface-variant hover:text-on-surface hover:bg-white/5 border border-transparent'}`}
                >
                  <img src={getTournamentLogo(tName)} alt={tName} className="w-5 h-5 object-contain drop-shadow-[0_0_8px_rgba(255,255,255,0.6)] brightness-110 shrink-0" onError={(e) => { (e.target as HTMLImageElement).src = `${import.meta.env.BASE_URL}logos/soccer_ball.png` }} />
                  {tName}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              {/* Kontext-Indikator: immer sichtbar, zeigt wo der User ist */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-primary-container/10 border border-primary/10 rounded-full">
                <img src={getTournamentLogo(selectedTournament)} alt="" className="w-3.5 h-3.5 object-contain brightness-110" onError={(e) => { (e.target as HTMLImageElement).src = `${import.meta.env.BASE_URL}logos/soccer_ball.png` }} />
                <span className="text-[9px] font-mono font-black text-primary uppercase tracking-wider">{selectedTournament}</span>
                {aktuellerSpieltag > 0 && (
                  <>
                    <span className="text-[8px] text-on-surface-variant/30">·</span>
                    <span className="text-[9px] font-mono text-on-surface-variant/50">{getPhaseLabel(aktuellerSpieltag, selectedTournament)}</span>
                  </>
                )}
              </div>
            </div>

            <select
              value={useMatchStore.getState().aktuelleSaison || 2026}
              onChange={(e) => useMatchStore.getState().setSaison(parseInt(e.target.value))}
              className="bg-surface-container border border-surface-container-high rounded-lg px-3 py-1.5 text-xs text-on-surface focus:outline-none focus:border-primary-container font-mono"
            >
              {(() => {
                const config = useTournamentStore.getState().getTournament(selectedTournament)
                let seasons = [2026, 2025, 2024]
                if (config && !config.has_historical_data) {
                  seasons = [config.season]
                }
                return seasons.map(s => (
                  <option key={s} value={s}>
                    {t('seasonLabel', { year: `${s}/${(s + 1).toString().slice(2)}` })}
                  </option>
                ))
              })()}
            </select>
          </div>

          {/* Spieltag-Slider Segmented Control */}
          <div className="pt-2.5 pb-3 border-t border-white/5 relative flex items-center gap-1.5">
            <div className="bg-surface-container/40 border border-white/5 p-1 rounded-2xl flex items-center gap-1.5 overflow-hidden backdrop-blur-sm w-full">
              {/* Sticky "ALLE" Button — immer sichtbar */}
              <button
                onClick={() => { setSpieltag(0); ladeMatches(0); }}
                className={`flex-shrink-0 px-3.5 py-2 rounded-xl text-[9px] xs:text-[10px] md:text-xs font-mono font-black uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                  aktuellerSpieltag === 0
                    ? 'bg-primary-container text-on-primary-container shadow-[0_2px_8px_rgba(var(--primary-rgb),0.15)] border border-primary/20 scale-[1.01]'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-white/5 border border-transparent'
                }`}
              >
                {t('filterAll')}
              </button>

              <span className="w-[1px] h-4 bg-white/10 shrink-0" />

              {/* Slider (scrollbar) */}
              <div className="relative flex-1 min-w-0">
                <div ref={sliderRef} className="flex overflow-x-auto no-scrollbar gap-1.5 px-1 relative z-0" style={{ maskImage: 'linear-gradient(to right, transparent 0px, black 8px, black calc(100% - 16px), transparent 100%)', WebkitMaskImage: 'linear-gradient(to right, transparent 0px, black 8px, black calc(100% - 16px), transparent 100%)' }}>
                  {Array.from({ length: getTabsCount() }, (_, i) => i + 1).map(st => {
                    const isActive = st === aktuellerSpieltag
                    const info = spieltagInfo[st]
                    const isLive = info?.isLive
                    const fullyTipped = info?.fullyTipped

                    let btnStyle = 'text-on-surface-variant hover:text-on-surface hover:bg-white/5 border border-transparent'
                    if (isActive) {
                      btnStyle = 'bg-primary-container text-on-primary-container font-black shadow-[0_2px_8px_rgba(var(--primary-rgb),0.15)] border border-primary/20 scale-[1.01]'
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
                        className={`flex-shrink-0 px-3 py-2 rounded-xl text-[9px] xs:text-[10px] md:text-xs font-mono font-black uppercase tracking-wider transition-all duration-200 cursor-pointer relative flex items-center gap-1 ${btnStyle}`}
                      >
                        {getPhaseLabel(st, selectedTournament)}
                        {fullyTipped && st < aktuellerSpieltag && !isActive && (
                          <Check size={11} className="text-green-400" />
                        )}
                        {isLive && (
                          <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Filter-Toggle + Letztes Update Badge */}
          <div className="flex justify-between items-center py-2.5 border-t border-white/5">
            <div className="flex bg-surface-container/50 border border-white/5 p-0.5 rounded-xl gap-1">
              {(['alle', 'live'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`text-[9px] font-mono font-black uppercase tracking-wider px-3 py-1.5 rounded-lg transition-all duration-200 cursor-pointer ${
                    filter === f
                      ? 'bg-primary-container text-on-primary-container shadow-[0_1.5px_6px_rgba(var(--primary-rgb),0.1)] border border-primary/25 scale-[1.01]'
                      : 'text-on-surface-variant hover:text-on-surface hover:bg-white/5 border border-transparent'
                  }`}
                >
                  {f === 'alle' ? t('filterAll') : t('filterLive')}
                </button>
              ))}
            </div>
            
            {letztesUpdate && (
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/5 border border-white/5 text-[9px] font-mono text-on-surface-variant/60 animate-pulse-slow">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                <span>{t('matchLive')} ({letztesUpdate})</span>
              </div>
            )}
          </div>
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
      <main className="flex-1 px-4 md:px-6 lg:px-8 pt-4 md:pt-6 max-w-[1600px] mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 xl:gap-10 items-start">
          {/* Matches column */}
          <div className="lg:col-span-7 space-y-3">
            {isLaden ? (
              <div className="space-y-3">
                {[1,2,3,4].map(i => (
                  <div key={i} className="skeleton rounded-xl h-[112px]" style={{ animationDelay: `${(i-1) * 80}ms` }} />
                ))}
              </div>
            ) : anzeigeMatches.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <p className="text-on-surface-variant/50 text-sm font-mono">{t('noMatchesShort')}</p>
                {filter === 'live' && (
                  <button onClick={() => setFilter('alle')} className="btn-secondary text-xs">
                    {t('showAllMatches')}
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-8">
                {Object.entries(matchesByTournament)
                  .filter(([tournamentName]) => {
                    // "ALLE" (spieltag=0): zeige alle Turniere
                    if (aktuellerSpieltag === 0) return true
                    return tournamentName === selectedTournament;
                  })
                  .map(([tournamentName, tourneyMatches]) => (
                  <div key={tournamentName} className="mb-6">
                    <h2 className="text-sm font-bold text-on-surface mb-4 border-b border-white/10 pb-2 uppercase tracking-wide">
                      <span className="flex items-center gap-2">
                        <img 
                          src={getTournamentLogo(tournamentName)} 
                          alt={tournamentName} 
                          className="w-5 h-5 object-contain brightness-110 drop-shadow-[0_0_8px_rgba(255,255,255,0.6)]" 
                          onError={(e) => { (e.target as HTMLImageElement).src = `${import.meta.env.BASE_URL}logos/soccer_ball.png` }}
                        />
                        {tournamentName}
                      </span>
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-4 xl:gap-6 w-full">
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
                              className={isSelected && isDesktop ? 'border-primary/50 shadow-[0_0_15px_rgba(var(--primary-rgb),0.15)] bg-surface-container-high/60 scale-[1.01]' : ''}
                            />
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Persistent Match Detail Panel (Desktop only) */}
          {isDesktop && selectedMatchId && (
            <div className="hidden lg:block lg:col-span-5 lg:sticky lg:top-[120px]">
              <MatchDetailPanel matchId={selectedMatchId} />
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

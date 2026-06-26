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
import { useToastStore } from '../stores/toastStore'
import { useTranslation } from '../utils/translations'

export function DashboardPage() {
  const { t } = useTranslation()
  const { matches, aktuellerSpieltag, aktuelleSaison, isLaden, setSpieltag, ladeMatches, initialisiereSpieltag, letztesUpdate, abonnierenRealtimeMatches } = useMatchStore()
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
  const [selectedTournament, setSelectedTournament] = useState<string>('Süper Lig')
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024)
  const sliderRef = useRef<HTMLDivElement>(null)
  const initialized = useRef(false)

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
    if (tournament === 'Champions League') {
      if (st <= 8) return t('clRoundLeague', { st })
      if (st === 9) return t('clRoundPlayoffs')
      if (st === 10) return t('clRoundLast16')
      if (st === 11) return t('clRoundQuarter')
      if (st === 12) return t('clRoundSemi')
      if (st === 13) return t('clRoundFinal')
    }
    return t('slRoundLabel', { st })
  }

  // Bestimme wie viele Tabs gezeigt werden
  const getTabsCount = () => {
    if (selectedTournament === 'Champions League') return 13
    return maxSpieltag || 38
  }

  return (
    <div className="min-h-full flex flex-col pb-24 md:pb-6 animate-page-enter">
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-xl shrink-0 border-b border-white/5 px-4 md:px-6 lg:px-8 pt-4 pb-1">
        <div className="max-w-[1600px] mx-auto w-full">
          {/* Turnier-Filter & Saison-Selector */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-3">
            <div className="flex bg-surface-container border border-surface-container-high p-1 rounded-lg">
              <button
                onClick={() => { setSelectedTournament('Süper Lig'); setSpieltag(1); }}
                className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-all flex items-center gap-2 ${selectedTournament === 'Süper Lig' ? 'bg-primary text-on-primary font-bold shadow-md' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container/50'}`}
              >
                <img src={`${import.meta.env.BASE_URL}logos/Süper_Lig.png`} alt="SL" className="w-6 h-6 object-contain drop-shadow-[0_0_8px_rgba(255,255,255,0.6)] brightness-110" />
                Süper Lig
              </button>
              <button
                onClick={() => { setSelectedTournament('Champions League'); setSpieltag(1); }}
                className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-all flex items-center gap-2 ${selectedTournament === 'Champions League' ? 'bg-primary text-on-primary font-bold shadow-md' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container/50'}`}
              >
                <img src={`${import.meta.env.BASE_URL}logos/UEFA_Champions_League_logo.png`} alt="CL" className="w-6 h-6 object-contain drop-shadow-[0_0_8px_rgba(255,255,255,0.6)] brightness-110" />
                Champions League
              </button>
            </div>

            <select
              value={useMatchStore.getState().aktuelleSaison || 2026}
              onChange={(e) => useMatchStore.getState().setSaison(parseInt(e.target.value))}
              className="bg-surface-container border border-surface-container-high rounded-lg px-3 py-1.5 text-xs text-on-surface focus:outline-none focus:border-primary-container font-mono"
            >
              <option value={2026}>{t('seasonLabel', { year: '2026/27' })}</option>
              <option value={2025}>{t('seasonLabel', { year: '2025/26' })}</option>
              <option value={2024}>{t('seasonLabel', { year: '2024/25' })}</option>
            </select>
          </div>

          {/* Spieltag-Slider */}
          <div className="pt-2 pb-3 border-t border-white/5 relative flex items-center gap-1.5">
            {/* Sticky "ALLE" Button — immer sichtbar */}
            <button
              onClick={() => { setSpieltag(0); ladeMatches(0); }}
              className={`flex-shrink-0 px-3 py-2 rounded-full border text-[11px] font-mono font-medium transition-all z-20 ${
                aktuellerSpieltag === 0
                  ? 'bg-primary-container text-on-primary border-primary-container shadow-[0_0_15px_rgba(251,191,36,0.4)] font-bold'
                  : 'bg-surface-container/80 border-white/10 text-on-surface-variant hover:bg-white/5'
              }`}
            >
              {t('filterAll')}
            </button>
            {/* Slider (scrollbar) */}
            <div className="relative flex-1 min-w-0">
            <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
            <div ref={sliderRef} className="flex overflow-x-auto no-scrollbar gap-2 px-2 relative z-0">
              {Array.from({ length: getTabsCount() }, (_, i) => i + 1).map(st => {
                const isActive = st === aktuellerSpieltag
                const info = spieltagInfo[st]
                const isLive = info?.isLive
                const fullyTipped = info?.fullyTipped

                let btnStyle = 'border-white/10 text-on-surface hover:bg-white/5'
                if (isActive) {
                  btnStyle = 'bg-primary-container text-on-primary border-primary-container shadow-[0_0_15px_rgba(251,191,36,0.4)] font-bold'
                } else if (st < aktuellerSpieltag) {
                  if (fullyTipped) {
                    btnStyle = 'border-green-500/30 text-green-400/90 bg-green-500/5 hover:bg-green-500/10'
                  } else {
                    btnStyle = 'border-amber-500/20 text-amber-500/60 bg-amber-500/5 opacity-60 hover:opacity-100 hover:bg-amber-500/10'
                  }
                }

                return (
                  <button
                    key={st}
                    data-st={st}
                    onClick={() => setSpieltag(st)}
                    className={`flex-shrink-0 px-3 py-2 rounded-full border text-[11px] font-mono font-medium transition-all relative flex items-center gap-1 ${btnStyle}`}
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

          {/* Filter-Toggle + Letztes Update Badge */}
          <div className="flex justify-between items-center py-2.5 border-t border-white/5">
            <div className="flex gap-2">
              {(['alle', 'live'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`text-[11px] font-mono font-medium uppercase tracking-wider px-3 py-1 rounded-full border transition-all ${
                    filter === f
                      ? 'bg-primary-container/20 border-primary-container/50 text-primary'
                      : 'border-white/10 text-on-surface-variant hover:border-white/20'
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
            <div className="px-4 py-3 bg-amber-500/5 border border-amber-500/20 rounded-xl flex items-center gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center">
                <Lock size={14} className="text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-mono font-bold uppercase tracking-wider text-amber-400/80 mb-0.5 whitespace-normal break-words">{t('tippingLocked')}</p>
                <p className="text-[11px] text-amber-400/50 font-mono whitespace-normal break-words leading-snug">
                  {t('tippingLockedDesc')}
                </p>
              </div>
            </div>
          )}

          {tippsFreigeschaltet && offeneTipps > 0 && (
            <div className="px-4 py-3 bg-amber-500/10 border border-amber-500/35 rounded-xl flex items-center gap-3 animate-glow-pulse">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-500/15 flex items-center justify-center">
                <span className="text-sm">⏳</span>
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-[11px] font-mono font-black uppercase tracking-wider text-amber-400 mb-0.5">{t('tipReminder')}</p>
                <p className="text-[11px] text-on-surface-variant font-mono">
                  {t('tipReminderDesc', { count: offeneTipps })}
                </p>
              </div>
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
                    return tournamentName === selectedTournament;
                  })
                  .map(([tournamentName, tourneyMatches]) => (
                  <div key={tournamentName} className="mb-6">
                    <h2 className="text-sm font-bold text-on-surface mb-4 border-b border-white/10 pb-2 uppercase tracking-wide">
                      {tournamentName === 'Süper Lig' ? (
                        <span className="flex items-center gap-2">
                          <img src={`${import.meta.env.BASE_URL}logos/Süper_Lig.png`} alt="SL" className="w-5 h-5 object-contain brightness-110 drop-shadow-[0_0_8px_rgba(255,255,255,0.6)]" />
                          {tournamentName}
                        </span>
                      ) : tournamentName === 'Champions League' ? (
                        <span className="flex items-center gap-2">
                          <img src={`${import.meta.env.BASE_URL}logos/UEFA_Champions_League_logo.png`} alt="CL" className="w-5 h-5 object-contain brightness-110 drop-shadow-[0_0_8px_rgba(255,255,255,0.6)]" />
                          {tournamentName}
                        </span>
                      ) : (
                        tournamentName
                      )}
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-4 xl:gap-6 w-full">
                      {tourneyMatches.map((match: Match) => {
                        const isSelected = selectedMatchId === match.id
                        return (
                          <div key={match.id} className="stagger-in">
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
                              className={isSelected && isDesktop ? 'border-primary/50 shadow-[0_0_15px_rgba(251,191,36,0.15)] bg-surface-container-high/60 scale-[1.01]' : ''}
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

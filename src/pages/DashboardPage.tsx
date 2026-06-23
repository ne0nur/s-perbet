import { useEffect, useState, useRef, useMemo } from 'react'
import { useMatchStore, type Match } from '../stores/matchStore'
import { useTipStore } from '../stores/tipStore'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { MatchCard } from '../components/MatchCard'
import { MatchDetailPanel } from '../components/MatchDetailPanel'
import { Lock, Check } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { TIPPS_FREIGESCHALTET } from '../config'

export function DashboardPage() {
  const { matches, aktuellerSpieltag, isLaden, setSpieltag, ladeMatches, initialisiereSpieltag, letztesUpdate, abonnierenRealtimeMatches } = useMatchStore()
  const ladeMeineTipps = useTipStore(s => s.ladeMeineTipps)
  const meineTipps = useTipStore(s => s.meineTipps)
  const getTippFuerMatch = useTipStore(s => s.getTippFuerMatch)
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [maxSpieltag, setMaxSpieltag] = useState(38)
  const [filter, setFilter] = useState<'alle' | 'live'>('alle')
  const [spieltagInfo, setSpieltagInfo] = useState<Record<number, { fullyTipped: boolean; isLive: boolean }>>({})
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null)
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
  }, [])

  useEffect(() => {
    ladeMatches(aktuellerSpieltag)
    ladeMeineTipps(aktuellerSpieltag)
  }, [aktuellerSpieltag])

  useEffect(() => {
    supabase.from('matches').select('spieltag').order('spieltag', { ascending: false }).limit(1)
      .then(({ data }) => { if (data?.length) setMaxSpieltag(data[0].spieltag) })
  }, [])

  // Auto-scroll zum aktuellen Spieltag
  useEffect(() => {
    if (!sliderRef.current) return
    const btn = sliderRef.current.querySelector(`[data-st="${aktuellerSpieltag}"]`) as HTMLElement | null
    if (btn) setTimeout(() => btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' }), 100)
  }, [aktuellerSpieltag, maxSpieltag])

  // Spieltag-Infos (live, fullyTipped) laden. Nur beim Start oder wenn sich der User ändert.
  useEffect(() => {
    if (!user) return
    ladeSpieltagInfos()
  }, [user])

  // Auto-select first match on desktop when matches list changes
  const anzeigeMatches = filter === 'live'
    ? matches.filter(m => m.status === 'live')
    : matches
  
  // Group matches by tournament
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

  async function ladeSpieltagInfos() {
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
          const st = (t.matches as any)?.spieltag
          if (st) {
            tipCounts[st] = (tipCounts[st] || 0) + 1
          }
        })
      }

      const infoMap: Record<number, { fullyTipped: boolean; isLive: boolean }> = {}
      const maxSt = matchesData ? Math.max(...matchesData.map(m => m.spieltag), 1) : 38
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
    }
  }

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
  }, [meineTipps, matches, aktuellerSpieltag])

  const spieltage = Array.from({ length: maxSpieltag }, (_, i) => i + 1)
  const offeneTipps = matches.filter(m => m.status === 'upcoming' && !getTippFuerMatch(m.id)).length

  return (
    <div className="min-h-full flex flex-col pb-24 md:pb-6">
      <header className="sticky top-16 md:top-0 z-30 bg-surface/60 backdrop-blur-xl shrink-0">
        <div className="max-w-[1600px] mx-auto w-full">
          {/* Spieltag-Slider */}
          <div className="px-4 pt-5 pb-3 border-b border-white/5 relative">
            <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
            <div ref={sliderRef} className="flex overflow-x-auto no-scrollbar gap-2 px-2 relative z-0">
              {spieltage.map(st => {
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
                    {st}. Spieltag
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

          {/* Filter-Toggle + Letztes Update Badge */}
          <div className="flex px-4 py-2 gap-2 justify-between items-center">
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
                  {f === 'alle' ? 'Alle' : 'Nur Live'}
                </button>
              ))}
            </div>
            
            {letztesUpdate && (
              <div className="flex items-center gap-1.2 px-2 py-0.5 rounded-full bg-white/5 border border-white/5 text-[9px] font-mono text-on-surface-variant/60 animate-pulse-slow">
                <span className="w-1.2 h-1.2 rounded-full bg-green-500 shrink-0" />
                <span>Live ({letztesUpdate})</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Banner: Tipps gesperrt */}
      {!TIPPS_FREIGESCHALTET && (
        <div className="mx-4 mt-3 px-4 py-3 bg-amber-500/5 border border-amber-500/20 rounded-xl flex items-center gap-3 max-w-[1600px] lg:mx-auto lg:w-full">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center">
            <Lock size={14} className="text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-mono font-bold uppercase tracking-wider text-amber-400/80 mb-0.5">Tippabgabe gesperrt</p>
            <p className="text-[11px] text-amber-400/50 font-mono">
              Freischaltung nach Veröffentlichung des offiziellen Spielplans 2026/27
            </p>
          </div>
        </div>
      )}

      {/* Banner: Tipp-Erinnerung */}
      {TIPPS_FREIGESCHALTET && offeneTipps > 0 && (
        <div className="mx-4 mt-3 px-4 py-3 bg-amber-500/10 border border-amber-500/35 rounded-xl flex items-center gap-3 animate-glow-pulse max-w-[1600px] lg:mx-auto lg:w-full">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-500/15 flex items-center justify-center">
            <span className="text-sm">⏳</span>
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-[11px] font-mono font-black uppercase tracking-wider text-amber-400 mb-0.5">Tipp-Erinnerung</p>
            <p className="text-[11px] text-on-surface-variant font-mono">
              Du hast noch <span className="text-amber-400 font-bold">{offeneTipps} ungetippte</span> {offeneTipps === 1 ? 'Spiel' : 'Spiele'} an diesem Spieltag. Rasiere den Wettschein, bevor es zu spät ist!
            </p>
          </div>
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
                <p className="text-on-surface-variant/50 text-sm font-mono">Keine Spiele</p>
                {filter === 'live' && (
                  <button onClick={() => setFilter('alle')} className="btn-secondary text-xs">
                    Alle Spiele anzeigen
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-8">
                {(Object.entries(matchesByTournament) as [string, Match[]][]).map(([tournamentName, tourneyMatches]) => (
                  <div key={tournamentName} className="mb-6">
                    <h2 className="text-sm font-bold text-on-surface mb-4 border-b border-white/10 pb-2 uppercase tracking-wide">
                      {tournamentName === 'Süper Lig' ? (
                        <span className="flex items-center gap-2">
                          <img src="/logos/Süper_Lig.png" alt="SL" className="w-5 h-5 object-contain brightness-110 drop-shadow-[0_0_8px_rgba(255,255,255,0.6)]" />
                          {tournamentName}
                        </span>
                      ) : tournamentName === 'Champions League' ? (
                        <span className="flex items-center gap-2">
                          <img src="/logos/UEFA_Champions_League_logo.png" alt="CL" className="w-5 h-5 object-contain brightness-110 drop-shadow-[0_0_8px_rgba(255,255,255,0.6)]" />
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

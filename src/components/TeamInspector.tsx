import { useEffect, useState, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Match } from '../stores/matchStore'
import { useTipStore } from '../stores/tipStore'
import { getTeamLogo } from '../lib/teamLogos'
import { Trophy, Calendar, Minus, Plus, Lock } from 'lucide-react'
import { useSettingsStore } from '../stores/settingsStore'

// Custom club branding gradients
const CLUB_GRADIENTS: Record<string, string> = {
  'Fenerbahçe': 'from-yellow-500/20 via-blue-900/10 to-blue-950/20 border-yellow-500/30',
  'Galatasaray': 'from-red-650/20 via-amber-500/10 to-amber-950/20 border-red-500/30',
  'Beşiktaş': 'from-neutral-600/25 via-neutral-800/15 to-neutral-950/20 border-neutral-500/30',
  'Trabzonspor': 'from-red-800/20 via-sky-500/10 to-sky-950/20 border-red-750/30',
  'Başakşehir': 'from-orange-600/15 via-blue-900/10 to-blue-950/20 border-orange-500/20',
  'Adana Demirspor': 'from-sky-400/15 via-blue-800/10 to-blue-900/20 border-sky-400/20',
  'Konyaspor': 'from-emerald-600/15 via-emerald-850/10 to-neutral-900/20 border-emerald-500/20',
  'Sivasspor': 'from-red-600/15 via-red-900/10 to-neutral-900/20 border-red-500/20',
  'Kayserispor': 'from-yellow-500/15 via-red-600/10 to-neutral-900/20 border-yellow-500/20',
  'Gaziantep FK': 'from-red-600/15 via-neutral-800/10 to-neutral-900/20 border-red-600/20',
  'Samsunspor': 'from-red-600/15 via-neutral-700/10 to-neutral-950/20 border-red-500/25',
  'Eyüpspor': 'from-purple-750/15 via-yellow-600/5 to-neutral-900/20 border-purple-500/20',
  'Göztepe': 'from-yellow-500/15 via-red-600/10 to-neutral-900/20 border-yellow-500/20',
}

function getClubGradient(team: string): string {
  return CLUB_GRADIENTS[team] || 'from-surface-container/30 to-background border-white/5'
}

function formatDatum(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' })
}

function formatUhrzeit(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
}

function Stepper({ value, onChange, disabled }: { value: number; onChange: (v: number) => void; disabled?: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={(e) => { e.stopPropagation(); onChange(Math.max(0, value - 1)) }}
        disabled={disabled || value === 0}
        className="w-7 h-7 rounded-full bg-surface-container-highest border border-surface-container-high flex items-center justify-center text-on-surface-variant hover:text-on-surface disabled:opacity-35 active:scale-90 transition-transform"
      >
        <Minus size={11} />
      </button>
      <span className="w-5 text-center font-mono text-sm font-bold text-on-surface tabular-nums">{value}</span>
      <button
        onClick={(e) => { e.stopPropagation(); onChange(Math.min(20, value + 1)) }}
        disabled={disabled || value === 20}
        className="w-7 h-7 rounded-full bg-surface-container-highest border border-surface-container-high flex items-center justify-center text-on-surface-variant hover:text-on-surface disabled:opacity-35 active:scale-90 transition-transform"
      >
        <Plus size={11} />
      </button>
    </div>
  )
}

interface TeamInspectorProps {
  teamName: string
  onClose?: () => void
}

export function TeamInspector({ teamName, onClose }: TeamInspectorProps) {
  const meineTipps = useTipStore(s => s.meineTipps)
  const tippSpeichern = useTipStore(s => s.tippSpeichern)
  const tippsFreigeschaltet = useSettingsStore(s => s.tippsFreigeschaltet)

  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)

  // Local Tipp Inputs for upcoming match
  const [tippHeim, setTippHeim] = useState(0)
  const [tippGast, setTippGast] = useState(0)
  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const ladeTeamMatches = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('matches')
        .select('*')
        .or(`heim_team.eq."${teamName}",gast_team.eq."${teamName}"`)
        .order('anpfiff', { ascending: true })

      if (data) {
        setMatches(data as Match[])
      }
    } catch (e) {
      console.error('Fehler beim Laden der Team-Matches:', e)
    } finally {
      setLoading(false)
    }
  }, [teamName])

  useEffect(() => {
    ladeTeamMatches()
  }, [ladeTeamMatches])

  // Derived Match lists
  const finished = matches.filter(m => m.status === 'finished')
  const last5 = finished.slice(-5).reverse() // Latest 5 results

  const upcoming = matches.filter(m => m.status === 'upcoming')
  const nextMatch = upcoming[0] // First upcoming match

  // Sync tipping input state when nextMatch or tips update
  const matchTip = nextMatch ? meineTipps.find(t => t.match_id === nextMatch.id) : null
  const tippIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (nextMatch) {
      if (matchTip) {
        setTippHeim(matchTip.tipp_heim)
        setTippGast(matchTip.tipp_gast)
      } else {
        setTippHeim(0)
        setTippGast(0)
      }
      tippIdRef.current = nextMatch.id
    }
  }, [nextMatch, matchTip])

  async function handleTippSpeichern() {
    if (!nextMatch || isSaving) return
    setIsSaving(true)
    try {
      await tippSpeichern(nextMatch.id, tippHeim, tippGast, nextMatch.spieltag)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e) {
      console.error('Tipp-Speicherfehler:', e)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className={`glass-card p-4 flex flex-col h-full bg-gradient-to-b ${getClubGradient(teamName)} transition-all duration-500`}>
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-4">
        <div className="flex items-center gap-2.5">
          <img src={getTeamLogo(teamName)} alt="" className="w-8 h-8 object-contain drop-shadow" />
          <h2 className="text-sm font-mono font-bold text-white uppercase tracking-wider">{teamName}</h2>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface text-xs font-mono">
            [X]
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-5 flex-1 overflow-y-auto">
          {/* Section: Next Fixture & Quick Tipp */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-on-surface-variant font-mono text-[9px] uppercase tracking-wider">
              <Calendar size={11} className="text-primary-fixed-dim" /> Nächstes Spiel
            </div>

            {nextMatch ? (
              <div className="bg-surface-container-low/60 border border-white/5 rounded-xl p-3.5 space-y-3">
                {/* Date / Kickoff */}
                <div className="text-center text-[10px] font-mono text-on-surface-variant/75 mb-1">
                  Spieltag {nextMatch.spieltag} · {formatDatum(nextMatch.anpfiff)} · {formatUhrzeit(nextMatch.anpfiff)}
                </div>

                {/* Score / Teams Row */}
                <div className="flex items-center justify-center gap-4">
                  <div className="flex flex-col items-center gap-1 w-20">
                    <img src={getTeamLogo(nextMatch.heim_team)} alt="" className="w-7 h-7 object-contain" />
                    <span className="text-[10px] font-mono font-bold text-center truncate w-full text-on-surface">{nextMatch.heim_team}</span>
                  </div>

                  <span className="font-mono text-xs text-on-surface-variant/40">VS</span>

                  <div className="flex flex-col items-center gap-1 w-20">
                    <img src={getTeamLogo(nextMatch.gast_team)} alt="" className="w-7 h-7 object-contain" />
                    <span className="text-[10px] font-mono font-bold text-center truncate w-full text-on-surface">{nextMatch.gast_team}</span>
                  </div>
                </div>

                {/* Quick Tipp Input */}
                <div className="border-t border-white/5 pt-2.5 mt-1.5 flex items-center justify-between gap-2">
                  {tippsFreigeschaltet ? (
                    <>
                      <Stepper value={tippHeim} onChange={setTippHeim} disabled={isSaving} />
                      <button
                        onClick={handleTippSpeichern}
                        disabled={isSaving}
                        className={`px-3 py-1.5 rounded-full text-[9px] font-mono font-bold uppercase tracking-wider transition-all border ${
                          saved
                            ? 'bg-green-500/20 border-green-500/40 text-green-400'
                            : 'bg-primary-container/15 border-primary-container/30 text-primary-fixed-dim hover:bg-primary-container/25'
                        }`}
                      >
                        {isSaving ? '...' : saved ? 'Tipp ok' : 'Tippen'}
                      </button>
                      <Stepper value={tippGast} onChange={setTippGast} disabled={isSaving} />
                    </>
                  ) : (
                    <div className="w-full flex items-center justify-center gap-1.5 text-[9px] text-amber-500/50 font-mono">
                      <Lock size={10} /> Tippabgabe gesperrt
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-4 text-xs font-mono text-on-surface-variant/40 bg-surface-container-low/40 rounded-xl">
                Keine weiteren anstehenden Spiele.
              </div>
            )}
          </div>

          {/* Section: Form / Last 5 Results */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-on-surface-variant font-mono text-[9px] uppercase tracking-wider">
              <Trophy size={11} className="text-primary-fixed-dim" /> Formkurve & Letzte Ergebnisse
            </div>

            {last5.length > 0 ? (
              <div className="space-y-1.5">
                {last5.map(m => {
                  const isHeim = m.heim_team === teamName
                  const opponent = isHeim ? m.gast_team : m.heim_team
                  const goalsFor = isHeim ? m.tore_heim : m.tore_gast
                  const goalsAgainst = isHeim ? m.tore_gast : m.tore_heim

                  let outcome: 'W' | 'D' | 'L' = 'D'
                  if (goalsFor != null && goalsAgainst != null) {
                    if (goalsFor > goalsAgainst) outcome = 'W'
                    else if (goalsFor < goalsAgainst) outcome = 'L'
                  }

                  const outcomeStyles = {
                    W: 'bg-green-500/25 border-green-500/45 text-green-300',
                    D: 'bg-slate-600/25 border-slate-600/45 text-slate-300',
                    L: 'bg-red-500/25 border-red-500/45 text-red-300',
                  }

                  return (
                    <div key={m.id} className="bg-surface-container-low/40 border border-white/5 rounded-lg px-2.5 py-1.5 flex items-center justify-between text-[11px] font-mono">
                      <div className="flex items-center gap-2">
                        <span className={`w-5 h-5 rounded-full border text-[9px] font-black flex items-center justify-center ${outcomeStyles[outcome]}`}>
                          {outcome === 'W' ? 'S' : outcome === 'L' ? 'N' : 'U'}
                        </span>
                        <span className="text-on-surface-variant">vs</span>
                        <span className="font-medium text-on-surface truncate max-w-[100px]">{opponent}</span>
                      </div>
                      <span className="font-bold text-on-surface">
                        {m.tore_heim}:{m.tore_gast}
                      </span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-4 text-xs font-mono text-on-surface-variant/40 bg-surface-container-low/40 rounded-xl">
                Noch keine Ergebnisse in dieser Saison.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

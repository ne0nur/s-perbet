import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Loader2 } from 'lucide-react'

interface MatchEvent {
  type: 'goal' | 'penalty' | 'yellow_card' | 'red_card' | 'phase'
  minute: string
  team: string
  player: string
  text: string
}

const ESPN_LEAGUE_MAP: Record<string, string> = {
  'Süper Lig': 'tur.1',
  'Champions League': 'uefa.champions',
  'World Cup 2026': 'fifa.world',
}

function getLeagueCode(tournament: string): string {
  return ESPN_LEAGUE_MAP[tournament] || 'tur.1'
}

function mapEspnType(typeId: string, typeText: string, shortText: string): MatchEvent['type'] | null {
  const t = (typeText || '').toLowerCase()
  if (t.startsWith('goal') || t.startsWith('own goal')) return 'goal'
  if (t.includes('penalty')) return 'penalty'
  if (t.includes('yellow')) return 'yellow_card'
  if (t.includes('red')) return 'red_card'
  return null
}

function getPhaseLabel(typeText: string): string | null {
  const t = (typeText || '').toLowerCase()
  if (t.includes('kickoff')) return 'Anpfiff'
  if (t.includes('halftime') && !t.includes('extra')) return 'Halbzeit'
  if (t.includes('end regular') || t.includes('end match')) return 'Ende'
  if (t.includes('start extra')) return 'Verlängerung'
  if (t.includes('end extra')) return 'Ende n.V.'
  if (t.includes('start shootout')) return 'Elfmeterschießen'
  return null // 2. Halbzeit, Halbzeit n.V., 2. Halbzeit n.V. → raus
}

export function MatchEvents({ espnId, tournament, isOpen }: {
  espnId: string; tournament: string; isOpen: boolean
}) {
  const [events, setEvents] = useState<MatchEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [teams, setTeams] = useState({ home: '', away: '' })

  useEffect(() => {
    if (!isOpen || !espnId || events.length > 0) return
    const fetchEvents = async () => {
      setLoading(true)
      try {
        const code = getLeagueCode(tournament)
        const res = await fetch(
          `https://site.api.espn.com/apis/site/v2/sports/soccer/${code}/summary?event=${espnId}`
        )
        if (!res.ok) { setError(true); setLoading(false); return }
        const data = await res.json()

        // Get home/away team names for score tracking
        const comp = data.header?.competitions?.[0]
        const homeTeam = comp?.competitors?.find((c: any) => c.homeAway === 'home')?.team?.displayName || ''
        const awayTeam = comp?.competitors?.find((c: any) => c.homeAway === 'away')?.team?.displayName || ''

        const parsed: MatchEvent[] = []

        for (const ev of data.keyEvents || []) {
          const eventType = mapEspnType(
            String(ev.type?.id || ''),
            ev.type?.text || ev.type?.type || '',
            ev.shortText || ''
          )
          const phaseLabel = getPhaseLabel(ev.type?.text || ev.type?.type || '')

          if (eventType) {
            parsed.push({
              type: eventType,
              minute: ev.clock?.displayValue || '',
              team: ev.team?.displayName || '',
              player: ev.participants?.[0]?.athlete?.displayName || '',
              text: ev.shortText || ev.text || '',
            })
          } else if (phaseLabel) {
            parsed.push({
              type: 'phase',
              minute: ev.clock?.displayValue || '',
              team: '',
              player: '',
              text: phaseLabel,
            })
          }
        }

        for (const c of data.header?.competitions?.[0]?.cards || []) {
          for (const detail of c.details || []) {
            parsed.push({
              type: c.label === 'Red Card' ? 'red_card' : 'yellow_card',
              minute: detail.clock?.displayValue || '',
              team: c.team?.displayName || '',
              player: detail.athlete?.displayName || '',
              text: detail.label || '',
            })
          }
        }

        // Penalty shootout falls vorhanden
        for (const team of data.shootout || []) {
          for (const shot of team.shots || []) {
            parsed.push({
              type: shot.didScore ? 'penalty' : 'penalty',
              minute: 'Elfm.',
              team: team.team || '',
              player: shot.player || '',
              text: shot.didScore ? 'Verwandelt' : 'Verschossen',
            })
          }
        }

        parsed.sort((a, b) => (parseInt(a.minute) || 0) - (parseInt(b.minute) || 0))
        setEvents(parsed)
        setTeams({ home: homeTeam, away: awayTeam })
      } catch { setError(true) }
      setLoading(false)
    }
    fetchEvents()
  }, [isOpen, espnId, tournament])

  if (!isOpen) return null
  if (!espnId) return <p className="text-[10px] text-slate-600 py-2 text-center">Keine Event-Daten</p>

  return (
    <div className="mt-3 border-t border-white/5 pt-3">
      {loading && (
        <div className="flex items-center justify-center gap-2 py-4 text-slate-500 text-xs">
          <Loader2 size={14} className="animate-spin" />
          Events werden geladen…
        </div>
      )}
      {error && <p className="text-[11px] text-slate-600 py-3 text-center">Events nicht verfügbar</p>}
      {!loading && !error && events.length === 0 && (
        <p className="text-[11px] text-slate-600 py-3 text-center">Noch keine Ereignisse</p>
      )}

      {!loading && events.length > 0 && (
        <div className="relative py-1">
          {/* Center line */}
          <div className="absolute left-1/2 top-1 bottom-1 w-px bg-white/[0.06] -translate-x-px" />

          <div className="space-y-1">
            {events.map((ev, i) => {
              // Phase marker: minute + label on the line
              if (ev.type === 'phase') {
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="relative flex items-center gap-2 py-2"
                  >
                    <div className="flex-1 h-px bg-white/[0.05]" />
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {ev.minute && <span className="text-[10px] font-mono text-slate-600 tabular-nums">{ev.minute}'</span>}
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.15em]">{ev.text}</span>
                    </div>
                    <div className="flex-1 h-px bg-white/[0.05]" />
                  </motion.div>
                )
              }

              const isLeft = i % 2 === 0
              const isGoal = ev.type === 'goal' || ev.type === 'penalty'
              const icon = isGoal ? '⚽' : ev.type === 'red_card' ? '🟥' : '🟨'

              // Running score
              let scoreText = ''
              if (isGoal && teams.home) {
                const prev = events.slice(0, i).filter(e => e.type === 'goal' || e.type === 'penalty')
                const hg = prev.filter(e => e.team === teams.home).length + (ev.team === teams.home ? 1 : 0)
                const ag = prev.filter(e => e.team === teams.away).length + (ev.team === teams.away ? 1 : 0)
                scoreText = `${hg}:${ag}`
              }

              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.04, 0.5) }}
                  className={`flex items-center gap-3 py-1 ${isLeft ? '' : 'flex-row-reverse'}`}
                >
                  {/* Score badge (only for goals, in center) */}
                  {scoreText ? (
                    <div className="flex-shrink-0 w-12 text-center">
                      <span className="inline-flex items-center justify-center w-10 h-6 rounded-md bg-white/[0.06] border border-white/[0.08] text-[13px] font-extrabold font-mono text-white/90 tracking-tight tabular-nums">
                        {scoreText}
                      </span>
                    </div>
                  ) : (
                    <div className="flex-shrink-0 w-12 text-center">
                      <span className="text-[10px] font-mono text-slate-600 tabular-nums">{ev.minute}'</span>
                    </div>
                  )}

                  {/* Player + icon */}
                  <div className={`flex-1 min-w-0 ${isLeft ? 'text-right' : 'text-left'}`}>
                    <div className={`flex items-center gap-2 ${isLeft ? 'justify-end' : 'justify-start'}`}>
                      {isLeft ? (
                        <>
                          <span className={`text-[13px] font-semibold truncate ${
                            isGoal ? 'text-white' : ev.type === 'red_card' ? 'text-red-300' : 'text-amber-300'
                          }`}>{ev.player || ev.text}</span>
                          <span className="text-sm flex-shrink-0">{icon}</span>
                          <span className={`text-[10px] font-mono tabular-nums flex-shrink-0 ${
                            isGoal ? 'text-emerald-500/70' : ev.type === 'red_card' ? 'text-red-500/70' : 'text-amber-500/70'
                          }`}>{ev.minute}'</span>
                        </>
                      ) : (
                        <>
                          <span className={`text-[10px] font-mono tabular-nums flex-shrink-0 ${
                            isGoal ? 'text-emerald-500/70' : ev.type === 'red_card' ? 'text-red-500/70' : 'text-amber-500/70'
                          }`}>{ev.minute}'</span>
                          <span className="text-sm flex-shrink-0">{icon}</span>
                          <span className={`text-[13px] font-semibold truncate ${
                            isGoal ? 'text-white' : ev.type === 'red_card' ? 'text-red-300' : 'text-amber-300'
                          }`}>{ev.player || ev.text}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Empty side */}
                  <div className="w-12 flex-shrink-0" />
                </motion.div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export function MatchEventsToggle({ espnId, tournament }: {
  espnId?: string | null; tournament: string
}) {
  const [open, setOpen] = useState(false)
  if (!espnId) return null

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-[10px] text-slate-500 hover:text-slate-300 transition-colors font-mono uppercase tracking-wider py-1"
      >
        <span>{open ? 'Details schließen' : 'Spiel-Details'}</span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown size={12} />
        </motion.span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <MatchEvents espnId={espnId} tournament={tournament} isOpen={open} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

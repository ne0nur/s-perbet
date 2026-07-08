import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Loader2 } from 'lucide-react'

interface MatchEvent {
  type: 'goal' | 'penalty' | 'yellow_card' | 'red_card'
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

export function MatchEvents({ espnId, tournament, isOpen }: {
  espnId: string; tournament: string; isOpen: boolean
}) {
  const [events, setEvents] = useState<MatchEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

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
        const parsed: MatchEvent[] = []

        for (const ev of data.keyEvents || []) {
          const eventType = mapEspnType(
            String(ev.type?.id || ''),
            ev.type?.text || ev.type?.type || '',
            ev.shortText || ''
          )
          if (!eventType) continue
          parsed.push({
            type: eventType,
            minute: ev.clock?.displayValue || '',
            team: ev.team?.displayName || '',
            player: ev.participants?.[0]?.athlete?.displayName || '',
            text: ev.shortText || ev.text || '',
          })
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

          <div className="space-y-1.5">
            {events.map((ev, i) => {
              const isLeft = i % 2 === 0
              const isGoal = ev.type === 'goal' || ev.type === 'penalty'
              const icon = isGoal ? '⚽' : ev.type === 'red_card' ? '🟥' : '🟨'

              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: isLeft ? -6 : 6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(i * 0.03, 0.4) }}
                  className="flex items-center"
                >
                  {/* Left side: icon + name + minute */}
                  {isLeft ? (
                    <>
                      <div className="w-[calc(50%-16px)] text-right pr-3">
                        <span className={`text-xs ${
                          isGoal ? 'text-slate-200' :
                          ev.type === 'red_card' ? 'text-red-300' : 'text-amber-300'
                        }`}>
                          <span className="mr-1">{icon}</span>
                          <span className="font-medium">{ev.player || ev.text}</span>
                          <span className={`ml-2 text-[10px] font-mono tabular-nums ${
                            isGoal ? 'text-emerald-500' :
                            ev.type === 'red_card' ? 'text-red-500' : 'text-amber-500'
                          }`}>{ev.minute}'</span>
                        </span>
                      </div>
                      <div className="w-[32px] flex-shrink-0 flex justify-center z-10">
                        <div className={`w-2 h-2 rounded-full ${
                          isGoal ? 'bg-emerald-500/60' :
                          ev.type === 'red_card' ? 'bg-red-500/60' : 'bg-amber-500/60'
                        }`} />
                      </div>
                      <div className="flex-1" />
                    </>
                  ) : (
                    <>
                      <div className="flex-1" />
                      <div className="w-[32px] flex-shrink-0 flex justify-center z-10">
                        <div className={`w-2 h-2 rounded-full ${
                          isGoal ? 'bg-emerald-500/60' :
                          ev.type === 'red_card' ? 'bg-red-500/60' : 'bg-amber-500/60'
                        }`} />
                      </div>
                      <div className="w-[calc(50%-16px)] text-left pl-3">
                        <span className={`text-xs ${
                          isGoal ? 'text-slate-200' :
                          ev.type === 'red_card' ? 'text-red-300' : 'text-amber-300'
                        }`}>
                          <span className={`mr-2 text-[10px] font-mono tabular-nums ${
                            isGoal ? 'text-emerald-500' :
                            ev.type === 'red_card' ? 'text-red-500' : 'text-amber-500'
                          }`}>{ev.minute}'</span>
                          <span className="mr-1">{icon}</span>
                          <span className="font-medium">{ev.player || ev.text}</span>
                        </span>
                      </div>
                    </>
                  )}
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

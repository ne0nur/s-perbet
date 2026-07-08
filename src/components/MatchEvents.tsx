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

function mapEspnType(typeId: string): MatchEvent['type'] | null {
  if (typeId === '28') return 'penalty'     // penalty goal
  if (typeId === '70') return 'goal'         // normal goal
  if (typeId === '24') return 'goal'         // own goal (show as goal)
  if (typeId === '94') return 'yellow_card'
  if (typeId === '95') return 'red_card'
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
          const eventType = mapEspnType(String(ev.type?.id || ''))
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
        <div className="relative max-h-[320px] overflow-y-auto py-1">
          {/* Center line */}
          <div className="absolute left-1/2 top-2 bottom-2 w-px bg-white/[0.08] -translate-x-px" />

          <div className="space-y-2">
            {events.map((ev, i) => {
              const isLeft = i % 2 === 0
              const isGoal = ev.type === 'goal' || ev.type === 'penalty'
              const isCard = ev.type === 'yellow_card' || ev.type === 'red_card'

              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: isLeft ? -8 : 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(i * 0.04, 0.5) }}
                  className={`flex items-start gap-0 ${isLeft ? '' : 'flex-row-reverse'}`}
                >
                  {/* Left/Right content */}
                  <div className="w-[calc(50%-12px)]" />

                  {/* Center: dot + minute */}
                  <div className="relative flex flex-col items-center flex-shrink-0 z-10">
                    <div className={`w-3 h-3 rounded-full border-2 ${
                      isGoal ? 'bg-emerald-500/30 border-emerald-500' :
                      ev.type === 'red_card' ? 'bg-red-500/30 border-red-500' :
                      'bg-amber-500/30 border-amber-400'
                    }`} />
                    <span className={`text-[10px] font-bold font-mono mt-2 tabular-nums whitespace-nowrap ${
                      isGoal ? 'text-emerald-400' : ev.type === 'red_card' ? 'text-red-400' : 'text-amber-400'
                    }`}>
                      {ev.minute}'
                    </span>
                    {isGoal && <span className="text-[15px] mt-0.5">⚽</span>}
                    {isCard && (
                      <span className={`text-[13px] mt-0.5 ${ev.type === 'red_card' ? '' : ''}`}>
                        {ev.type === 'red_card' ? '🟥' : '🟨'}
                      </span>
                    )}
                  </div>

                  {/* Right/Left content */}
                  <div className={`w-[calc(50%-12px)] ${isLeft ? 'pl-3' : 'pr-3 text-right'}`}>
                    <div className={`inline-block rounded-lg px-3 py-2 max-w-full ${
                      isGoal && !isLeft ? 'bg-emerald-500/[0.06] border border-emerald-500/[0.10]' :
                      isGoal && isLeft ? 'bg-emerald-500/[0.06] border border-emerald-500/[0.10]' :
                      ev.type === 'red_card' ? 'bg-red-500/[0.05] border border-red-500/[0.10]' :
                      'bg-amber-500/[0.04] border border-amber-500/[0.08]'
                    }`}>
                      <p className="text-[13px] text-white font-medium leading-snug">
                        {ev.player || ev.text}
                      </p>
                      <div className={`flex items-center gap-2 mt-1 ${isLeft ? '' : 'justify-end'}`}>
                        <span className={`text-[10px] px-1.5 py-0 rounded font-bold uppercase tracking-wider ${
                          ev.type === 'penalty' ? 'bg-emerald-500/15 text-emerald-300' :
                          isGoal ? 'bg-emerald-500/15 text-emerald-300' :
                          ev.type === 'red_card' ? 'bg-red-500/15 text-red-300' :
                          'bg-amber-500/15 text-amber-300'
                        }`}>
                          {ev.type === 'penalty' ? 'Elfmeter' : ev.type === 'goal' ? 'Tor' : ev.type === 'red_card' ? 'Rot' : 'Gelb'}
                        </span>
                        <span className="text-[10px] text-slate-600 font-mono">{ev.team}</span>
                      </div>
                    </div>
                  </div>
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
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <MatchEvents espnId={espnId} tournament={tournament} isOpen={open} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

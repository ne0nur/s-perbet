import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Loader2 } from 'lucide-react'

interface MatchEvent {
  type: 'goal' | 'yellow_card' | 'red_card'
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
  if (['70', '28', '24'].includes(typeId)) return 'goal'
  if (['94'].includes(typeId)) return 'yellow_card'
  if (['95'].includes(typeId)) return 'red_card'
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
        <div className="relative pl-5 max-h-[320px] overflow-y-auto">
          {/* Timeline line */}
          <div className="absolute left-[15px] top-2 bottom-2 w-px bg-white/[0.06]" />

          <div className="space-y-3">
            {events.map((ev, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(i * 0.04, 0.5) }}
                className="relative"
              >
                {/* Timeline dot */}
                <div className={`absolute left-[-20px] top-1.5 w-2.5 h-2.5 rounded-full border-2 flex-shrink-0 ${
                  ev.type === 'goal'
                    ? 'bg-emerald-500/30 border-emerald-500'
                    : ev.type === 'red_card'
                    ? 'bg-red-500/30 border-red-500'
                    : 'bg-amber-500/30 border-amber-400'
                }`} />

                {/* Card */}
                <div className={`rounded-lg px-3 py-2 ${
                  ev.type === 'goal'
                    ? 'bg-emerald-500/[0.04] border border-emerald-500/[0.08]'
                    : ev.type === 'red_card'
                    ? 'bg-red-500/[0.04] border border-red-500/[0.08]'
                    : 'bg-amber-500/[0.03] border border-amber-500/[0.06]'
                }`}>
                  {/* Top row: minute + badge */}
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-xs font-bold font-mono tabular-nums ${
                      ev.type === 'goal' ? 'text-emerald-400' : ev.type === 'red_card' ? 'text-red-400' : 'text-amber-400'
                    }`}>
                      {ev.minute}'
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                      ev.type === 'goal'
                        ? 'bg-emerald-500/15 text-emerald-300'
                        : ev.type === 'red_card'
                        ? 'bg-red-500/15 text-red-300'
                        : 'bg-amber-500/15 text-amber-300'
                    }`}>
                      {ev.type === 'goal' ? 'Tor' : ev.type === 'red_card' ? 'Rot' : 'Gelb'}
                    </span>
                  </div>

                  {/* Player name */}
                  <p className="text-[13px] text-white font-medium leading-snug">
                    {ev.player || ev.text}
                  </p>

                  {/* Team */}
                  {ev.team && (
                    <p className="text-[10px] text-slate-500 mt-0.5 font-mono">{ev.team}</p>
                  )}
                </div>
              </motion.div>
            ))}
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

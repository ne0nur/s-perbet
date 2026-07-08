import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Loader2 } from 'lucide-react'

interface MatchEvent {
  type: 'goal' | 'sub' | 'card' | 'halftime' | 'fulltime'
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

// Map ESPN event type IDs to our event types
function mapEspnType(typeId: string): MatchEvent['type'] | null {
  const goalTypes = ['70', '28', '24'] // goal, penalty goal, own goal
  const subType = '76'
  const cardTypes = ['79', '80', '83', '84'] // yellow, second yellow, red
  const halftimeTypes = ['21', '22'] // end of period / halftime
  const fulltimeTypes = ['23'] // end of game
  
  if (goalTypes.includes(typeId)) return 'goal'
  if (typeId === subType) return 'sub'
  if (cardTypes.includes(typeId)) return 'card'
  if (halftimeTypes.includes(typeId)) return 'halftime'
  if (fulltimeTypes.includes(typeId)) return 'fulltime'
  return null
}

const eventLabels: Record<string, string> = {
  goal: '⚽',
  sub: '🔄',
  card: '🟨',
  halftime: '☕',
  fulltime: '🏁',
}

export function MatchEvents({ espnId, tournament, isOpen }: { espnId: string; tournament: string; isOpen: boolean }) {
  const [events, setEvents] = useState<MatchEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!isOpen || !espnId || events.length > 0) return

    const fetchEvents = async () => {
      setLoading(true)
      try {
        const code = getLeagueCode(tournament)
        const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/${code}/summary?event=${espnId}`)
        if (!res.ok) { setError(true); setLoading(false); return }
        const data = await res.json()

        const parsed: MatchEvent[] = []
        
        // keyEvents contains ALL events: goals, subs, cards, kickoff, delays, etc.
        for (const ev of data.keyEvents || []) {
          const typeId = String(ev.type?.id || '')
          const eventType = mapEspnType(typeId)
          if (!eventType) continue // skip noise (kickoff, delays, etc.)

          parsed.push({
            type: eventType,
            minute: ev.clock?.displayValue || '',
            team: ev.team?.displayName || '',
            player: ev.participants?.[0]?.athlete?.displayName || '',
            text: ev.shortText || ev.text || '',
          })
        }

        // Also check header.competitions[0].cards for bookings
        const cards = data.header?.competitions?.[0]?.cards || []
        for (const c of cards) {
          for (const detail of c.details || []) {
            parsed.push({
              type: 'card',
              minute: detail.clock?.displayValue || '',
              team: c.team?.displayName || '',
              player: detail.athlete?.displayName || '',
              text: detail.label || detail.text || 'Karte',
            })
          }
        }

        // Sort by minute
        parsed.sort((a, b) => {
          const aNum = parseInt(a.minute.replace(/[^0-9]/g, '')) || 0
          const bNum = parseInt(b.minute.replace(/[^0-9]/g, '')) || 0
          return aNum - bNum
        })

        setEvents(parsed)
      } catch { setError(true) }
      setLoading(false)
    }

    fetchEvents()
  }, [isOpen, espnId, tournament])

  if (!isOpen) return null
  if (!espnId) return <p className="text-[10px] text-slate-600 py-2 text-center">Keine Event-Daten</p>

  return (
    <div className="mt-2 border-t border-white/5 pt-2">
      {loading && (
        <div className="flex items-center justify-center gap-2 py-3 text-slate-500 text-xs">
          <Loader2 size={13} className="animate-spin" />
          Events werden geladen…
        </div>
      )}

      {error && (
        <p className="text-[10px] text-slate-600 py-2 text-center">Events nicht verfügbar</p>
      )}

      {!loading && !error && events.length === 0 && (
        <p className="text-[10px] text-slate-600 py-2 text-center">Noch keine Ereignisse</p>
      )}

      {!loading && events.length > 0 && (
        <div className="space-y-0 max-h-[280px] overflow-y-auto">
          {events.map((ev, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: Math.min(i * 0.03, 0.6) }}
              className="flex items-start gap-2 px-1 py-1 border-b border-white/[0.03] last:border-0"
            >
              {/* Minute */}
              <span className="text-[10px] font-mono text-slate-500 flex-shrink-0 w-10 text-right tabular-nums">
                {ev.minute}
              </span>

              {/* Icon */}
              <span className="flex-shrink-0 text-[11px]">
                {eventLabels[ev.type] || '•'}
              </span>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-slate-300 leading-tight">
                  {ev.text || ev.player}
                </p>
                {ev.player && ev.type === 'goal' && (
                  <p className="text-[9px] text-slate-500 mt-0.5 truncate">{ev.player}</p>
                )}
              </div>

              {/* Team badge */}
              {ev.team && (
                <span className="text-[9px] text-slate-600 flex-shrink-0 font-medium">
                  {ev.team}
                </span>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}

export function MatchEventsToggle({ espnId, tournament }: { espnId?: string | null; tournament: string }) {
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

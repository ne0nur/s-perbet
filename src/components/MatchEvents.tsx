import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Clock, Loader2 } from 'lucide-react'

interface MatchEvent {
  type: 'goal' | 'card_yellow' | 'card_red' | 'sub' | 'penalty'
  minute: string
  team: string
  player: string
  assist?: string
  description: string
}

const ESPN_LEAGUE_MAP: Record<string, string> = {
  'Süper Lig': 'tur.1',
  'Champions League': 'uefa.champions',
  'World Cup 2026': 'fifa.world',
}

function getLeagueCode(tournament: string): string {
  return ESPN_LEAGUE_MAP[tournament] || 'tur.1'
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
        if (!res.ok) { setError(true); return }
        const data = await res.json()

        const parsed: MatchEvent[] = []

        // Goals
        for (const g of data.scoringPlays || []) {
          parsed.push({
            type: 'goal',
            minute: g.period?.displayValue || '',
            team: g.team?.abbreviation || '',
            player: g.athletesInvolved?.[0]?.displayName || '',
            assist: g.athletesInvolved?.[1]?.displayName || undefined,
            description: g.text || '',
          })
        }

        // Cards
        for (const c of data.cards || []) {
          const isRed = c.type?.name === 'Red Card' || c.label === 'Red Card'
          parsed.push({
            type: isRed ? 'card_red' : 'card_yellow',
            minute: c.period?.displayValue || '',
            team: c.team?.abbreviation || '',
            player: c.athlete?.displayName || '',
            description: c.text || '',
          })
        }

        // Sort by minute
        parsed.sort((a, b) => {
          const aNum = parseInt(a.minute) || 0
          const bNum = parseInt(b.minute) || 0
          return aNum - bNum
        })

        setEvents(parsed)
      } catch { setError(true) }
      setLoading(false)
    }

    fetchEvents()
  }, [isOpen, espnId, tournament])

  if (!isOpen) return null
  if (!espnId) return <p className="text-[10px] text-slate-600 py-2 text-center">Keine Event-Daten verfügbar</p>

  return (
    <div className="mt-3 border-t border-white/5 pt-3">
      {loading && (
        <div className="flex items-center justify-center gap-2 py-3 text-slate-500 text-xs">
          <Loader2 size={13} className="animate-spin" />
          Events werden geladen…
        </div>
      )}

      {error && (
        <p className="text-[10px] text-slate-600 py-2 text-center">Events konnten nicht geladen werden</p>
      )}

      {!loading && !error && events.length === 0 && (
        <p className="text-[10px] text-slate-600 py-2 text-center">Noch keine Ereignisse</p>
      )}

      {!loading && events.length > 0 && (
        <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
          {events.map((ev, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className="flex items-start gap-2.5 px-1 py-1"
            >
              {/* Icon */}
              <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold ${
                ev.type === 'goal' ? 'bg-emerald-500/20 text-emerald-400' :
                ev.type === 'card_red' ? 'bg-red-500/20 text-red-400' :
                ev.type === 'card_yellow' ? 'bg-amber-500/20 text-amber-400' :
                'bg-slate-500/20 text-slate-400'
              }`}>
                {ev.type === 'goal' ? '⚽' : ev.type === 'card_red' ? '🟥' : ev.type === 'card_yellow' ? '🟨' : '🔄'}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono text-slate-500 flex-shrink-0">{ev.minute}'</span>
                  <span className="text-[11px] text-slate-300 truncate">
                    {ev.player}
                    {ev.assist && <span className="text-slate-500"> ({ev.assist})</span>}
                  </span>
                </div>
                <p className="text-[9px] text-slate-600 truncate mt-0.5">{ev.description}</p>
              </div>
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
        <span>{open ? 'Weniger Details' : 'Mehr Details'}</span>
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

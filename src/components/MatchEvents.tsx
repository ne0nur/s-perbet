import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Loader2 } from 'lucide-react'

// ─── Types ───────────────────────────────────────
interface MatchEvent {
  type: 'goal' | 'yellow_card' | 'red_card' | 'sub' | 'halftime'
  minute: string
  team: string
  player: string
  text: string
}

// ─── ESPN League Map ─────────────────────────────
const ESPN_LEAGUE_MAP: Record<string, string> = {
  'Süper Lig': 'tur.1',
  'Champions League': 'uefa.champions',
  'World Cup 2026': 'fifa.world',
}

function getLeagueCode(tournament: string): string {
  return ESPN_LEAGUE_MAP[tournament] || 'tur.1'
}

// ─── ESPN Type-ID → Event Type ───────────────────
function mapEspnType(typeId: string): MatchEvent['type'] | null {
  const goalIds = ['70', '28', '24']        // goal, penalty goal, own goal
  const yellowIds = ['94']                    // yellow card
  const redIds = ['95']                       // red card
  const subIds = ['76']                       // substitution
  const halftimeIds = ['81', '21', '22']      // halftime

  if (goalIds.includes(typeId)) return 'goal'
  if (yellowIds.includes(typeId)) return 'yellow_card'
  if (redIds.includes(typeId)) return 'red_card'
  if (subIds.includes(typeId)) return 'sub'
  if (halftimeIds.includes(typeId)) return 'halftime'
  return null
}

// ─── Component ──────────────────────────────────
export function MatchEvents({ espnId, tournament, isOpen }: {
  espnId: string
  tournament: string
  isOpen: boolean
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
          const typeId = String(ev.type?.id || '')
          const eventType = mapEspnType(typeId)
          if (!eventType) continue

          parsed.push({
            type: eventType,
            minute: ev.clock?.displayValue || (ev.period?.number ? `${ev.period.number}.HZ` : ''),
            team: ev.team?.displayName || '',
            player: ev.participants?.[0]?.athlete?.displayName || '',
            text: ev.shortText || ev.text || '',
          })
        }

        // Cards from header
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

  // Group events
  const goals = events.filter(e => e.type === 'goal')
  const cards = events.filter(e => e.type === 'yellow_card' || e.type === 'red_card')
  const subs = events.filter(e => e.type === 'sub')

  const hasContent = goals.length > 0 || cards.length > 0 || subs.length > 0

  return (
    <div className="mt-3 border-t border-white/5 pt-3">
      {loading && (
        <div className="flex items-center justify-center gap-2 py-4 text-slate-500 text-xs">
          <Loader2 size={14} className="animate-spin" />
          Events werden geladen…
        </div>
      )}

      {error && <p className="text-[11px] text-slate-600 py-3 text-center">Events nicht verfügbar</p>}

      {!loading && !error && !hasContent && (
        <p className="text-[11px] text-slate-600 py-3 text-center">Noch keine Ereignisse</p>
      )}

      {!loading && hasContent && (
        <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
          {/* ─── Tore ─── */}
          {goals.length > 0 && (
            <div>
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                <span className="w-1 h-3 rounded-full bg-emerald-500/60" />
                Tore
              </h4>
              <div className="space-y-1">
                {goals.map((g, i) => (
                  <motion.div
                    key={`g-${i}`}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-3 pl-3 py-1.5 rounded-md bg-emerald-500/[0.03] border border-emerald-500/[0.06]"
                  >
                    <span className="w-9 text-right text-[13px] font-bold font-mono text-emerald-400 tabular-nums flex-shrink-0">
                      {g.minute}'
                    </span>
                    <span className="text-[13px] text-white font-medium flex-1 min-w-0 truncate">
                      {g.player}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono flex-shrink-0">
                      {g.team}
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* ─── Karten ─── */}
          {cards.length > 0 && (
            <div>
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                <span className={`w-1 h-3 rounded-full ${cards.some(c => c.type === 'red_card') ? 'bg-red-500/60' : 'bg-amber-500/60'}`} />
                Karten
              </h4>
              <div className="space-y-1">
                {cards.map((c, i) => (
                  <motion.div
                    key={`c-${i}`}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={`flex items-center gap-3 pl-3 py-1.5 rounded-md border ${
                      c.type === 'red_card'
                        ? 'bg-red-500/[0.04] border-red-500/[0.08]'
                        : 'bg-amber-500/[0.03] border-amber-500/[0.06]'
                    }`}
                  >
                    <span className="w-9 text-right text-[13px] font-bold font-mono tabular-nums flex-shrink-0"
                      style={{ color: c.type === 'red_card' ? '#f87171' : '#fbbf24' }}>
                      {c.minute}'
                    </span>
                    <div className={`w-2.5 h-3.5 rounded-sm flex-shrink-0 ${
                      c.type === 'red_card' ? 'bg-red-500' : 'bg-amber-400'
                    }`} />
                    <span className="text-[12px] text-slate-200 font-medium flex-1 min-w-0 truncate">
                      {c.player}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono flex-shrink-0">
                      {c.team}
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* ─── Auswechslungen ─── */}
          {subs.length > 0 && (
            <div>
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                <span className="w-1 h-3 rounded-full bg-slate-500/60" />
                Wechsel
              </h4>
              <div className="space-y-0.5 pl-3">
                {subs.map((s, i) => (
                  <motion.div
                    key={`s-${i}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className="flex items-center gap-3 py-1 text-[11px] text-slate-500"
                  >
                    <span className="w-9 text-right font-mono text-[10px] flex-shrink-0 tabular-nums">
                      {s.minute}'
                    </span>
                    <span className="text-slate-400 flex-1 min-w-0 truncate">{s.text}</span>
                    <span className="text-[10px] text-slate-600 flex-shrink-0">{s.team}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Toggle ──────────────────────────────────────
export function MatchEventsToggle({ espnId, tournament }: {
  espnId?: string | null
  tournament: string
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

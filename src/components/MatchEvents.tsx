import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Loader2 } from 'lucide-react'
import { useTranslation } from '../utils/translations'

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
  if (t.includes('kickoff')) return 'phaseKickoff'
  if (t.includes('halftime') && !t.includes('extra')) return 'phaseHalftime'
  if (t.includes('end regular') || t.includes('end match')) return 'phaseEnd'
  if (t.includes('start extra')) return 'phaseExtra'
  if (t.includes('end extra')) return 'phaseEndExtra'
  if (t.includes('start shootout')) return 'phaseShootout'
  return null // 2. Halbzeit, Halbzeit n.V. etc. -> raus
}

export function MatchEvents({ espnId, tournament, isOpen }: {
  espnId: string; tournament: string; isOpen: boolean
}) {
  const { t } = useTranslation()
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

        // Penalty shootout
        for (const team of data.shootout || []) {
          for (const shot of team.shots || []) {
            parsed.push({
              type: 'penalty',
              minute: 'Elfm.',
              team: team.team || '',
              player: shot.player || '',
              text: shot.didScore ? 'penaltyScored' : 'penaltyMissed',
            })
          }
        }

        // Sort events chronologically (shootouts at the end)
        parsed.sort((a, b) => {
          const getMinVal = (m: string | null | undefined) => {
            if (!m) return 0
            if (m === 'Elfm.') return 999
            const cleaned = String(m).replace(/'/g, '')
            if (cleaned.includes('+')) {
              const parts = cleaned.split('+')
              const base = parseInt(parts[0]) || 0
              const ext = parseInt(parts[1]) || 0
              return base + ext / 100
            }
            return parseInt(cleaned) || 0
          }
          return getMinVal(a.minute) - getMinVal(b.minute)
        })

        setEvents(parsed)
        setTeams({ home: homeTeam, away: awayTeam })
      } catch { setError(true) }
      setLoading(false)
    }
    fetchEvents()
  }, [isOpen, espnId, tournament])

  if (!isOpen) return null
  if (!espnId) return <p className="text-[10px] text-slate-600 py-2 text-center">{t('noEventData')}</p>

  const GoalBadge = () => (
    <span className="text-[13px] filter drop-shadow-[0_0_4px_rgba(255,255,255,0.4)] flex-shrink-0 select-none">⚽</span>
  )

  const MissedBadge = () => (
    <span className="text-xs text-red-500 font-extrabold flex-shrink-0 drop-shadow-[0_0_4px_rgba(239,68,68,0.4)] select-none">❌</span>
  )

  return (
    <div className="mt-3 border-t border-white/5 pt-3">
      {loading && (
        <div className="flex items-center justify-center gap-2 py-4 text-slate-500 text-xs">
          <Loader2 size={14} className="animate-spin" />
          {t('loadingEvents')}
        </div>
      )}
      {error && <p className="text-[11px] text-slate-600 py-3 text-center">{t('eventsUnavailable')}</p>}
      {!loading && !error && events.length === 0 && (
        <p className="text-[11px] text-slate-600 py-3 text-center">{t('noEvents')}</p>
      )}

      {!loading && events.length > 0 && (
        <div className="relative py-2">
          {/* Center line */}
          <div className="absolute left-1/2 top-1 bottom-1 w-px bg-white/[0.08] -translate-x-[0.5px]" />

          <div className="space-y-2">
            {events.map((ev, i) => {
              // Phase marker: Centered horizontal badge
              if (ev.type === 'phase') {
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.03, 0.4) }}
                    className="relative flex justify-center py-2 w-full"
                  >
                    <span className="relative z-10 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/90 border border-slate-700/80 text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] font-mono shadow-[0_2px_8px_rgba(0,0,0,0.3)] backdrop-blur-sm">
                      {t(ev.text)} {ev.minute && ev.minute !== 'Elfm.' && `(${ev.minute}')`}
                    </span>
                  </motion.div>
                )
              }

              // Check if team is Home or Away using robust matching
              const isHome = ev.team && teams.home && (
                ev.team.toLowerCase().trim() === teams.home.toLowerCase().trim() ||
                teams.home.toLowerCase().includes(ev.team.toLowerCase().trim()) ||
                ev.team.toLowerCase().includes(teams.home.toLowerCase().trim())
              )

              const isAway = ev.team && teams.away && (
                ev.team.toLowerCase().trim() === teams.away.toLowerCase().trim() ||
                teams.away.toLowerCase().includes(ev.team.toLowerCase().trim()) ||
                ev.team.toLowerCase().includes(teams.away.toLowerCase().trim())
              )

              // Align to left (Home) or right (Away)
              const isLeft = isHome ? true : (isAway ? false : (i % 2 === 0))

              const isGoal = ev.type === 'goal' || (ev.type === 'penalty' && ev.text !== 'penaltyMissed')
              const isMissedPenalty = ev.type === 'penalty' && ev.text === 'penaltyMissed'

              // Running score for goals
              let scoreText = ''
              if (isGoal && teams.home) {
                const prev = events.slice(0, i).filter(e => e.type === 'goal' || (e.type === 'penalty' && e.text !== 'penaltyMissed'))
                const hg = prev.filter(e => {
                  return e.team && teams.home && (
                    e.team.toLowerCase().trim() === teams.home.toLowerCase().trim() ||
                    teams.home.toLowerCase().includes(e.team.toLowerCase().trim()) ||
                    e.team.toLowerCase().includes(teams.home.toLowerCase().trim())
                  )
                }).length + (isHome ? 1 : 0)

                const ag = prev.filter(e => {
                  return e.team && teams.away && (
                    e.team.toLowerCase().trim() === teams.away.toLowerCase().trim() ||
                    teams.away.toLowerCase().includes(e.team.toLowerCase().trim()) ||
                    e.team.toLowerCase().includes(teams.away.toLowerCase().trim())
                  )
                }).length + (isAway ? 1 : 0)

                scoreText = `${hg}:${ag}`
              }

              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.04, 0.5) }}
                  className="flex items-center w-full min-h-[32px]"
                >
                  {/* Left Column (Home events) */}
                  <div className="w-[calc(50%-20px)] flex justify-end items-center pr-3 min-w-0">
                    {isLeft && (
                      <div className="flex items-center gap-2 justify-end min-w-0">
                        {isGoal && scoreText && (
                          <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-extrabold font-mono text-emerald-400 tracking-tight tabular-nums flex-shrink-0">
                            {scoreText}
                          </span>
                        )}
                        {isMissedPenalty && (
                          <span className="text-[10px] font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 rounded font-mono uppercase tracking-wider flex-shrink-0">
                            {t('penaltyMissed')}
                          </span>
                        )}
                        {ev.type === 'penalty' && ev.text === 'penaltyScored' && (
                          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded font-mono uppercase tracking-wider flex-shrink-0">
                            {t('penaltyScored')}
                          </span>
                        )}
                        <span className={`text-[12px] font-semibold truncate ${
                          isGoal ? 'text-white' : ev.type === 'red_card' ? 'text-red-300' : ev.type === 'yellow_card' ? 'text-amber-200' : 'text-slate-300'
                        }`} title={ev.player || ev.text}>
                          {ev.player || (ev.text.includes('penalty') ? '' : ev.text)}
                        </span>
                        {isGoal && <GoalBadge />}
                        {isMissedPenalty && <MissedBadge />}
                        {ev.type === 'yellow_card' && (
                          <div className="w-2.5 h-3.5 rounded-[2px] bg-amber-400 border border-amber-300/30 shadow-[0_0_8px_rgba(245,158,11,0.5)] flex-shrink-0" />
                        )}
                        {ev.type === 'red_card' && (
                          <div className="w-2.5 h-3.5 rounded-[2px] bg-red-500 border border-red-400/30 shadow-[0_0_8px_rgba(239,68,68,0.5)] flex-shrink-0" />
                        )}
                      </div>
                    )}
                  </div>

                  {/* Center Column (Timeline node / Minute) */}
                  <div className="w-[40px] flex-shrink-0 flex justify-center z-10">
                    <span className={`inline-flex items-center justify-center min-w-[28px] h-[20px] px-1 rounded-full border text-[9px] font-mono font-bold tabular-nums shadow-[0_2px_6px_rgba(0,0,0,0.2)] backdrop-blur-sm ${
                      isGoal
                        ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.25)]'
                        : isMissedPenalty || ev.type === 'red_card'
                          ? 'bg-red-950/90 border-red-500/40 text-red-400 shadow-[0_0_8px_rgba(239,68,68,0.25)]'
                          : ev.type === 'yellow_card'
                            ? 'bg-amber-950/90 border-amber-500/40 text-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.25)]'
                            : 'bg-slate-800/90 border-slate-700/80 text-slate-400'
                    }`}>
                      {ev.minute === 'Elfm.' ? 'Elfm.' : `${ev.minute}'`}
                    </span>
                  </div>

                  {/* Right Column (Away events) */}
                  <div className="w-[calc(50%-20px)] flex justify-start items-center pl-3 min-w-0">
                    {!isLeft && (
                      <div className="flex items-center gap-2 justify-start min-w-0">
                        {ev.type === 'yellow_card' && (
                          <div className="w-2.5 h-3.5 rounded-[2px] bg-amber-400 border border-amber-300/30 shadow-[0_0_8px_rgba(245,158,11,0.5)] flex-shrink-0" />
                        )}
                        {ev.type === 'red_card' && (
                          <div className="w-2.5 h-3.5 rounded-[2px] bg-red-500 border border-red-400/30 shadow-[0_0_8px_rgba(239,68,68,0.5)] flex-shrink-0" />
                        )}
                        {isGoal && <GoalBadge />}
                        {isMissedPenalty && <MissedBadge />}
                        <span className={`text-[12px] font-semibold truncate ${
                          isGoal ? 'text-white' : ev.type === 'red_card' ? 'text-red-300' : ev.type === 'yellow_card' ? 'text-amber-200' : 'text-slate-300'
                        }`} title={ev.player || ev.text}>
                          {ev.player || (ev.text.includes('penalty') ? '' : ev.text)}
                        </span>
                        {isGoal && scoreText && (
                          <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-extrabold font-mono text-emerald-400 tracking-tight tabular-nums flex-shrink-0">
                            {scoreText}
                          </span>
                        )}
                        {isMissedPenalty && (
                          <span className="text-[10px] font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 rounded font-mono uppercase tracking-wider flex-shrink-0">
                            {t('penaltyMissed')}
                          </span>
                        )}
                        {ev.type === 'penalty' && ev.text === 'penaltyScored' && (
                          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded font-mono uppercase tracking-wider flex-shrink-0">
                            {t('penaltyScored')}
                          </span>
                        )}
                      </div>
                    )}
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
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  if (!espnId) return null

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-[10px] text-slate-500 hover:text-slate-300 transition-colors font-mono uppercase tracking-wider py-1 cursor-pointer"
      >
        <span>{open ? t('detailsClose') : t('matchDetails')}</span>
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

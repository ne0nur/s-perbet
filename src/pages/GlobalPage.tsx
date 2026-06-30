import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useMatchStore } from '../stores/matchStore'
import { getTeamLogo } from '../lib/teamLogos'
import { Trophy, Users, BarChart2, Gift, Award, Crown, Medal, Target } from 'lucide-react'
import { motion } from 'framer-motion'
import { getLevelBadgeStyle, calculateLevel } from '../lib/utils'
import { LevelBadge } from '../components/ui/LevelBadge'
import { evaluateAchievements, type TipDetails } from '../utils/achievementEvaluator'
import { RivalInspector } from '../components/RivalInspector'
import { AvatarLightbox } from '../components/AvatarLightbox'
import { useTranslation } from '../utils/translations'
import { getCached, setCache, CACHE_KEYS } from '../lib/cache'
import { useToastStore } from '../stores/toastStore'

interface RanglisteEintrag {
  id: string
  username: string
  avatar_url: string | null
  gesamt_punkte: number
  exakte_treffer: number
  achievements_count?: number
  is_admin?: boolean
  trend?: number
  displayRank?: string
}

interface BonusStat {
  team: string
  votes: number
  percentage: number
}

interface BonusQuestionStats {
  fragenId: number
  title: string  // generierter Titel
  stats: BonusStat[]
}

// Mappt frage_id → Turnier-Name + Index (für Titel-Generierung)
// SL: 1-3, CL: 4-6, neue Turniere: 100+
function getTournamentForFrageId(fragenId: number): { tournament: string; questionIndex: number } {
  if (fragenId >= 1 && fragenId <= 3) return { tournament: 'Süper Lig', questionIndex: fragenId - 1 }
  if (fragenId >= 4 && fragenId <= 6) return { tournament: 'Champions League', questionIndex: fragenId - 4 }
  // Neue Turniere: 100+ (tIndex * 3 + base)
  const base = fragenId - 100
  const tIndex = Math.floor(base / 3)
  const qIndex = base % 3
  return { tournament: `Turnier ${tIndex + 3}`, questionIndex: qIndex }
}

// ─── Sub-Component Leaderboard ────────────────────────
function LeaderboardSection({
  rangliste,
  top3,
  rest,
  navigate,
  onSelectUser,
  selectedUserId,
  isDesktop,
}: {
  rangliste: RanglisteEintrag[]
  top3: RanglisteEintrag[]
  rest: Array<RanglisteEintrag & { displayRank: string }>
  navigate: ReturnType<typeof useNavigate>
  onSelectUser?: (id: string) => void
  selectedUserId?: string | null
  isDesktop?: boolean
}) {
  const { t } = useTranslation()
  const handleUserClick = (userId: string) => {
    if (isDesktop && onSelectUser) {
      onSelectUser(userId)
    } else {
      navigate(`/analyse/${userId}`)
    }
  }

  // Tie-Erkennung für Podium
  const tie1_2 = top3[0] && top3[1] && top3[0].gesamt_punkte === top3[1].gesamt_punkte
  const tie2_3 = top3[1] && top3[2] && top3[1].gesamt_punkte === top3[2].gesamt_punkte

  return (
    <div className="space-y-4">
      {/* Podium */}
      {top3.length > 0 && (
        <div className="flex items-end justify-center gap-2 mb-6">
          {/* Silber (2.) — teilt sich ggf. Platz 1 mit Gold */}
          {top3[1] && (
            <motion.div 
              initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} transition={{delay: 0.1}}
              onClick={() => handleUserClick(top3[1]?.id)}
              className={`flex flex-col items-center gap-1 flex-1 cursor-pointer p-1.5 rounded-xl border transition-all ${
                selectedUserId === top3[1]?.id && isDesktop
                  ? 'bg-primary-container/10 border-primary/40 shadow'
                  : 'border-transparent hover:bg-white/5'
              }`}
            >
              <div className={`flex items-center justify-center rounded-full mb-1 ${
                tie1_2
                  ? 'w-12 h-12 bg-gradient-to-br from-yellow-300 via-amber-400 to-yellow-600 shadow-[0_0_15px_rgba(var(--primary-rgb),0.6)]'
                  : 'w-8 h-8 bg-gradient-to-br from-slate-200 to-slate-400 shadow-[0_0_10px_rgba(148,163,184,0.5)]'
              }`}>
                {tie1_2 ? <Crown size={24} className="text-yellow-900" /> : <Medal size={16} className="text-slate-700" />}
              </div>
              <AvatarLightbox src={top3[1]?.avatar_url} username={top3[1]?.username || ''} size="sm" showLevel levelBadge={
                <LevelBadge level={calculateLevel(top3[1]?.gesamt_punkte || 0, top3[1]?.achievements_count || 0)} className="absolute -top-1 -right-1 z-10 text-[7px] h-3.5 w-3.5 rounded-full shadow select-none">
                  {calculateLevel(top3[1]?.gesamt_punkte || 0, top3[1]?.achievements_count || 0)}
                </LevelBadge>
              } />
              <span className="text-[8px] text-on-surface-variant font-mono truncate w-full text-center mt-2">
                {top3[1]?.username}
                {top3[1]?.is_admin && <span className="ml-1 inline-flex shrink-0 px-1 py-0.5 rounded text-[7px] font-black bg-amber-500/20 text-amber-400 border border-amber-500/30 font-mono tracking-wide scale-90">ADM</span>}
              </span>
              <div className={`w-full rounded-t-lg border-x border-t flex flex-col items-center justify-start pt-2 relative overflow-hidden ${
                tie1_2
                  ? 'h-24 bg-gradient-to-t from-primary/30 to-transparent border-primary/40'
                  : 'h-16 bg-gradient-to-t from-slate-400/20 to-transparent border-slate-400/30'
              }`}>
                <div className="absolute inset-0 bg-surface-container-low/50 backdrop-blur-[2px] -z-10" />
                <span className="text-xs font-bold font-mono text-on-surface">{top3[1]?.gesamt_punkte}</span>
                <span className="text-[8px] font-mono text-on-surface-variant">{t('tableHeaderPoints')}</span>
              </div>
            </motion.div>
          )}
          {/* Gold (1.) */}
          <motion.div 
            initial={{opacity:0, y:30}} animate={{opacity:1, y:0}}
            onClick={() => handleUserClick(top3[0]?.id)}
            className={`flex flex-col items-center gap-1 flex-1 cursor-pointer p-1.5 rounded-xl border transition-all ${
              selectedUserId === top3[0]?.id && isDesktop
                ? 'bg-primary-container/15 border-primary/50 shadow-[0_0_15px_rgba(var(--primary-rgb),0.15)]'
                : 'border-transparent hover:bg-white/5'
            }`}
          >
            <div className="w-12 h-12 flex items-center justify-center bg-gradient-to-br from-yellow-300 via-amber-400 to-yellow-600 rounded-full shadow-[0_0_15px_rgba(var(--primary-rgb),0.6)] mb-1">
              <Crown size={24} className="text-yellow-900" />
            </div>
            <AvatarLightbox src={top3[0]?.avatar_url} username={top3[0]?.username || ''} size="md" showLevel levelBadge={
              <LevelBadge level={calculateLevel(top3[0]?.gesamt_punkte || 0, top3[0]?.achievements_count || 0)} className="absolute -top-1 -right-1 z-10 text-[8px] h-4 w-4 rounded-full shadow select-none">
                {calculateLevel(top3[0]?.gesamt_punkte || 0, top3[0]?.achievements_count || 0)}
              </LevelBadge>
            } />
            <span className="text-[9px] text-primary-fixed-dim font-mono font-bold truncate w-full text-center mt-2">
              {top3[0]?.username}
              {top3[0]?.trend !== undefined && top3[0]?.trend !== 0 && (
                <span className={`ml-1 text-[7px] font-bold ${top3[0].trend > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {top3[0].trend > 0 ? '▲' : '▼'}{Math.abs(top3[0].trend)}
                </span>
              )}
              {top3[0]?.is_admin && <span className="ml-1 inline-flex shrink-0 px-1 py-0.5 rounded text-[7px] font-black bg-amber-500/20 text-amber-400 border border-amber-500/30 font-mono tracking-wide">ADM</span>}
            </span>
            <div className="w-full h-24 bg-gradient-to-t from-primary/30 to-transparent rounded-t-lg border-x border-t border-primary/40 flex flex-col items-center justify-start pt-2 relative overflow-hidden">
              <div className="absolute inset-0 bg-surface-container-low/30 backdrop-blur-[2px] -z-10" />
              <span className="text-sm font-bold font-mono text-primary-fixed-dim">{top3[0]?.gesamt_punkte}</span>
              <span className="text-[8px] font-mono text-primary-fixed-dim/60">{t('tableHeaderPoints')}</span>
            </div>
          </motion.div>
          {/* Bronze (3.) — teilt sich ggf. Platz 2 mit Silber */}
          {top3[2] && (
            <motion.div 
              initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} transition={{delay: 0.2}}
              onClick={() => handleUserClick(top3[2]?.id)}
              className={`flex flex-col items-center gap-1 flex-1 cursor-pointer p-1.5 rounded-xl border transition-all ${
                selectedUserId === top3[2]?.id && isDesktop
                  ? 'bg-primary-container/10 border-primary/40 shadow'
                  : 'border-transparent hover:bg-white/5'
              }`}
            >
              <div className={`flex items-center justify-center rounded-full mb-1 ${
                tie2_3
                  ? 'w-8 h-8 bg-gradient-to-br from-slate-200 to-slate-400 shadow-[0_0_10px_rgba(148,163,184,0.5)]'
                  : 'w-8 h-8 bg-gradient-to-br from-amber-600 to-amber-800 shadow-[0_0_10px_rgba(217,119,6,0.5)]'
              }`}>
                {tie2_3 ? <Medal size={16} className="text-slate-700" /> : <Medal size={16} className="text-amber-900" />}
              </div>
              <AvatarLightbox src={top3[2]?.avatar_url} username={top3[2]?.username || ''} size="sm" showLevel levelBadge={
                <LevelBadge level={calculateLevel(top3[2]?.gesamt_punkte || 0, top3[2]?.achievements_count || 0)} className="absolute -top-1 -right-1 z-10 text-[7px] h-3.5 w-3.5 rounded-full shadow select-none">
                  {calculateLevel(top3[2]?.gesamt_punkte || 0, top3[2]?.achievements_count || 0)}
                </LevelBadge>
              } />
              <span className="text-[9px] text-on-surface-variant font-mono truncate w-full text-center flex items-center justify-center gap-1">
                {top3[2]?.username}
                {top3[2]?.trend !== undefined && top3[2]?.trend !== 0 && (
                  <span className={`text-[7px] font-bold ${top3[2].trend > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {top3[2].trend > 0 ? '▲' : '▼'}{Math.abs(top3[2].trend)}
                  </span>
                )}
                {top3[2]?.is_admin && <span className="inline-flex shrink-0 px-1 py-0.2 rounded text-[7px] font-black bg-amber-500/20 text-amber-400 border border-amber-500/30 font-mono tracking-wide scale-90">ADM</span>}
              </span>
              <div className={`w-full rounded-t-lg border-x border-t flex flex-col items-center justify-start pt-2 relative overflow-hidden ${
                tie2_3
                  ? 'h-16 bg-gradient-to-t from-slate-400/20 to-transparent border-slate-400/30'
                  : 'h-12 bg-gradient-to-t from-amber-700/20 to-transparent border-amber-700/30'
              }`}>
                <div className="absolute inset-0 bg-surface-container-low/50 backdrop-blur-[2px] -z-10" />
                <span className="text-xs font-bold font-mono text-on-surface">{top3[2]?.gesamt_punkte}</span>
                <span className="text-[8px] font-mono text-on-surface-variant">{t('tableHeaderPoints')}</span>
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* Restliche Plätze */}
      {rest.length > 0 && (
        <div className="bg-surface-container-low border border-surface-container-high rounded-xl overflow-hidden shadow-sm">
          {rest.map((e, i) => {
            const isSelected = selectedUserId === e.id && isDesktop
            return (
              <div
                key={e.id}
                onClick={() => handleUserClick(e.id)}
                className={`flex items-center gap-3 px-3.5 py-3 cursor-pointer transition-all duration-200 hover:bg-white/[0.03] border-b border-surface-container-high last:border-0 border-l-2 ${
                  isSelected ? 'bg-primary-container/12 border-l-primary-container font-bold shadow-[inset_3px_0_0_var(--primary)]' : i % 2 === 0 ? 'border-l-transparent' : 'bg-surface-container-lowest border-l-transparent'
                } hover:border-l-white/20`}
              >
                <span className="w-6 flex flex-col items-center justify-center gap-0.5 font-mono text-on-surface-variant">
                  <span className="text-[11px]">{e.displayRank}</span>
                  {e.trend !== undefined && e.trend !== 0 && (
                    <span className={`text-[8px] font-bold ${e.trend > 0 ? 'text-emerald-400' : 'text-red-400'} animate-bounce`}>
                      {e.trend > 0 ? '▲' : '▼'} {Math.abs(e.trend)}
                    </span>
                  )}
                  {e.trend === 0 && (
                    <span className="text-[8px] font-bold text-on-surface-variant/30">—</span>
                  )}
                </span>
                <AvatarLightbox
                  src={e.avatar_url}
                  username={e.username || ''}
                  size="md"
                  showLevel={true}
                  className="!mr-2" // Etwas Abstand für das überstehende Badge
                  levelBadge={
                    <LevelBadge level={calculateLevel(e.gesamt_punkte, e.achievements_count || 0)} className="absolute -bottom-1 -right-1 z-10 text-[8px] h-3.5 w-3.5 rounded-full shadow shadow-black/80 select-none level-digit border border-surface-container-low">
                      {calculateLevel(e.gesamt_punkte, e.achievements_count || 0)}
                    </LevelBadge>
                  }
                />
                <span className="flex-1 text-sm text-on-surface truncate font-semibold flex items-center gap-1.5">
                  {e.username}
                  {e.is_admin && (
                    <span className="inline-flex px-1.5 py-0.5 rounded text-[8px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 font-mono uppercase tracking-wider">{t('admin')}</span>
                  )}
                </span>
                <span className="font-mono text-sm text-on-surface font-bold shrink-0">{e.gesamt_punkte} {t('pointsShort')}</span>
                {e.exakte_treffer > 0 && (
                  <div className="flex items-center gap-1 shrink-0 bg-primary-container/20 px-2 py-0.5 rounded-full border border-primary/20">
                    <Target size={10} className="text-primary-fixed-dim" />
                    <span className="font-mono text-[10px] text-primary-fixed-dim font-bold">{e.exakte_treffer}</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {rangliste.length === 0 && (
        <p className="text-on-surface-variant/40 text-center py-12 text-sm font-mono bg-surface-container-low border border-surface-container-high rounded-xl">{t('noPlayers')}</p>
      )}
    </div>
  )
}

// ─── Sub-Component Statistics ──────────────────────────
function StatsSection({
  totalUsers,
  totalTips,
  avgPoints,
  remainingPoints,
  bonusStatsByTournament,
}: {
  totalUsers: number
  totalTips: number
  avgPoints: number
  remainingPoints: number
  bonusStatsByTournament: Record<string, BonusQuestionStats[]>
}) {
  const { t } = useTranslation()
  const tournamentNames = Object.keys(bonusStatsByTournament)
  const [activeStatTournament, setActiveStatTournament] = useState<string>('')

  // Aktives Turnier initialisieren
  useEffect(() => {
    if (tournamentNames.length > 0 && !activeStatTournament) {
      setActiveStatTournament(tournamentNames[0])
    }
  }, [tournamentNames, activeStatTournament])

  const activeTournamentStats = bonusStatsByTournament[activeStatTournament] || []

  return (
    <div className="space-y-4">
      {/* Erklärungstext für neue User */}
      <div className="bg-primary-container/10 border border-primary-container/20 rounded-xl p-4 mb-2">
        <h2 className="text-primary font-bold text-sm mb-1.5 flex items-center gap-2">
          <BarChart2 size={16} /> {t('whatAreStats')}
        </h2>
        <p className="text-on-surface-variant text-xs leading-relaxed">
          {t('statsExplain')}
        </p>
      </div>

      {/* Global Numbers Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <div className="bg-surface-container-low border border-surface-container-high rounded-xl p-3 text-center shadow-sm">
          <Users className="text-blue-400 mx-auto mb-1.5" size={20} />
          <div className="font-mono text-base font-black text-on-surface">{totalUsers}</div>
          <div className="font-mono text-[8px] text-on-surface-variant uppercase tracking-wider">{t('totalPlayers')}</div>
        </div>
        <div className="bg-surface-container-low border border-surface-container-high rounded-xl p-3 text-center shadow-sm">
          <Gift className="text-emerald-400 mx-auto mb-1.5" size={20} />
          <div className="font-mono text-base font-black text-on-surface">{totalTips}</div>
          <div className="font-mono text-[8px] text-on-surface-variant uppercase tracking-wider">{t('totalTips')}</div>
        </div>
        <div className="bg-surface-container-low border border-surface-container-high rounded-xl p-3 text-center shadow-sm">
          <Trophy className="text-amber-400 mx-auto mb-1.5" size={20} />
          <div className="font-mono text-base font-black text-on-surface">{avgPoints}</div>
          <div className="font-mono text-[8px] text-on-surface-variant uppercase tracking-wider">{t('avgPoints')}</div>
        </div>
        <div className="bg-surface-container-low border border-surface-container-high rounded-xl p-3 text-center shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-1">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
          </div>
          <BarChart2 className="text-primary-fixed-dim mx-auto mb-1.5" size={20} />
          <div className="font-mono text-base font-black text-primary">{remainingPoints}</div>
          <div className="font-mono text-[8px] text-primary-fixed-dim uppercase tracking-wider">{t('maxRemaining')}</div>
        </div>
      </div>

      {/* Community Vote Stats — dynamisch per Turnier */}
      <div className="pt-4">
        <h2 className="text-sm font-bold text-on-surface mb-1">{t('prognosisTitle')}</h2>
        <p className="text-[11px] text-on-surface-variant mb-4 leading-relaxed">
          {t('prognosisDesc')}
        </p>

        {/* Turnier-Tabs (nur wenn > 1 Turnier) */}
        {tournamentNames.length > 1 && (
          <div className="flex bg-surface-container/50 border border-white/5 p-0.5 rounded-xl mb-4 gap-1 overflow-x-auto no-scrollbar">
            {tournamentNames.map(tName => (
              <button
                key={tName}
                type="button"
                onClick={() => setActiveStatTournament(tName)}
                className={`flex-1 min-w-[80px] py-1.5 rounded-lg text-[9px] xs:text-[10px] font-mono font-black uppercase tracking-wider transition-all duration-200 cursor-pointer text-center whitespace-nowrap ${
                  activeStatTournament === tName
                    ? 'bg-primary-container text-on-primary-container shadow-[0_1.5px_6px_rgba(var(--primary-rgb),0.1)] border border-primary/25 scale-[1.01]'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-white/5 border border-transparent'
                }`}
              >
                {tName}
              </button>
            ))}
          </div>
        )}

        {/* Fragen des aktiven Turniers */}
        <div className="space-y-4">
          {activeTournamentStats.length === 0 ? (
            <p className="text-xs text-on-surface-variant/40 font-mono text-center py-4">{t('noPrognosis')}</p>
          ) : (
            activeTournamentStats.map((q, qi) => {
              const barColors = [
                'bg-gradient-to-r from-amber-500 to-yellow-400',
                'bg-emerald-500/80',
                'bg-purple-500/80',
              ]
              const barColor = barColors[qi % barColors.length]
              return (
                <div key={q.fragenId} className="bg-surface-container-low border border-surface-container-high rounded-xl p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <BarChart2 size={16} className="text-primary-fixed-dim" />
                    <h3 className="text-xs font-mono font-bold text-on-surface-variant uppercase tracking-wider">{q.title}</h3>
                  </div>
                  <div className="space-y-3">
                    {q.stats.length > 0 ? (
                      q.stats.slice(0, 5).map((item, index) => {
                        const logoUrl = getTeamLogo(item.team)
                        const isFirst = index === 0
                        return (
                          <div key={item.team} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-1.5 min-w-0">
                                {logoUrl && (
                                  <img src={logoUrl} alt="" className="w-5 h-5 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                                )}
                                <span className={`truncate text-xs ${isFirst ? 'text-primary-fixed-dim font-bold' : 'text-on-surface'}`}>
                                  {item.team}
                                </span>
                              </div>
                              <span className="font-mono text-[10px] text-on-surface-variant/80">{item.percentage}% ({item.votes}x)</span>
                            </div>
                            <div className="h-2 w-full bg-surface-container-highest rounded-full overflow-hidden p-[1px] border border-surface-container-high">
                              <div
                                className={`h-full rounded-full transition-all duration-1000 ${
                                  isFirst ? `${barColor} shadow-[0_0_8px_rgba(var(--primary-rgb),0.25)]` : 'bg-blue-500/50'
                                }`}
                                style={{ width: `${item.percentage}%` }}
                              />
                            </div>
                          </div>
                        )
                      })
                    ) : (
                      <p className="text-xs text-on-surface-variant/40 font-mono text-center py-4">{t('noPrognosis')}</p>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Hauptkomponente ──────────────────────────────────
export function GlobalPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'rangliste' | 'stats'>('rangliste')
  const [desktopRightTab, setDesktopRightTab] = useState<'analyse' | 'stats'>('analyse')
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024)
  
  // Leaderboard data
  const [rangliste, setRangliste] = useState<RanglisteEintrag[]>([])
  
  // Global stats
  const [totalUsers, setTotalUsers] = useState(0)
  const [totalTips, setTotalTips] = useState(0)
  const [avgPoints, setAvgPoints] = useState(0)
  const [remainingPoints, setRemainingPoints] = useState(0)
  
  // Bonus stats — dynamisch nach Turnier gruppiert
  const [bonusStatsByTournament, setBonusStatsByTournament] = useState<Record<string, BonusQuestionStats[]>>({})
  
  const [isLaden, setIsLaden] = useState(true)

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  interface TipWithMatch {
    id: string
    tipp_heim: number
    tipp_gast: number
    punkte: number
    created_at: string
    updated_at: string
    matches: {
      id: string
      spieltag: number
      status: string
      heim_team: string
      gast_team: string
      anpfiff: string
      tore_heim: number | null
      tore_gast: number | null
      tournament?: string
    } | null
  }

  const ladeGlobalDaten = useCallback(async () => {
    setIsLaden(true)
    try {
      const seasonKey = useMatchStore.getState().aktuelleSaison || 2026

      // Cache-Check: Leaderboard (teuerste Query — 2 DB-Calls)
      const cachedRangliste = getCached<RanglisteEintrag[]>(CACHE_KEYS.leaderboard(seasonKey))
      let rangData: RanglisteEintrag[] | null = null

      if (cachedRangliste) {
        setRangliste(cachedRangliste)
        rangData = cachedRangliste
        // Stats & Bonus trotzdem live laden (sind billiger)
      } else {
        // 1. Leaderboard (Versuche RPC für Trend-Pfeile)
        let rawRangData: any[] | null = null
        try {
          const { data, error } = await supabase.rpc('get_ranking_with_trend')
          if (!error && data) {
            rawRangData = data
          }
        } catch (e) {
          // ignore
        }

        // Fallback wenn RPC (noch) nicht existiert
        if (!rawRangData) {
          const { data: fallbackData } = await supabase
            .from('profiles')
            .select('id,username,avatar_url,gesamt_punkte,exakte_treffer,is_admin,achievements_count')
            .order('gesamt_punkte', { ascending: false })
            .order('exakte_treffer', { ascending: false })
            .limit(50)
          
          if (fallbackData) {
            rawRangData = fallbackData.map((d: any) => ({ ...d, trend: 0 }))
          }
        }

        if (rawRangData && rawRangData.length > 0) {
          // Calculate standard competition ranking
          let currentRank = 1
          for (let i = 0; i < rawRangData.length; i++) {
            if (i > 0 && rawRangData[i].gesamt_punkte < rawRangData[i-1].gesamt_punkte) {
              currentRank = i + 1
            }
            const isTie = i > 0 && rawRangData[i].gesamt_punkte === rawRangData[i-1].gesamt_punkte
            rawRangData[i]._rank = currentRank
            rawRangData[i]._displayRank = isTie ? '–' : `#${currentRank}`
          }

          rangData = rawRangData.map((userEntry: any) => {
            return {
              id: userEntry.id,
              username: userEntry.username,
              avatar_url: userEntry.avatar_url,
              gesamt_punkte: userEntry.gesamt_punkte,
              exakte_treffer: userEntry.exakte_treffer,
              is_admin: userEntry.is_admin,
              achievements_count: userEntry.achievements_count || 0,
              trend: userEntry.trend || 0,
              displayRank: userEntry._displayRank
            } as RanglisteEintrag
          })
          setRangliste(rangData)
          setCache(CACHE_KEYS.leaderboard(seasonKey), rangData)
        } else {
          setRangliste([])
        }
      }

      // 2. Global Tipping Statistics
      const { count: usersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
      
      const { count: tipsCount } = await supabase
        .from('tips')
        .select('*', { count: 'exact', head: true })

      setTotalUsers(usersCount || 0)
      setTotalTips(tipsCount || 0)

      if (rangData && rangData.length > 0) {
        const sum = rangData.reduce((acc, curr) => acc + (curr.gesamt_punkte || 0), 0)
        setAvgPoints(Number((sum / rangData.length).toFixed(1)))
      }

      // 3. Verbleibende Spiele/Punkte
      const { count: unplayedMatches } = await supabase
        .from('matches')
        .select('*', { count: 'exact', head: true })
        .neq('status', 'finished')
      
      setRemainingPoints((unplayedMatches || 0) * 4)

      // 4. Bonus Tipp Statistics — dynamisch, alle frage_ids
      const { data: allBonus } = await supabase
        .from('bonus_tipps')
        .select('frage_id, antwort')
      
      if (allBonus && allBonus.length > 0) {
        // Alle distinct frage_ids ermitteln
        const allFrageIds = [...new Set(allBonus.map(b => b.frage_id))].sort((a, b) => a - b)

        // Counts und Totals aufbauen
        const tempCounts: Record<number, Record<string, number>> = {}
        const questionTotals: Record<number, number> = {}
        allFrageIds.forEach(fId => { tempCounts[fId] = {}; questionTotals[fId] = 0 })

        allBonus.forEach(item => {
          const fId = item.frage_id
          const ant = item.antwort
          if (tempCounts[fId] !== undefined) {
            tempCounts[fId][ant] = (tempCounts[fId][ant] || 0) + 1
            questionTotals[fId] += 1
          }
        })

        // Turnier-Gruppen aufbauen
        const byTournament: Record<string, BonusQuestionStats[]> = {}
        const questionTitles = [
          (t: string) => `${t} – Meister`,
          (t: string) => `${t} – Meiste Tore`,
          (t: string) => `${t} – Wenigste Gegentore`,
        ]

        allFrageIds.forEach(fId => {
          const totalVotes = questionTotals[fId] || 1
          const sortedTeams = Object.entries(tempCounts[fId])
            .map(([team, votes]) => ({
              team,
              votes,
              percentage: Math.round((votes / totalVotes) * 100)
            }))
            .sort((a, b) => b.votes - a.votes)

          const { tournament, questionIndex } = getTournamentForFrageId(fId)
          if (!byTournament[tournament]) byTournament[tournament] = []
          byTournament[tournament].push({
            fragenId: fId,
            title: questionTitles[questionIndex % 3](tournament),
            stats: sortedTeams
          })
        })

        // Sortierung: Süper Lig zuerst
        const sortedTournaments: Record<string, BonusQuestionStats[]> = {}
        const tNames = Object.keys(byTournament).sort((a, b) => {
          if (a.toLowerCase().includes('süper lig')) return -1
          if (b.toLowerCase().includes('süper lig')) return 1
          if (a.toLowerCase().includes('champions')) return -1
          if (b.toLowerCase().includes('champions')) return 1
          return a.localeCompare(b)
        })
        tNames.forEach(name => { sortedTournaments[name] = byTournament[name] })

        setBonusStatsByTournament(sortedTournaments)
      }

    } catch (e) {
      console.error('Fehler beim Laden der globalen Daten:', e)
      useToastStore.getState().toast('Fehler beim Laden der Rangliste', 'error')
    } finally {
      setIsLaden(false)
    }
  }, [])

  useEffect(() => {
    ladeGlobalDaten()
  }, [ladeGlobalDaten])

  useEffect(() => {
    if (isDesktop && rangliste.length > 0) {
      const hasUser = rangliste.some(r => r.id === selectedUserId)
      if (!hasUser) {
        setSelectedUserId(rangliste[0].id)
      }
    } else if (!isDesktop) {
      setSelectedUserId(null)
    }
  }, [isDesktop, rangliste, selectedUserId])

  const top3 = rangliste.slice(0, 3)

  // rest mit Tie-bereinigtem Rang (Punktgleichstand → gleicher Rang)
  const rest = (() => {
    const raw = rangliste.slice(3)
    if (raw.length === 0) return []
    // displayRank was already computed during initial mapping!
    return raw as Array<RanglisteEintrag & { displayRank: string }>
  })()

  if (isLaden) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary-container border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-full px-3 md:px-6 lg:px-8 pt-4 md:pt-6 pb-24 md:pb-8 max-w-[1600px] mx-auto w-full animate-page-enter">
      {/* Mobile Switcher Tab - hidden on desktop (Segmented Control) */}
      <div className="flex gap-1.5 mb-5 bg-surface-container/50 border border-white/5 rounded-2xl p-1 lg:hidden backdrop-blur-md">
        <button
          onClick={() => setActiveTab('rangliste')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[10px] font-mono font-black uppercase tracking-wider transition-all duration-200 cursor-pointer ${
            activeTab === 'rangliste'
              ? 'bg-primary-container text-on-primary-container shadow-[0_2px_8px_rgba(var(--primary-rgb),0.15)] border border-primary/20 scale-[1.01]'
              : 'text-on-surface-variant hover:text-on-surface hover:bg-white/5 border border-transparent'
          }`}
        >
          <Trophy size={13} />
          {t('globalRanklist')}
        </button>
        <button
          onClick={() => setActiveTab('stats')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[10px] font-mono font-black uppercase tracking-wider transition-all duration-200 cursor-pointer ${
            activeTab === 'stats'
              ? 'bg-primary-container text-on-primary-container shadow-[0_2px_8px_rgba(var(--primary-rgb),0.15)] border border-primary/20 scale-[1.01]'
              : 'text-on-surface-variant hover:text-on-surface hover:bg-white/5 border border-transparent'
          }`}
        >
          <BarChart2 size={13} />
          {t('communityStats')}
        </button>
      </div>

      {/* Desktop split layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 xl:gap-10 w-full items-start">
        {/* Left column (Leaderboard list) - always visible on desktop, tab-toggleable on mobile */}
        <div className={`col-span-1 lg:col-span-7 space-y-4 ${activeTab !== 'rangliste' && !isDesktop ? 'hidden' : ''}`}>
          <div className="hidden lg:flex items-center gap-2 mb-2 px-1">
            <Trophy size={16} className="text-primary-fixed-dim" />
            <h2 className="text-sm font-mono font-bold text-on-surface uppercase tracking-wider">{t('globalRanklist')}</h2>
          </div>
          <LeaderboardSection
            rangliste={rangliste}
            top3={top3}
            rest={rest}
            navigate={navigate}
            onSelectUser={(id) => {
              setSelectedUserId(id)
              setDesktopRightTab('analyse')
            }}
            selectedUserId={selectedUserId}
            isDesktop={isDesktop}
          />
        </div>

        {/* Right column - handles both stats and selected rival inspector */}
        <div className={`col-span-1 lg:col-span-5 space-y-4 ${activeTab !== 'stats' && !isDesktop ? 'hidden' : ''} lg:sticky lg:top-[80px]`}>
          
          {/* Desktop Right Column Header with mini tabs (Segmented Control) */}
          <div className="hidden lg:flex gap-1.5 bg-surface-container/50 border border-white/5 rounded-2xl p-1 mb-2 backdrop-blur-md">
            <button
              onClick={() => setDesktopRightTab('analyse')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[10px] font-mono font-black uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                desktopRightTab === 'analyse'
                  ? 'bg-primary-container text-on-primary-container shadow-[0_2px_8px_rgba(var(--primary-rgb),0.15)] border border-primary/20 scale-[1.01]'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-white/5 border border-transparent'
              }`}
            >
              <Award size={12} /> {t('rivalAnalysis')}
            </button>
            <button
              onClick={() => setDesktopRightTab('stats')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[10px] font-mono font-black uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                desktopRightTab === 'stats'
                  ? 'bg-primary-container text-on-primary-container shadow-[0_2px_8px_rgba(var(--primary-rgb),0.15)] border border-primary/20 scale-[1.01]'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-white/5 border border-transparent'
              }`}
            >
              <BarChart2 size={12} /> {t('communityStats')}
            </button>
          </div>

          {/* Tab contents (Desktop split mode or Mobile fallback) */}
          {isDesktop ? (
            desktopRightTab === 'analyse' && selectedUserId ? (
              <RivalInspector userId={selectedUserId} />
            ) : (
              <StatsSection totalUsers={totalUsers} totalTips={totalTips} avgPoints={avgPoints} remainingPoints={remainingPoints} bonusStatsByTournament={bonusStatsByTournament} />
            )
          ) : (
            // Mobile fallback: only show stats here (since mobile analysis has its own route)
            <StatsSection totalUsers={totalUsers} totalTips={totalTips} avgPoints={avgPoints} remainingPoints={remainingPoints} bonusStatsByTournament={bonusStatsByTournament} />
          )}
        </div>
      </div>
    </div>
  )
}

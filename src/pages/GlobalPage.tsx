import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useMatchStore } from '../stores/matchStore'
import { getTeamLogo } from '../lib/teamLogos'
import { Trophy, Users, BarChart2, Gift, Award, Crown, Medal, Target } from 'lucide-react'
import { motion } from 'framer-motion'
import { getLevelBadgeStyle, calculateLevel } from '../lib/utils'
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
}

interface BonusStat {
  team: string
  votes: number
  percentage: number
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
  const tieAll = tie1_2 && tie2_3

  return (
    <div className="space-y-4">
      {/* Podium */}
      {top3.length > 0 && (
        <div className="flex items-end justify-center gap-2 mb-6">
          {/* Silber (2.) */}
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
              <div className="w-8 h-8 flex items-center justify-center bg-gradient-to-br from-slate-200 to-slate-400 rounded-full shadow-[0_0_10px_rgba(148,163,184,0.5)] mb-1 relative">
                <Medal size={16} className="text-slate-700" />
                {(tie1_2 || tieAll) && <span className="absolute -top-1 -right-1 text-[7px] bg-amber-500 text-amber-900 font-bold px-1 rounded-full border border-amber-400">2×</span>}
              </div>
              <AvatarLightbox
                src={top3[1]?.avatar_url}
                username={top3[1]?.username || ''}
                size="sm"
                showLevel
                levelBadge={
                  <div className={`absolute -bottom-1 -right-1 z-10 text-[7px] h-3.5 w-3.5 rounded-full flex items-center justify-center shadow select-none ${getLevelBadgeStyle(calculateLevel(top3[1]?.gesamt_punkte || 0, top3[1]?.achievements_count || 0))}`}>
                    {calculateLevel(top3[1]?.gesamt_punkte || 0, top3[1]?.achievements_count || 0)}
                  </div>
                }
              />
              <span className="text-[9px] text-on-surface-variant font-mono truncate w-full text-center flex items-center justify-center gap-1">
                {top3[1]?.username}
                {top3[1]?.is_admin && (
                  <span className="inline-flex shrink-0 px-1 py-0.2 rounded text-[7px] font-black bg-amber-500/20 text-amber-400 border border-amber-500/30 font-mono tracking-wide scale-90">ADM</span>
                )}
              </span>
              <div className="w-full h-16 bg-gradient-to-t from-slate-400/20 to-transparent rounded-t-lg border-x border-t border-slate-400/30 flex flex-col items-center justify-start pt-2 relative overflow-hidden">
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
                ? 'bg-primary-container/15 border-primary/50 shadow-[0_0_15px_rgba(251,191,36,0.15)]'
                : 'border-transparent hover:bg-white/5'
            }`}
          >
            <div className="w-12 h-12 flex items-center justify-center bg-gradient-to-br from-yellow-300 via-amber-400 to-yellow-600 rounded-full shadow-[0_0_15px_rgba(251,191,36,0.6)] mb-1 relative">
              <Crown size={24} className="text-yellow-900" />
              {tie1_2 && <span className="absolute -top-1 -right-2 text-[7px] bg-amber-500 text-amber-900 font-bold px-1 rounded-full border border-amber-400">geteilt</span>}
            </div>
            <AvatarLightbox
              src={top3[0]?.avatar_url}
              username={top3[0]?.username || ''}
              size="md"
              showLevel
              levelBadge={
                <div className={`absolute -bottom-1 -right-1 z-10 text-[8px] h-4 w-4 rounded-full flex items-center justify-center shadow select-none ${getLevelBadgeStyle(calculateLevel(top3[0]?.gesamt_punkte || 0, top3[0]?.achievements_count || 0))}`}>
                  {calculateLevel(top3[0]?.gesamt_punkte || 0, top3[0]?.achievements_count || 0)}
                </div>
              }
            />
            <span className="text-[9px] text-primary-fixed-dim font-mono font-bold truncate w-full text-center flex items-center justify-center gap-1">
              {top3[0]?.username}
              {top3[0]?.is_admin && (
                <span className="inline-flex shrink-0 px-1 py-0.2 rounded text-[7px] font-black bg-amber-500/20 text-amber-400 border border-amber-500/30 font-mono tracking-wide scale-90">ADM</span>
              )}
            </span>
            <div className="w-full h-24 bg-gradient-to-t from-primary/30 to-transparent rounded-t-lg border-x border-t border-primary/40 flex flex-col items-center justify-start pt-2 relative overflow-hidden">
              <div className="absolute inset-0 bg-surface-container-low/30 backdrop-blur-[2px] -z-10" />
              <span className="text-sm font-bold font-mono text-primary-fixed-dim">{top3[0]?.gesamt_punkte}</span>
              <span className="text-[8px] font-mono text-primary-fixed-dim/60">{t('tableHeaderPoints')}</span>
            </div>
          </motion.div>
          {/* Bronze (3.) */}
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
              <div className="w-8 h-8 flex items-center justify-center bg-gradient-to-br from-amber-600 to-amber-800 rounded-full shadow-[0_0_10px_rgba(217,119,6,0.5)] mb-1 relative">
                <Medal size={16} className="text-amber-100" />
                {(tie2_3 || tieAll) && <span className="absolute -top-1 -right-1 text-[7px] bg-amber-500 text-amber-900 font-bold px-1 rounded-full border border-amber-400">2×</span>}
              </div>
              <AvatarLightbox
                src={top3[2]?.avatar_url}
                username={top3[2]?.username || ''}
                size="sm"
                showLevel
                levelBadge={
                  <div className={`absolute -bottom-1 -right-1 z-10 text-[7px] h-3.5 w-3.5 rounded-full flex items-center justify-center shadow select-none ${getLevelBadgeStyle(calculateLevel(top3[2]?.gesamt_punkte || 0, top3[2]?.achievements_count || 0))}`}>
                    {calculateLevel(top3[2]?.gesamt_punkte || 0, top3[2]?.achievements_count || 0)}
                  </div>
                }
              />
              <span className="text-[9px] text-on-surface-variant font-mono truncate w-full text-center flex items-center justify-center gap-1">
                {top3[2]?.username}
                {top3[2]?.is_admin && (
                  <span className="inline-flex shrink-0 px-1 py-0.2 rounded text-[7px] font-black bg-amber-500/20 text-amber-400 border border-amber-500/30 font-mono tracking-wide scale-90">ADM</span>
                )}
              </span>
              <div className="w-full h-12 bg-gradient-to-t from-amber-700/20 to-transparent rounded-t-lg border-x border-t border-amber-700/30 flex flex-col items-center justify-start pt-2 relative overflow-hidden">
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
                className={`flex items-center gap-3 px-3.5 py-3 cursor-pointer transition-colors hover:bg-surface-container border-b border-surface-container-high last:border-0 ${
                  isSelected ? 'bg-primary-container/10 border-r-2 border-primary font-bold' : i % 2 === 0 ? '' : 'bg-surface-container-lowest'
                }`}
              >
                <span className="w-6 text-center font-mono text-[11px] text-on-surface-variant">{e.displayRank}</span>
                <AvatarLightbox
                  src={e.avatar_url}
                  username={e.username || ''}
                  size="sm"
                  showLevel
                  levelBadge={
                    <div className={`absolute -bottom-1 -right-1 z-10 text-[7px] h-3.5 w-3.5 rounded-full flex items-center justify-center shadow select-none ${getLevelBadgeStyle(calculateLevel(e.gesamt_punkte, e.achievements_count || 0))}`}>
                      {calculateLevel(e.gesamt_punkte, e.achievements_count || 0)}
                    </div>
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
  bonusStats,
}: {
  totalUsers: number
  totalTips: number
  avgPoints: number
  remainingPoints: number
  bonusStats: Record<number, BonusStat[]>
}) {
  const { t } = useTranslation()
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

      {/* Community Vote Stats on Bonus wetten */}
      <div className="pt-4">
        <h2 className="text-sm font-bold text-on-surface mb-1">{t('prognosisTitle')}</h2>
        <p className="text-[11px] text-on-surface-variant mb-4 leading-relaxed">
          {t('prognosisDesc')}
        </p>
        <div className="space-y-4">
      {[
        { id: 1, title: t('bonusTitle1'), color: 'bg-gradient-to-r from-amber-500 to-yellow-400' },
        { id: 2, title: t('bonusTitle2'), color: 'bg-emerald-500/80' },
        { id: 3, title: t('bonusTitle3'), color: 'bg-purple-500/80' },
      ].map(q => (
        <div key={q.id} className="bg-surface-container-low border border-surface-container-high rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 size={16} className="text-primary-fixed-dim" />
            <h3 className="text-xs font-mono font-bold text-on-surface-variant uppercase tracking-wider">{q.title}</h3>
          </div>
          
          <div className="space-y-3">
            {bonusStats[q.id] && bonusStats[q.id].length > 0 ? (
              bonusStats[q.id].slice(0, 5).map((item, index) => {
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
                          isFirst ? `${q.color} shadow-[0_0_8px_rgba(251,191,36,0.25)]` : 'bg-blue-500/50'
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
      ))}
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
  
  // Bonus stats
  const [bonusStats, setBonusStats] = useState<Record<number, BonusStat[]>>({ 1: [], 2: [], 3: [] })
  
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
        // 1. Leaderboard (frisch von DB)
        const { data: rawRangData } = await supabase
          .from('profiles')
          .select('id,username,avatar_url,gesamt_punkte,exakte_treffer,is_admin')
          .order('gesamt_punkte', { ascending: false })
          .order('exakte_treffer', { ascending: false })
          .limit(50)

        if (rawRangData && rawRangData.length > 0) {
          const userIds = rawRangData.map(r => r.id)
          
          // Fetch all tips for these top users to evaluate achievements
          const { data: allUsersTips } = await supabase
            .from('tips')
            .select('*, matches(id, spieltag, status, tournament, heim_team, gast_team, tore_heim, tore_gast, anpfiff)')
            .in('user_id', userIds)

          const tipsByUser: Record<string, TipWithMatch[]> = {}
          if (allUsersTips) {
            allUsersTips.forEach(t => {
              if (!tipsByUser[t.user_id]) {
                tipsByUser[t.user_id] = []
              }
              tipsByUser[t.user_id].push(t as unknown as TipWithMatch)
            })
          }

          rangData = rawRangData.map((userEntry, index) => {
            const userTips = tipsByUser[userEntry.id] || []
            const formattedTips = userTips.map(t => ({
              id: t.id,
              tipp_heim: t.tipp_heim,
              tipp_gast: t.tipp_gast,
              punkte: t.punkte,
              created_at: t.created_at,
              updated_at: t.updated_at,
              match: {
                id: t.matches?.id || '',
                spieltag: t.matches?.spieltag || 1,
                status: t.matches?.status || 'scheduled',
                heim_team: t.matches?.heim_team || '',
                gast_team: t.matches?.gast_team || '',
                anpfiff: t.matches?.anpfiff || '',
                tore_heim: t.matches?.tore_heim ?? null,
                tore_gast: t.matches?.tore_gast ?? null,
                tournament: t.matches?.tournament || ''
              }
            }))

            const unlockedSet = evaluateAchievements(
              formattedTips as unknown as TipDetails[],
              {
                gesamt_punkte: userEntry.gesamt_punkte || 0,
                exakte_treffer: userEntry.exakte_treffer || 0,
                is_admin: userEntry.is_admin || false,
                rang: index + 1,
                league_count: 0
              },
              userEntry.avatar_url,
              userEntry.username || ''
            )

            return {
              ...userEntry,
              achievements_count: unlockedSet.size
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

      // 4. Bonus Tipp Statistics
      const { data: allBonus } = await supabase
        .from('bonus_tipps')
        .select('frage_id, antwort')
      
      if (allBonus) {
        const tempCounts: Record<number, Record<string, number>> = { 1: {}, 2: {}, 3: {} }
        const questionTotals: Record<number, number> = { 1: 0, 2: 0, 3: 0 }

        allBonus.forEach(item => {
          const fId = item.frage_id
          const ant = item.antwort
          if (tempCounts[fId] !== undefined) {
            tempCounts[fId][ant] = (tempCounts[fId][ant] || 0) + 1
            questionTotals[fId] += 1
          }
        })

        const computedStats: Record<number, BonusStat[]> = { 1: [], 2: [], 3: [] }
        
        for (const fId of [1, 2, 3]) {
          const totalVotes = questionTotals[fId] || 1
          const sortedTeams = Object.entries(tempCounts[fId])
            .map(([team, votes]) => ({
              team,
              votes,
              percentage: Math.round((votes / totalVotes) * 100)
            }))
            .sort((a, b) => b.votes - a.votes)
            
          computedStats[fId] = sortedTeams
        }
        
        setBonusStats(computedStats)
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
    const withRanks: Array<RanglisteEintrag & { displayRank: string }> = []
    let currentRank = 4
    let lastPoints: number | null = top3[2]?.gesamt_punkte ?? null
    for (let i = 0; i < raw.length; i++) {
      if (lastPoints !== null && raw[i].gesamt_punkte !== lastPoints) {
        currentRank = i + 4
        lastPoints = raw[i].gesamt_punkte
      }
      const isTie = i > 0 && raw[i].gesamt_punkte === raw[i-1].gesamt_punkte
      withRanks.push({ ...raw[i], displayRank: isTie ? '–' : `#${currentRank}` })
    }
    return withRanks
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
      {/* Mobile Switcher Tab - hidden on desktop */}
      <div className="flex gap-1 mb-5 bg-surface-container-low border border-surface-container-high rounded-xl p-1 lg:hidden">
        <button
          onClick={() => setActiveTab('rangliste')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-mono font-medium uppercase tracking-wider transition-all duration-200 ${
            activeTab === 'rangliste'
              ? 'bg-primary-container/20 text-primary border border-primary-container/35 shadow-sm'
              : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
          }`}
        >
          <Trophy size={13} />
          {t('globalRanklist')}
        </button>
        <button
          onClick={() => setActiveTab('stats')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-mono font-medium uppercase tracking-wider transition-all duration-200 ${
            activeTab === 'stats'
              ? 'bg-primary-container/20 text-primary border border-primary-container/35 shadow-sm'
              : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
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
          
          {/* Desktop Right Column Header with mini tabs */}
          <div className="hidden lg:flex gap-1.5 bg-surface-container border border-surface-container-high rounded-xl p-1 mb-2">
            <button
              onClick={() => setDesktopRightTab('analyse')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider transition-all border ${
                desktopRightTab === 'analyse'
                  ? 'bg-primary-container/15 text-primary border-primary-container/25 shadow-sm'
                  : 'border-transparent text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <Award size={12} /> {t('rivalAnalysis')}
            </button>
            <button
              onClick={() => setDesktopRightTab('stats')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider transition-all border ${
                desktopRightTab === 'stats'
                  ? 'bg-primary-container/15 text-primary border-primary-container/25 shadow-sm'
                  : 'border-transparent text-on-surface-variant hover:text-on-surface'
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
              <StatsSection totalUsers={totalUsers} totalTips={totalTips} avgPoints={avgPoints} remainingPoints={remainingPoints} bonusStats={bonusStats} />
            )
          ) : (
            // Mobile fallback: only show stats here (since mobile analysis has its own route)
            <StatsSection totalUsers={totalUsers} totalTips={totalTips} avgPoints={avgPoints} remainingPoints={remainingPoints} bonusStats={bonusStats} />
          )}
        </div>
      </div>
    </div>
  )
}

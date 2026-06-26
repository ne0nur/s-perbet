import { History, TrendingUp } from 'lucide-react'
import { useTranslation } from '../../utils/translations'

interface Stats {
  total: number
  correct: number
  wrong: number
  matchdayCount: number
  avgPerMatchday: number
  rate: number
}

interface StatsGridProps {
  stats: Stats
  remainingPoints?: { sl: number; cl: number; total: number }
  gesamtPunkte?: number
}

export function StatsGrid({ stats, remainingPoints = { sl: 0, cl: 0, total: 0 }, gesamtPunkte = 0 }: StatsGridProps) {
  const { t } = useTranslation()
  const totalTips = stats.total
  const correctPct = totalTips > 0 ? (stats.correct / totalTips) * 100 : 0
  const wrongPct = totalTips > 0 ? (stats.wrong / totalTips) * 100 : 0

  return (
    <div className="bg-surface-container-low border border-surface-container-high rounded-xl p-5 shadow-sm stagger-in text-left space-y-5">

      {/* Header: Total Points + Progress Bar */}
      <div>
        <div className="flex justify-between items-end mb-3">
          <div>
            <h4 className="text-sm font-bold text-on-surface">
              {t('yourPerformance')}
            </h4>
            <p className="text-[10px] font-mono text-on-surface-variant uppercase tracking-wider mt-0.5">
              {t('seasonProgressHitRate')}
            </p>
          </div>
          <div className="text-right">
            <span className="text-2xl font-black text-primary leading-none">{gesamtPunkte}</span>
            <span className="text-[10px] font-mono text-on-surface-variant ml-1">
              {t('ptsUpper')}
            </span>
          </div>
        </div>

        <div className="relative pt-2">
          <div className="flex justify-between text-[9px] font-mono text-on-surface-variant mb-1.5 px-1 items-end">
            <span>{t('pointsEarnedSoFar')}</span>
            <div className="text-right">
              <span className="text-primary-fixed-dim block">
                {t('ptsStillPossible', { count: remainingPoints.total })}
              </span>
              {remainingPoints.total > 0 && (
                <div className="text-[8px] opacity-60 font-sans tracking-normal mt-0.5">
                  Süper Lig: {remainingPoints.sl} · CL: {remainingPoints.cl}
                </div>
              )}
            </div>
          </div>
          <div className="flex w-full h-1.5 rounded-full overflow-hidden border border-surface-container-high bg-surface-container-highest">
            <div
              className="bg-primary h-full shadow-[0_0_8px_rgba(251,191,36,0.3)] transition-all duration-1000"
              style={{ width: `${Math.max(5, (gesamtPunkte / (gesamtPunkte + remainingPoints.total || 1)) * 100)}%` }}
            />
            <div
              className="bg-primary/20 h-full transition-all duration-1000"
              style={{ width: `${(remainingPoints.total / (gesamtPunkte + remainingPoints.total || 1)) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Stats Grid: Total + Ø per Matchday */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-surface-container-lowest border border-surface-container-high rounded-lg p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="text-blue-400" size={16} />
            <span className="font-mono text-[10px] text-on-surface-variant uppercase tracking-tight">
              {t('predictionsSubmitted')}
            </span>
          </div>
          <span className="font-mono text-sm font-bold text-on-surface">{stats.total}</span>
        </div>
        <div className="bg-surface-container-lowest border border-surface-container-high rounded-lg p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="text-indigo-400" size={16} />
            <span className="font-mono text-[10px] text-on-surface-variant uppercase tracking-tight">
              {t('avgPointsPerMatchday')}
            </span>
          </div>
          <span className="font-mono text-sm font-bold text-on-surface">{stats.avgPerMatchday.toFixed(1)}</span>
        </div>
      </div>

      {/* Distribution: Richtig vs Falsch */}
      <div className="bg-surface-container-lowest border border-surface-container-high rounded-lg p-4">
        <p className="font-mono text-[10px] text-on-surface-variant uppercase tracking-wider mb-3">
          {t('distribution')} · {t('hitRateLabel', { rate: stats.rate })}
        </p>

        {totalTips > 0 ? (
          <div className="flex w-full h-3 rounded-full overflow-hidden border border-surface-container-high bg-surface-container-highest mb-3">
            <div className="h-full bg-green-500 transition-all duration-500 shadow-inner" style={{ width: `${correctPct}%` }} title={t('correctTeam')} />
            <div className="h-full bg-red-500/70 transition-all duration-500 shadow-inner" style={{ width: `${wrongPct}%` }} title={t('wrongTeam')} />
          </div>
        ) : (
          <div className="h-3 w-full bg-surface-container-highest rounded-full mb-3" />
        )}

        <div className="flex justify-between text-[10px] font-mono uppercase">
          <span className="text-green-400">{t('correctTeam')}: <b>{stats.correct}</b></span>
          <span className="text-red-400">{t('wrongTeam')}: <b>{stats.wrong}</b></span>
        </div>
      </div>
    </div>
  )
}

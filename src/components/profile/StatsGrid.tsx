import { History, Target, TrendingUp } from 'lucide-react'
import { useTranslation } from '../../utils/translations'

interface Stats {
  total: number
  exact: number
  diff: number
  tend: number
  weak: number
  miss: number
  avg: number | string
  rate: number | string
}

interface StatsGridProps {
  stats: Stats
  remainingPoints?: { sl: number; cl: number; total: number }
  gesamtPunkte?: number
}

export function StatsGrid({ stats, remainingPoints = { sl: 0, cl: 0, total: 0 }, gesamtPunkte = 0 }: StatsGridProps) {
  const { t } = useTranslation()
  const totalTips = stats.total
  const exactPct = totalTips > 0 ? (stats.exact / totalTips) * 100 : 0
  const diffPct = totalTips > 0 ? (stats.diff / totalTips) * 100 : 0
  const tendPct = totalTips > 0 ? (stats.tend / totalTips) * 100 : 0
  const weakPct = totalTips > 0 ? (stats.weak / totalTips) * 100 : 0
  const missPct = totalTips > 0 ? (stats.miss / totalTips) * 100 : 0

  const displayAvg = typeof stats.avg === 'string' ? parseFloat(stats.avg) : stats.avg
  const displayRate = typeof stats.rate === 'string' ? parseInt(stats.rate) : stats.rate

  return (
    <div className="bg-surface-container-low border border-surface-container-high rounded-xl p-5 shadow-sm stagger-in text-left space-y-5">
      
      {/* Top Header: Title + Progress Bar combined */}
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
            <span>
              {t('pointsEarnedSoFar')}
            </span>
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

      {/* Stats Grid merged with Distribution */}
      <div className="grid grid-cols-2 gap-4">
        {/* Left Column: General Stats */}
        <div className="space-y-3">
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
                {t('avgPoints')}
              </span>
            </div>
            <span className="font-mono text-sm font-bold text-on-surface">{displayAvg.toFixed(1)}</span>
          </div>
        </div>

        {/* Right Column: Distribution */}
        <div className="bg-surface-container-lowest border border-surface-container-high rounded-lg p-3 flex flex-col justify-between">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-1.5">
              <Target className="text-emerald-400" size={14} />
              <span className="font-mono text-[10px] text-on-surface-variant uppercase tracking-tight">
                {t('distribution')}
              </span>
            </div>
            <span className="font-mono text-[10px] font-bold text-emerald-400 font-bold">
              {t('hitRateLabel', { rate: displayRate })}
            </span>
          </div>
          
          {stats.total > 0 ? (
            <div className="flex w-full h-2 rounded-full overflow-hidden border border-surface-container-high bg-surface-container-highest mb-3">
              {stats.exact > 0 && <div className="h-full bg-green-500 transition-all duration-500 shadow-inner" style={{ width: `${exactPct}%` }} title="Exakt (4P)" />}
              {stats.diff > 0 && <div className="h-full bg-amber-500 transition-all duration-500 shadow-inner" style={{ width: `${diffPct}%` }} title="Differenz (3P)" />}
              {stats.tend > 0 && <div className="h-full bg-blue-500 transition-all duration-500 shadow-inner" style={{ width: `${tendPct}%` }} title="Tendenz (2P)" />}
              {stats.weak > 0 && <div className="h-full bg-cyan-500 transition-all duration-500 shadow-inner" style={{ width: `${weakPct}%` }} title="Schwache Tendenz (1P)" />}
              {stats.miss > 0 && <div className="h-full bg-slate-600 transition-all duration-500 shadow-inner" style={{ width: `${missPct}%` }} title="Daneben (≤0P)" />}
            </div>
          ) : (
            <div className="h-2 w-full bg-surface-container-highest rounded-full mb-3" />
          )}

          <div className="grid grid-cols-2 gap-1.5 text-[9px] font-mono text-on-surface-variant uppercase leading-tight">
            <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-green-500 block shrink-0" /><span className="truncate">{t('exactLabel')}: <b className="text-on-surface">{stats.exact}</b></span></div>
            <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-500 block shrink-0" /><span className="truncate">{t('diffLabel')}: <b className="text-on-surface">{stats.diff}</b></span></div>
            <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-blue-500 block shrink-0" /><span className="truncate">{t('tendLabel')}: <b className="text-on-surface">{stats.tend}</b></span></div>
            <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-cyan-500 block shrink-0" /><span className="truncate">{t('weakLabel')}: <b className="text-on-surface">{stats.weak}</b></span></div>
            <div className="flex items-center gap-1.5 col-span-2"><span className="w-1.5 h-1.5 rounded-full bg-slate-600 block shrink-0" /><span className="truncate">{t('wrongLabel')}: <b className="text-on-surface">{stats.miss}</b></span></div>
          </div>
        </div>
      </div>
    </div>
  )
}

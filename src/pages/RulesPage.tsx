import { useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'
import { useTranslation } from '../utils/translations'

export function RulesPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()

  const beispiele = [
    { punkte: 4, farbe: 'border-emerald-500/30', bg: 'bg-emerald-500/5', text: 'text-emerald-400', titel: t('ruleExExactTitle'), tipp: '2 : 1', erg: '2 : 1', erkl: t('ruleExExactDesc') },
    { punkte: 3, farbe: 'border-amber-500/30', bg: 'bg-amber-500/5', text: 'text-amber-400', titel: t('ruleExDiffTitle'), tipp: '3 : 1', erg: '2 : 0', erkl: t('ruleExDiffDesc') },
    { punkte: 3, farbe: 'border-amber-500/30', bg: 'bg-amber-500/5', text: 'text-amber-400', titel: t('ruleExDrawTitle'), tipp: '1 : 1', erg: '2 : 2', erkl: t('ruleExDrawDesc') },
    { punkte: 2, farbe: 'border-blue-500/30', bg: 'bg-blue-500/5', text: 'text-blue-400', titel: t('ruleExTendTitle'), tipp: '1 : 0', erg: '2 : 1', erkl: t('ruleExTendDesc') },
    { punkte: 0, farbe: 'border-white/10', bg: 'bg-white/[0.02]', text: 'text-on-surface-variant', titel: t('ruleExMissTitle'), tipp: '2 : 0', erg: '0 : 2', erkl: t('ruleExMissDesc') },
  ]

  return (
    <div className="min-h-full flex flex-col md:px-6 lg:px-8 pt-4 md:pt-6 pb-24 md:pb-8 max-w-4xl mx-auto w-full animate-page-enter">
      <div className="flex items-center justify-between p-4 border-b border-white/5">
        <h1 className="text-lg font-bold text-on-surface">{t('rulesTitle')}</h1>
        <button onClick={() => navigate(-1)} className="p-2 text-on-surface-variant"><X size={20} /></button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 pb-24">
        <p className="text-on-surface-variant text-sm mb-4">{t('highestValueNotice')}</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {beispiele.map((b, i) => (
            <div key={i} className={`glass-panel rounded-xl p-4 border ${b.farbe} ${b.bg}`}>
              <div className="flex justify-between mb-3">
                <h3 className={`text-sm font-bold ${b.text}`}>{b.titel}</h3>
                <span className={`font-mono text-lg font-bold ${b.text}`}>{b.punkte}P</span>
              </div>
              <div className="flex items-center gap-3 mb-2">
                <div className="flex-1 text-right">
                  <span className="text-[10px] text-on-surface-variant font-mono">{t('yourTipLabel')}</span>
                  <div className="font-mono text-lg font-bold text-on-surface">{b.tipp}</div>
                </div>
                <span className="text-on-surface-variant text-xs">vs.</span>
                <div className="flex-1 text-left">
                  <span className="text-[10px] text-on-surface-variant font-mono">{t('outcomeLabel')}</span>
                  <div className="font-mono text-lg font-bold text-on-surface">{b.erg}</div>
                </div>
              </div>
              <p className="text-[11px] text-on-surface-variant">{b.erkl}</p>
            </div>
          ))}
        </div>
        
        <h2 className="text-sm font-bold text-on-surface mt-8 mb-3">{t('levelExpTitle')}</h2>
        <div className="glass-panel rounded-xl p-4 border border-white/5">
          <p className="text-[11px] text-on-surface-variant mb-2 leading-relaxed">
            {t('levelExpDesc')}
          </p>
          <ul className="text-[11px] text-on-surface-variant space-y-1.5 list-disc list-inside">
            <li>{t('xpRulePoints')}</li>
            <li>{t('xpRuleAchievements')}</li>
            <li>{t('xpRuleLevelUp')}</li>
          </ul>
        </div>
      </div>
    </div>
  )
}


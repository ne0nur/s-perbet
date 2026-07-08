import { useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'
import { useTranslation } from '../utils/translations'

export function RulesPage() {
  const navigate = useNavigate()
  const { t, language } = useTranslation()

  const beispiele = [
    { punkte: 4, farbe: 'border-success/30', bg: 'bg-success-container/10', text: 'text-success', titel: t('ruleExExactTitle'), tipp: '2 : 1', erg: '2 : 1', erkl: t('ruleExExactDesc') },
    { punkte: 3, farbe: 'border-warning/30', bg: 'bg-warning-container/10', text: 'text-warning', titel: t('ruleExDiffTitle'), tipp: '4 : 1', erg: '3 : 1', erkl: t('ruleExDiffDesc') },
    { punkte: 2, farbe: 'border-info/30', bg: 'bg-info-container/10', text: 'text-info', titel: t('ruleExTendTitle'), tipp: '2 : 0', erg: '3 : 1', erkl: t('ruleExTendDesc') },
    { punkte: 1, farbe: 'border-primary/20', bg: 'bg-primary/5', text: 'text-primary-fixed-dim', titel: t('ruleExFarTitle'), tipp: '1 : 0', erg: '4 : 1', erkl: t('ruleExFarDesc') },
    { punkte: 0, farbe: 'border-white/5', bg: 'bg-white/[0.01]', text: 'text-on-surface-variant', titel: t('ruleExMissCloseTitle'), tipp: '1 : 1', erg: '2 : 1', erkl: t('ruleExMissCloseDesc') },
    { punkte: -1, farbe: 'border-error/20', bg: 'bg-error-container/10', text: 'text-error', titel: t('ruleExMissTitle'), tipp: '1 : 2', erg: '2 : 1', erkl: t('ruleExMissDesc') },
    { punkte: -2, farbe: 'border-error/30', bg: 'bg-error-container/20', text: 'text-error', titel: t('ruleExMissFarTitle'), tipp: '0 : 3', erg: '2 : 1', erkl: t('ruleExMissFarDesc') },
  ]

  return (
    <div className="min-h-full flex flex-col md:px-6 lg:px-8 pt-4 md:pt-6 pb-24 md:pb-8 max-w-4xl mx-auto w-full animate-page-enter">
      <div className="flex items-center justify-between p-4 border-b border-white/5">
        <h1 className="text-lg font-bold text-on-surface">{t('rulesTitle')}</h1>
        <button 
          onClick={() => navigate(-1)} 
          aria-label={t('detailsClose')}
          className="p-3 text-on-surface-variant cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full hover:bg-white/5 transition-colors"
        >
          <X size={20} />
        </button>
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
              <p className="text-[11px] text-on-surface-variant text-center">{b.erkl}</p>
              
              {(() => {
                const [th, tg] = b.tipp.split(':').map(str => Number(str.trim()))
                const [rh, rg] = b.erg.split(':').map(str => Number(str.trim()))
                const diffH = Math.abs(th - rh)
                const diffG = Math.abs(tg - rg)
                const totalDiff = diffH + diffG
                return (
                  <div className="mt-3 bg-black/20 rounded-lg p-2.5 max-w-[240px] text-left flex flex-col gap-1.5 border border-white/5 mx-auto">
                    <div className="flex justify-between items-center text-[10px] font-mono text-on-surface-variant/80">
                      <span>{t('ruleHomeError')}</span>
                      <span className="font-bold text-on-surface">{diffH} {t('goalsLabel')}</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-mono text-on-surface-variant/80">
                      <span>{t('ruleAwayError')}</span>
                      <span className="font-bold text-on-surface">{diffG} {t('goalsLabel')}</span>
                    </div>
                    <div className="h-px bg-white/10 my-0.5" />
                    <div className="flex justify-between items-center text-[11px] font-mono font-bold">
                      <span className={b.text}>{t('ruleTotalDistance')}</span>
                      <span className={b.text}>{totalDiff} {t('goalsLabel')}</span>
                    </div>
                  </div>
                )
              })()}
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

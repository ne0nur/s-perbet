import { Gift, Lock, Check } from 'lucide-react'
import { getTeamLogo } from '../../lib/teamLogos'
import { useSettingsStore } from '../../stores/settingsStore'
import { useTranslation } from '../../utils/translations'

const TEAMS = [
  'Fenerbahçe', 'Galatasaray', 'Beşiktaş', 'Trabzonspor', 'Başakşehir',
  'Adana Demirspor', 'Antalyaspor', 'Konyaspor', 'Sivasspor', 'Kayserispor',
  'Gaziantep FK', 'Hatayspor', 'Alanyaspor', 'Kasımpaşa', 'Ankaragücü',
  'Samsunspor', 'Pendikspor', 'Rizespor', 'Karagümrük', 'Bodrum FK', 'Eyüpspor', 'Göztepe',
]

interface BonusTipp { frage_id: number; antwort: string }

interface BonusTippsCardProps {
  bonusGesperrt: boolean
  bonusTipps: BonusTipp[]
  antworten: Record<number, string>
  setAntworten: React.Dispatch<React.SetStateAction<Record<number, string>>>
  handleSpeichernBonus: () => Promise<void>
  gespeichert: boolean
  setGespeichert: (g: boolean) => void
}

export function BonusTippsCard({
  bonusGesperrt,
  bonusTipps,
  antworten,
  setAntworten,
  handleSpeichernBonus,
  gespeichert,
  setGespeichert
}: BonusTippsCardProps) {
  const { t } = useTranslation()
  const tippsFreigeschaltet = useSettingsStore(s => s.tippsFreigeschaltet)
  const sollteGlowen = bonusTipps.length < 3 && !bonusGesperrt

  const fragen = [
    { id: 1, text: t('bonusTip1') },
    { id: 2, text: t('bonusTip2') },
    { id: 3, text: t('bonusTip3') },
  ]

  return (
    <div className={`bg-surface-container-low border rounded-xl p-4 shadow-sm stagger-in transition-all duration-300 ${
      sollteGlowen 
        ? 'animate-glow-pulse border-primary-container/40' 
        : 'border-surface-container-high'
    }`}>
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-surface-container-high/60">
        <Gift size={16} className="text-primary-fixed-dim" />
        <h3 className="text-xs font-mono text-on-surface uppercase tracking-wider font-bold">{t('myBonusTips')}</h3>
      </div>

      <div className="space-y-3 animate-fade-in text-left">
          {bonusGesperrt && (
            <div className={`glass-panel p-2 flex items-center gap-2 ${!tippsFreigeschaltet ? 'bg-amber-500/5 border-amber-500/10' : 'border-amber-500/20'}`}>
              <Lock size={12} className="text-amber-400 shrink-0" />
              <p className="text-[10px] text-amber-500 leading-tight">
                {!tippsFreigeschaltet
                  ? t('bonusTipsUpcoming')
                  : t('bonusTipsLocked')}
              </p>
            </div>
          )}

          <div className="space-y-3">
            {fragen.map(frage => {
              const gespeicherterTipp = bonusTipps.find(t => t.frage_id === frage.id)
              const wert = antworten[frage.id] || gespeicherterTipp?.antwort || ''
              const logoUrl = wert ? getTeamLogo(wert) : null
              return (
                <div key={frage.id} className="bg-surface-container-lowest border border-surface-container-high rounded-lg p-3">
                  <p className="text-[11px] font-bold text-on-surface mb-2.5 leading-tight">{frage.text}</p>
                  {bonusGesperrt ? (
                    <div className="flex items-center gap-3 bg-black/20 border border-white/5 rounded-lg py-2.5 px-3">
                      <Lock size={14} className="text-on-surface-variant/40" />
                      {logoUrl ? (
                        <img src={logoUrl} alt={wert} className="w-8 h-8 object-contain drop-shadow-md" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                      ) : (
                        <div className="w-8 h-8 bg-surface-container rounded-full flex items-center justify-center">?</div>
                      )}
                      <div className="flex flex-col">
                        <span className="text-on-surface text-sm font-bold">{wert || t('noTipSubmitted')}</span>
                        {gespeicherterTipp && (
                          <span className="text-[9px] font-mono text-green-400 uppercase tracking-wider font-bold mt-0.5 flex items-center gap-1">
                            <Check size={10} /> {t('saved')}
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="relative">
                      <select
                        value={wert}
                        onChange={e => {
                          setAntworten(prev => ({ ...prev, [frage.id]: e.target.value }))
                          setGespeichert(false)
                        }}
                        className="w-full bg-black/35 border border-surface-container-high rounded-lg pl-9 pr-3 py-2.5 text-sm text-on-surface focus:border-primary focus:outline-none appearance-none cursor-pointer"
                      >
                        <option value="">{t('selectTeam')}</option>
                        {TEAMS.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                      {wert && logoUrl ? (
                        <img src={logoUrl} alt="" className="absolute left-2.5 top-1/2 -translate-y-1/2 w-5 h-5 object-contain pointer-events-none" />
                      ) : (
                        <div className="absolute left-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border border-white/10 border-dashed pointer-events-none" />
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {tippsFreigeschaltet && !bonusGesperrt && (
            <button
              onClick={handleSpeichernBonus}
              className="bg-primary-container text-on-primary-container w-full mt-2 py-2.5 rounded-lg font-mono text-xs font-bold uppercase tracking-wider hover:opacity-90 active:scale-95 transition-all shadow-[0_0_15px_rgba(251,191,36,0.1)]"
            >
              {gespeichert ? <span className="flex items-center justify-center gap-2"><Check size={14} /> {t('saved')}</span> : t('submitUpdateBonusTips')}
            </button>
          )}
      </div>
    </div>
  )
}

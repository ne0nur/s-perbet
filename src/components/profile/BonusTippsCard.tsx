import { useState } from 'react'
import { Gift, Lock, Check } from 'lucide-react'
import { getTeamLogo } from '../../lib/teamLogos'
import { useSettingsStore } from '../../stores/settingsStore'
import { useTranslation } from '../../utils/translations'
import type { TournamentConfig } from '../../pages/ProfilePage'

interface BonusTipp { frage_id: number; antwort: string }

interface BonusTippsCardProps {
  tournaments: TournamentConfig[]
  bonusTipps: BonusTipp[]
  antworten: Record<number, string>
  setAntworten: React.Dispatch<React.SetStateAction<Record<number, string>>>
  handleSpeichernBonus: () => Promise<void>
  gespeichert: boolean
  setGespeichert: (g: boolean) => void
}

/** Return tournament tab emoji flag based on name */
function getTournamentEmoji(name: string): string {
  const n = name.toLowerCase()
  if (n.includes('süper lig') || n.includes('super lig') || n.includes('türkei') || n.includes('turkey')) return '🇹🇷'
  if (n.includes('champions league')) return '⭐'
  if (n.includes('europa league')) return '🔵'
  if (n.includes('bundesliga') || n.includes('deutschland') || n.includes('german')) return '🇩🇪'
  if (n.includes('premier league') || n.includes('england')) return '🏴󠁧󠁢󠁥󠁮󠁧󠁿'
  if (n.includes('la liga') || n.includes('spain') || n.includes('spanien')) return '🇪🇸'
  if (n.includes('serie a') || n.includes('italy') || n.includes('italien')) return '🇮🇹'
  if (n.includes('ligue 1') || n.includes('france') || n.includes('frankreich')) return '🇫🇷'
  return '🏆'
}

/** Generate short tab label (max ~14 chars) from tournament name */
function getTabLabel(name: string): string {
  if (name.length <= 14) return name
  // Champions League -> Champ. League, Süper Lig stays as-is, etc.
  return name
    .replace('Champions League', 'Champ. League')
    .replace('Europa League', 'Europa L.')
    .replace('Bundesliga', 'Bundesliga')
    .replace('Premier League', 'Premier L.')
    .replace('La Liga', 'La Liga')
    .slice(0, 14)
}

/** Generate question labels for a tournament */
function getQuestionsForTournament(tc: TournamentConfig, t: (key: string, params?: Record<string, string | number>) => string) {
  return tc.questionIds.map((id, i) => {
    // Try specific translation keys first (for SL & CL backward compat)
    const norm = tc.name.toLowerCase().trim()
    if (norm === 'süper lig') {
      const keys = ['bonusTipMeisterSL', 'bonusTipToreSL', 'bonusTipGegentoreSL']
      return { id, text: t(keys[i]) }
    }
    if (norm === 'champions league') {
      const keys = ['bonusTipMeisterCL', 'bonusTipToreCL', 'bonusTipGegentoreCL']
      return { id, text: t(keys[i]) }
    }
    // Generic: use dynamic template with tournament name
    const genericKeys = ['bonusTipMeisterGeneric', 'bonusTipToreGeneric', 'bonusTipGegentoreGeneric']
    return { id, text: t(genericKeys[i], { tournament: tc.name }) }
  })
}

export function BonusTippsCard({
  tournaments,
  bonusTipps,
  antworten,
  setAntworten,
  handleSpeichernBonus,
  gespeichert,
  setGespeichert,
}: BonusTippsCardProps) {
  const { t } = useTranslation()
  const tippsFreigeschaltet = useSettingsStore(s => s.tippsFreigeschaltet)
  const [activeSubIndex, setActiveSubIndex] = useState(0)

  if (tournaments.length === 0) {
    return (
      <div className="bg-surface-container-low border border-surface-container-high rounded-xl p-6 text-center shadow-sm">
        <Gift size={20} className="text-primary-fixed-dim mx-auto mb-2" />
        <p className="text-xs text-on-surface-variant font-mono">{t('bonusTipsUpcoming')}</p>
      </div>
    )
  }

  const safeIndex = Math.min(activeSubIndex, tournaments.length - 1)
  const activeTournament = tournaments[safeIndex]
  const currentFragen = getQuestionsForTournament(activeTournament, t)
  const currentGesperrt = activeTournament.isLocked
  const currentTeams = activeTournament.teams

  const gesamtTippsEingegeben = currentFragen.filter(f =>
    antworten[f.id] || bonusTipps.find(tip => tip.frage_id === f.id)?.antwort
  ).length
  const sollteGlowen = gesamtTippsEingegeben < currentFragen.length && !currentGesperrt

  return (
    <div className={`bg-surface-container-low border rounded-xl p-4 shadow-sm stagger-in transition-all duration-300 ${
      sollteGlowen
        ? 'animate-glow-pulse border-primary-container/40'
        : 'border-surface-container-high'
    }`}>
      {/* Title */}
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-surface-container-high/60">
        <Gift size={16} className="text-primary-fixed-dim" />
        <h3 className="text-xs font-mono text-on-surface uppercase tracking-wider font-bold">{t('myBonusTips')}</h3>
      </div>

      {/* Dynamic Segmented Control – one button per discovered tournament */}
      {tournaments.length > 1 && (
        <div className="flex bg-surface-container/50 border border-white/5 p-0.5 rounded-xl mb-4 gap-1 overflow-x-auto no-scrollbar">
          {tournaments.map((tc, idx) => (
            <button
              key={tc.name}
              type="button"
              onClick={() => {
                setActiveSubIndex(idx)
                setGespeichert(false)
              }}
              className={`flex-1 min-w-[70px] py-1.5 rounded-lg text-[9px] xs:text-[10px] md:text-xs font-mono font-black uppercase tracking-wider transition-all duration-200 cursor-pointer text-center whitespace-nowrap ${
                safeIndex === idx
                  ? 'bg-primary-container text-on-primary-container shadow-[0_1.5px_6px_rgba(var(--primary-rgb),0.1)] border border-primary/25 scale-[1.01]'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-white/5 border border-transparent'
              }`}
            >
              {getTournamentEmoji(tc.name)} {getTabLabel(tc.name)}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="space-y-3 animate-fade-in text-left">
        {currentGesperrt && (
          <div className={`glass-panel p-2.5 flex items-center gap-2 rounded-xl border ${!tippsFreigeschaltet ? 'bg-amber-500/5 border-amber-500/10' : 'border-amber-500/20'}`}>
            <Lock size={12} className="text-amber-400 shrink-0" />
            <p className="text-[10px] text-amber-500 leading-tight">
              {!tippsFreigeschaltet
                ? t('bonusTipsUpcoming')
                : t('bonusTipsLocked')}
            </p>
          </div>
        )}

        <div className="space-y-3">
          {currentFragen.map(frage => {
            const gespeicherterTipp = bonusTipps.find(tip => tip.frage_id === frage.id)
            const wert = antworten[frage.id] || gespeicherterTipp?.antwort || ''
            const logoUrl = wert ? getTeamLogo(wert) : null
            return (
              <div key={frage.id} className="bg-surface-container-lowest border border-surface-container-high rounded-lg p-3">
                <p className="text-[11px] font-bold text-on-surface mb-2.5 leading-tight">{frage.text}</p>
                {currentGesperrt ? (
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
                      className="w-full bg-black/35 border border-surface-container-high rounded-lg pl-9 pr-8 py-2.5 text-sm text-on-surface focus:border-primary focus:outline-none appearance-none cursor-pointer"
                    >
                      <option value="">{t('selectTeam')}</option>
                      {currentTeams.map(team => <option key={team} value={team}>{team}</option>)}
                    </select>
                    {wert && logoUrl ? (
                      <img src={logoUrl} alt="" className="absolute left-2.5 top-1/2 -translate-y-1/2 w-5 h-5 object-contain pointer-events-none" />
                    ) : (
                      <div className="absolute left-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border border-white/10 border-dashed pointer-events-none" />
                    )}
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant/40 text-xs">▼</div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {tippsFreigeschaltet && !currentGesperrt && (
          <button
            onClick={handleSpeichernBonus}
            className="bg-primary-container text-on-primary-container w-full mt-2 py-2.5 rounded-lg font-mono text-xs font-bold uppercase tracking-wider hover:opacity-90 active:scale-95 transition-all shadow-[0_0_15px_rgba(var(--primary-rgb),0.1)]"
          >
            {gespeichert ? <span className="flex items-center justify-center gap-2"><Check size={14} /> {t('saved')}</span> : t('submitUpdateBonusTips')}
          </button>
        )}
      </div>
    </div>
  )
}

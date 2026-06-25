import { useState, useEffect } from 'react'
import { Trophy, ChevronDown, ChevronUp, Award } from 'lucide-react'
import { calculateLevelDetails, getLevelBadgeStyle } from '../../lib/utils'
import { useTranslation } from '../../utils/translations'
import { LevelBadge } from '../ui/LevelBadge'

function getRangTitelSystem(language: string) {
  // Using the exact 30 levels requested by the user
  return [
    { lvl: 1, title: 'Wasserholer', range: 'Lvl 1' },
    { lvl: 2, title: 'Çay-Bringer', range: 'Lvl 2' },
    { lvl: 3, title: 'Lellek', range: 'Lvl 3' },
    { lvl: 4, title: 'Alman-Tipper', range: 'Lvl 4' },
    { lvl: 5, title: 'Kreisliga-Bank', range: 'Lvl 5' },
    { lvl: 6, title: 'Balljunge', range: 'Lvl 6' },
    { lvl: 7, title: 'Schönwetter-Fan', range: 'Lvl 7' },
    { lvl: 8, title: 'Tipico-Spender', range: 'Lvl 8' },
    { lvl: 9, title: 'Kreisliga-Messi', range: 'Lvl 9' },
    { lvl: 10, title: 'Kreisklasse', range: 'Lvl 10' },
    { lvl: 11, title: 'Halbtags-Tipper', range: 'Lvl 11' },
    { lvl: 12, title: 'Tipico-Azubi', range: 'Lvl 12' },
    { lvl: 13, title: 'Stabil', range: 'Lvl 13' },
    { lvl: 14, title: 'Stammgast', range: 'Lvl 14' },
    { lvl: 15, title: 'Macher', range: 'Lvl 15' },
    { lvl: 16, title: 'Taktik-Fuchs', range: 'Lvl 16' },
    { lvl: 17, title: 'Ehrenmann', range: 'Lvl 17' },
    { lvl: 18, title: 'Chef-Analyst', range: 'Lvl 18' },
    { lvl: 19, title: 'Wett-Pate', range: 'Lvl 19' },
    { lvl: 20, title: 'Löwe', range: 'Lvl 20' },
    { lvl: 21, title: 'Speyer-Local', range: 'Lvl 21' },
    { lvl: 22, title: 'VIP-Tipper', range: 'Lvl 22' },
    { lvl: 23, title: 'Meister', range: 'Lvl 23' },
    { lvl: 24, title: 'Baba', range: 'Lvl 24' },
    { lvl: 25, title: 'Speyer-Patron', range: 'Lvl 25' },
    { lvl: 26, title: 'Maschine', range: 'Lvl 26' },
    { lvl: 27, title: 'Kral', range: 'Lvl 27' },
    { lvl: 28, title: 'Legende', range: 'Lvl 28' },
    { lvl: 29, title: 'Endgegner', range: 'Lvl 29' },
    { lvl: 30, title: 'Sechster Sinn', range: 'Lvl 30+' },
  ]
}

// Level icon based on rank
function LevelIcon({ size }: { size: number }) {
  return <Award size={size} />
}

interface LevelProgressCardProps {
  animatedPoints: number
  showLevelUpModal: boolean
  setShowLevelUpModal: (show: boolean) => void
}

export function LevelProgressCard({
  animatedPoints,
  showLevelUpModal,
  setShowLevelUpModal
}: LevelProgressCardProps) {
  const { t, language } = useTranslation()
  const [ranksExpanded, setRanksExpanded] = useState(false)
  const [achievementsCount, setAchievementsCount] = useState(() => {
    return parseInt(localStorage.getItem('superbet_achievements_count') || '0', 10)
  })

  // Listener für Achievement-Updates (wie in AppShell)
  useEffect(() => {
    const handleAchUpdate = () => {
      setAchievementsCount(parseInt(localStorage.getItem('superbet_achievements_count') || '0', 10))
    }
    window.addEventListener('achievements_updated', handleAchUpdate)
    return () => window.removeEventListener('achievements_updated', handleAchUpdate)
  }, [])

  const lvlDetails = calculateLevelDetails(animatedPoints, achievementsCount)
  const level = lvlDetails.level
  const xpCurrent = lvlDetails.xpCurrent
  const xpRequired = lvlDetails.xpRequired
  const xpPct = lvlDetails.xpPct
  const totalExp = lvlDetails.totalExp

  const rangTitelSystem = getRangTitelSystem(language)

  // Title based on level
  let levelTitle = rangTitelSystem[0].title
  let titleColor = 'text-slate-400'
  for (let i = rangTitelSystem.length - 1; i >= 0; i--) {
    if (level >= rangTitelSystem[i].lvl) {
      levelTitle = rangTitelSystem[i].title
      break
    }
  }

  if (level >= 13) { titleColor = 'text-red-400 animate-pulse font-black' }
  else if (level >= 11) { titleColor = 'text-purple-400 font-black' }
  else if (level >= 10) { titleColor = 'text-amber-400 font-bold' }
  else if (level >= 9) { titleColor = 'text-yellow-450 font-bold' }
  else if (level >= 7) { titleColor = 'text-emerald-450 font-bold' }
  else if (level >= 5) { titleColor = 'text-blue-400 font-bold' }
  else if (level >= 4) { titleColor = 'text-cyan-400 font-semibold' }
  else if (level >= 3) { titleColor = 'text-slate-300 font-medium' }
  else if (level >= 2) { titleColor = 'text-slate-400 font-medium' }

  return (
    <>
      {/* Fortschritts-Karte */}
      <div className="bg-surface-container-low border border-surface-container-high rounded-xl p-4 shadow-sm text-left stagger-in">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary-container/10 text-primary border border-primary-container/20">
              <LevelIcon size={20} />
            </div>
            <div className="text-left">
              <span className="text-[9px] font-mono text-on-surface-variant uppercase tracking-wider">
                {t('leagueProgress')}
              </span>
              <h3 className={`text-sm font-bold mt-0.5 ${titleColor}`}>{levelTitle}</h3>
            </div>
          </div>
          <LevelBadge level={level} className="h-10 w-10 rounded-xl shadow-inner border select-none">
            <span className="text-[7px] font-mono opacity-75 leading-none mt-0.5">LVL</span>
            <span className="text-[14px] leading-none mt-0.5 level-digit">{level}</span>
          </LevelBadge>
        </div>
        <div className="space-y-1.5">
          <div className="flex justify-between text-[10px] font-mono">
            <span className="text-on-surface-variant">
              {t('expTotal', { totalExp })}
            </span>
            <span className="text-primary font-bold">
              {t('expToLevel', { current: xpCurrent, required: xpRequired, level: level + 1 })}
            </span>
          </div>
          <div className="h-2.5 w-full bg-black/40 rounded-full overflow-hidden p-[1.5px] border border-white/10">
            <div 
              className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full transition-all duration-1000 ease-out shadow-[0_0_12px_rgba(251,191,36,0.5)]"
              style={{ width: `${xpPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Ränge & Level-Übersicht */}
      <div className="bg-surface-container-low border border-surface-container-high rounded-xl p-4 shadow-sm stagger-in">
        <button
          onClick={() => setRanksExpanded(!ranksExpanded)}
          className="w-full flex items-center justify-between focus:outline-none"
        >
          <div className="flex items-center gap-1.5">
            <Trophy size={13} className="text-on-surface-variant" />
            <p className="text-[9px] font-mono text-on-surface-variant uppercase tracking-wider">
              {t('ranksLevelOverview')}
            </p>
          </div>
          {ranksExpanded ? (
            <ChevronUp size={16} className="text-on-surface-variant" />
          ) : (
            <ChevronDown size={16} className="text-on-surface-variant" />
          )}
        </button>
        {ranksExpanded && (
          <div className="mt-4 space-y-2 animate-fade-in text-left">
            <p className="text-[9.5px] font-mono text-on-surface-variant leading-relaxed mb-3">
              {t('ranksLevelOverviewDesc')}
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-[380px] overflow-y-auto pr-1 pb-1">
              {rangTitelSystem.map(item => (
                <div key={item.lvl} className={`flex flex-col items-center justify-start p-2.5 rounded-lg border text-center transition-colors duration-250 ${
                  level >= item.lvl 
                    ? 'bg-surface-container-lowest border-surface-container-high' 
                    : 'bg-black/10 border-white/5'
                }`}>
                  <LevelBadge level={item.lvl} className="h-10 w-10 rounded-xl mb-2 border">
                    <span className="text-[7px] font-mono opacity-75 leading-none z-10 mt-0.5">LVL</span>
                    <span className="text-[14px] leading-none mt-0.5 level-digit z-10">{item.lvl}</span>
                  </LevelBadge>
                  <div className={level >= item.lvl ? 'opacity-100 w-full' : 'opacity-50 w-full'}>
                    <h5 className="font-bold text-on-surface leading-tight text-[10px] sm:text-[11px] line-clamp-2 break-words">{item.title}</h5>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Level-Up Modal */}
      {showLevelUpModal && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md animate-fade-in" onClick={() => setShowLevelUpModal(false)} />
          <div className="relative glass-panel border border-primary-container/40 rounded-2xl p-6 text-center max-w-sm w-full shadow-[0_0_50px_rgba(251,191,36,0.2)] animate-scale-in">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-primary-container/5 to-transparent pointer-events-none" />
            <div className="w-20 h-20 rounded-full bg-primary-container/15 border border-primary-container/30 flex items-center justify-center mx-auto mb-4 animate-bounce">
              <Award size={40} className="text-primary animate-pulse" />
            </div>
            <span className="text-[10px] font-mono text-primary uppercase tracking-[0.25em] font-black animate-pulse block">
              ✨ LEVEL UP! ✨
            </span>
            <h2 className="text-2xl font-black text-on-surface mt-2 mb-1">
              {t('levelTitle', { level })}
            </h2>
            <p className={`text-sm font-bold uppercase tracking-wider mb-4 ${titleColor}`}>
              {levelTitle}
            </p>
            <p className="text-xs text-on-surface-variant/80 leading-relaxed mb-6 font-mono">
              {t('levelUpModalDesc')}
            </p>
            <button
              onClick={() => setShowLevelUpModal(false)}
              className="w-full bg-primary-container text-on-primary font-mono font-bold text-xs py-3 rounded-lg uppercase tracking-wider hover:opacity-90 active:scale-95 transition-all shadow-[0_0_15px_rgba(251,191,36,0.15)] cursor-pointer text-center"
            >
              {t('levelUpModalBtn')}
            </button>
          </div>
        </div>
      )}
    </>
  )
}

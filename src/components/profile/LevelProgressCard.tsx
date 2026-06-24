import { useState, useEffect } from 'react'
import { Trophy, ChevronDown, ChevronUp, Award } from 'lucide-react'
import { calculateLevelDetails, getLevelBadgeStyle } from '../../lib/utils'
import { useTranslation } from '../../utils/translations'

function getRangTitelSystem(language: string) {
  if (language === 'tr') {
    return [
      { lvl: 1, title: 'Seyirci-Alman', desc: 'Sadece izliyor ve çekirdek çitliyorsun.', range: 'Lvl 1' },
      { lvl: 2, title: 'Stajyer Habibi', desc: 'Büfeci artık seni el sıkışarak selamlıyor.', range: 'Lvl 2' },
      { lvl: 3, title: 'Amatör Lig Kuzeni', desc: 'Yerin toprak sahada ama tahminlerin şimdiden oturmuş.', range: 'Lvl 3' },
      { lvl: 4, title: 'Amatör Futbolcu', desc: 'Futboldan anlıyorsun ama bacaklar artık gitmiyor.', range: 'Lvl 4' },
      { lvl: 5, title: 'Halı Saha Efsanesi', desc: 'Yapay çim tahminlerinden titriyor kardeşim.', range: 'Lvl 5-6' },
      { lvl: 7, title: 'Taktik Abisi', desc: 'Çay eşliğinde Mourinho gibi taktik analiz kasıyorsun.', range: 'Lvl 7-8' },
      { lvl: 9, title: 'Kupon Milyoneri', desc: 'Tahmin kuponu kendi kendine uçuyor. Sıradışı hisler!', range: 'Lvl 9' },
      { lvl: 10, title: 'Tahmincilerin Babası', desc: 'Kuzenler gece yarısı tüyo almak için seni arıyor.', range: 'Lvl 10' },
      { lvl: 11, title: 'Büfenin Patronu', desc: 'Büfe sanki tamamen seninmiş gibi hissediyorsun.', range: 'Lvl 11-12' },
      { lvl: 13, title: 'Mutlak Patron', desc: 'Son Canavar! Valla, sen bu sistemi çözmüşsün!', range: 'Lvl 13+' },
    ]
  } else if (language === 'en') {
    return [
      { lvl: 1, title: 'Spectator-Alman', desc: 'You are just watching and eating sunflower seeds.', range: 'Lvl 1' },
      { lvl: 2, title: 'Probationary Habibi', desc: 'The kiosk owner already greets you with a handshake.', range: 'Lvl 2' },
      { lvl: 3, title: 'Sunday League Couseng', desc: 'Your place is on the dirt pitch, but predictions are solid.', range: 'Lvl 3' },
      { lvl: 4, title: 'Amateur Player', desc: 'You have the knowledge, but the legs won\'t cooperate.', range: 'Lvl 4' },
      { lvl: 5, title: 'Astro Turf Legend', desc: 'The artificial grass trembles at your tips, brother.', range: 'Lvl 5-6' },
      { lvl: 7, title: 'Tactics Abi', desc: 'You analyze like Mourinho on steroids, but with tea.', range: 'Lvl 7-8' },
      { lvl: 9, title: 'Bet Slip Millionaire', desc: 'The bet slip flies by itself. Insane instinct!', range: 'Lvl 9' },
      { lvl: 10, title: 'Baba of all Tippers', desc: 'Cousins call you at night for prediction tips.', range: 'Lvl 10' },
      { lvl: 11, title: 'El Patron of the Kiosk', desc: 'You practically own the kiosk yourself.', range: 'Lvl 11-12' },
      { lvl: 13, title: 'The Ultimate Boss Maker', desc: 'Endboss! Wallah, you beat the entire system!', range: 'Lvl 13+' },
    ]
  }
  return [
    { lvl: 1, title: 'Zuschauer-Alman', desc: 'Du schaust nur zu und isst Sonnenblumenkerne.', range: 'Lvl 1' },
    { lvl: 2, title: 'Habibi auf Probe', desc: 'Kiosk-Besitzer grüßt dich jetzt schon mit Handshake.', range: 'Lvl 2' },
    { lvl: 3, title: 'Kreisliga-Couseng', desc: 'Dein Platz ist auf der Asche, aber die Tipps sitzen schon.', range: 'Lvl 3' },
    { lvl: 4, title: 'Amateur-Kicker', desc: 'Du hast Ahnung, aber die Beine wollen nicht mehr.', range: 'Lvl 4' },
    { lvl: 5, title: 'Halı Saha Legende', desc: 'Der Kunstrasen zittert vor deinen Tipps, Bruder.', range: 'Lvl 5-6' },
    { lvl: 7, title: 'Taktik-Abi', desc: 'Du analysierst wie Mourinho auf Koks, aber mit Cay.', range: 'Lvl 7-8' },
    { lvl: 9, title: 'Tippschein-Millionär', desc: 'Der Wettschein fliegt fast von alleine. Krankes Gespür!', range: 'Lvl 9' },
    { lvl: 10, title: 'Baba aller Tipper', desc: 'Cousengs rufen dich nachts an für Tipp-Empfehlungen.', range: 'Lvl 10' },
    { lvl: 11, title: 'El Patron des Kiosks', desc: 'Du besitzt den Kiosk gefühlt schon selbst.', range: 'Lvl 11-12' },
    { lvl: 13, title: 'Der absolute Boss-Macher', desc: 'Endgegner! Wallah, du hast das System durchgespielt!', range: 'Lvl 13+' },
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
          <div className={`h-10 w-10 rounded-xl flex flex-col items-center justify-center shadow-inner border select-none animate-level-glow ${getLevelBadgeStyle(level)}`}>
            <span className="text-[8px] font-mono opacity-80 uppercase leading-none font-bold">LVL</span>
            <span className="text-sm font-black font-mono leading-none mt-0.5">{level}</span>
          </div>
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
            <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
              {rangTitelSystem.map(item => (
                <div key={item.lvl} className={`flex items-start gap-3 p-2.5 rounded-lg border text-xs transition-colors duration-250 ${
                  level >= item.lvl 
                    ? 'bg-surface-container-lowest border-surface-container-high' 
                    : 'bg-black/10 border-white/5 opacity-40'
                }`}>
                  <div className={`h-8 w-8 rounded-lg flex flex-col items-center justify-center font-mono font-black flex-shrink-0 border ${getLevelBadgeStyle(item.lvl)}`}>
                    <span className="text-[6px] opacity-75 leading-none">LVL</span>
                    <span className="text-xs leading-none mt-0.5">{item.lvl}</span>
                  </div>
                  <div>
                    <h5 className="font-bold text-on-surface leading-tight">{item.title}</h5>
                    <p className="text-[10px] text-on-surface-variant/80 mt-0.5 leading-snug">{item.desc}</p>
                    <span className="text-[7px] font-mono uppercase tracking-wider text-primary-fixed-dim/60 mt-1 block">{item.range}</span>
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

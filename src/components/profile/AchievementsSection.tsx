import { useState, memo, useMemo, useEffect } from 'react'
import { Award, ChevronDown, ChevronUp, Lock, Check, Target } from 'lucide-react'
import { evaluateAchievements } from '../../utils/achievementEvaluator'
import type { TipDetails } from '../../utils/achievementEvaluator'
import { useAuthStore } from '../../stores/authStore'

interface AchievementBadgeProps {
  id: string
  unlocked: boolean
  rarity: 'common' | 'rare' | 'epic' | 'legendary' | 'toxic' | 'local'
}

const AchievementBadge = memo(function AchievementBadge({ id, unlocked, rarity }: AchievementBadgeProps) {
  // Rarity styling mapping
  const rarityColors = {
    common: 'border-slate-500/30 text-slate-400 shadow-[0_0_8px_rgba(148,163,184,0.15)]',
    rare: 'border-blue-500/30 text-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.2)]',
    epic: 'border-purple-500/30 text-purple-400 shadow-[0_0_12px_rgba(16,185,129,0.25)]',
    legendary: 'border-yellow-500/40 text-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.35)]',
    toxic: 'border-red-500/30 text-red-400 shadow-[0_0_10px_rgba(239,68,68,0.2)]',
    local: 'border-emerald-500/45 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
  }

  const borderClass = rarityColors[rarity] || rarityColors.common

  if (!unlocked) {
    return (
      <div className="relative w-14 h-14 p-1 flex items-center justify-center bg-black/85 border border-white/5 rounded-xl flex-shrink-0 shadow-inner opacity-30 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-300">
        <img 
          src={`${import.meta.env.BASE_URL}achievements/${id}.png`} 
          alt="" 
          className="w-full h-full object-contain rounded-lg" 
          loading="lazy"
        />
      </div>
    )
  }

  return (
    <div className={`relative w-14 h-14 p-1 flex items-center justify-center rounded-xl border bg-black ${borderClass} flex-shrink-0 transition-all duration-300 hover:scale-110 cursor-pointer`}>
      {/* Outer Ring */}
      <div className="absolute -inset-0.5 rounded-xl border border-white/5 opacity-20" />
      {/* Image Loader */}
      <img 
        src={`${import.meta.env.BASE_URL}achievements/${id}.png`} 
        alt="" 
        className="relative z-10 w-full h-full object-contain rounded-lg drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]" 
      />
    </div>
  )
})

interface AchievementsSectionProps {
  stats: { total: number; exact: number; diff: number; tend: number; miss: number; rate: number }
  exaktCount: number
  punkte: number
  userRank: number | null
  leagueCount: number
  isAdmin: boolean
  userTips: TipDetails[]
  avatarUrl: string | null
  username: string
  unlockedSet: Set<string>
  newlyUnlocked: Set<string>
}

export function AchievementsSection({
  stats,
  exaktCount,
  punkte,
  userRank,
  leagueCount,
  isAdmin,
  userTips,
  avatarUrl,
  username,
  unlockedSet,
  newlyUnlocked
}: AchievementsSectionProps) {
  const { user } = useAuthStore()

  const achievementsList = [
    // --- 1. Speyer Locals ---
    {
      id: 'domstadt_don',
      name: 'Domstadt-Don',
      desc: 'Du stehst nach mindestens 27 absolvierten Spielen auf Platz 1 der Gesamttabelle.',
      req: 'Platz 1 nach min. 27 getippten Spielen',
      rarity: 'local' as const
    },
    {
      id: 'brezelfest_kral',
      name: 'Brezelfest-Kral',
      desc: 'Du triffst 5 Spiele hintereinander exakt das richtige Ergebnis (4 Punkte).',
      req: '5 exakte Tipps in Folge',
      rarity: 'local' as const
    },
    {
      id: 'maxi_flaneur',
      name: 'Maxi-Flaneur',
      desc: 'Erreiche als Erster die Marke von 100 Gesamtpunkten in der Tipprunde.',
      req: 'Erreiche 100 Gesamtpunkte',
      rarity: 'local' as const
    },
    {
      id: 'schorle_cay',
      name: 'Schorle & Çay',
      desc: 'Gib am Freitagabend für alle anstehenden Spiele den richtigen Tendenztipp ab.',
      req: 'Alle Freitagsspiele Tendenz richtig (min. 2)',
      rarity: 'local' as const
    },
    {
      id: 'technik_museum',
      name: 'Technik-Museum',
      desc: 'Gib deinen Tipp in den letzten 5 Minuten vor dem Anpfiff ab.',
      req: 'Tippabgabe 0-5 Min vor Anpfiff',
      rarity: 'local' as const
    },
    {
      id: 'altpoertel_sniper',
      name: 'Altpörtel-Sniper',
      desc: 'Du tippst an einem Spieltag drei Auswärtssiege exakt richtig (4 Punkte).',
      req: '3 exakte Auswärtssiege an einem Spieltag',
      rarity: 'local' as const
    },
    {
      id: 'speyer_boss',
      name: 'Speyer-Boss',
      desc: 'Beende die gesamte Saison auf Platz 1 der Gesamttabelle.',
      req: 'Gesamtsieger am Saisonende',
      rarity: 'local' as const
    },
    // --- 2. Trash-Talk & Fails ---
    {
      id: 'vallah_krise',
      name: 'Vallah Krise',
      desc: 'Du holst an einem kompletten Spieltag exakt 0 Punkte (mindestens 3 Tipps abgegeben).',
      req: '0 Punkte an einem Spieltag (min. 3 Tipps)',
      rarity: 'toxic' as const
    },
    {
      id: 'kupon_yirtan',
      name: 'Kupon Yırtan',
      desc: 'Du tippst auf einen Heimsieg mit mindestens 2 Toren Differenz, aber das Team verliert das Spiel.',
      req: 'Sicherer Heimsieg-Tipp verliert (Differenz >= 2)',
      rarity: 'toxic' as const
    },
    {
      id: 'amk_modus',
      name: 'Amk-Modus',
      desc: 'Du liegst dreimal hintereinander um genau ein Tor daneben und bekommst nur die Tendenz.',
      req: '3x Tendenz in Folge, aber knapp am exakten Tipp vorbei',
      rarity: 'toxic' as const
    },
    {
      id: 'ters_koese',
      name: 'Ters Köşe',
      desc: 'Du tippst auf einen Heimsieg eines der Big 4 (GAL, FEN, BES, TRA), aber sie verlieren das Heimspiel.',
      req: 'Heimniederlage für Big 4 getippt & verloren',
      rarity: 'toxic' as const
    },
    {
      id: 'hayalet',
      name: 'Hayalet',
      desc: 'Du vergisst an drei aufeinanderfolgenden Spieltagen, deine Tipps abzugeben.',
      req: '3 Spieltage in Folge keine Tipps abgegeben',
      rarity: 'toxic' as const
    },
    {
      id: 'ugursuz',
      name: 'Uğursuz',
      desc: 'Du liegst in 3 aufeinanderfolgenden Spielen um genau ein Tor daneben.',
      req: '3x in Folge um genau 1 Tor daneben',
      rarity: 'toxic' as const
    },
    {
      id: 'kral_ciplak',
      name: 'Kral Çıplak',
      desc: 'Du holst an einem Spieltag weniger als 2 Punkte, nachdem du am vorherigen Spieltag mindestens 15 Punkte geholt hast.',
      req: '<= 2 Punkte nach Spieltag mit >= 15 Punkten',
      rarity: 'toxic' as const
    },
    {
      id: 'finito',
      name: 'Finito',
      desc: 'Beende die gesamte Saison auf dem allerletzten Platz der Tabelle.',
      req: 'Letzter Platz am Saisonende',
      rarity: 'toxic' as const
    },
    // --- 3. Süper Lig Culture ---
    {
      id: 'derby_baba',
      name: 'Derby-Baba',
      desc: 'Tippe das Ergebnis eines interkontinentalen Derbys (Galatasaray gegen Fenerbahçe) exakt richtig.',
      req: 'Exakter Tipp bei GS - FB Derby',
      rarity: 'rare' as const
    },
    {
      id: 'cim_bom_bom',
      name: 'Cim Bom Bom',
      desc: 'Erziele 3 exakte Tipps auf Siege von Galatasaray.',
      req: '3 exakte GS-Siege richtig getippt',
      rarity: 'common' as const
    },
    {
      id: 'fener_aglama',
      name: 'Fener Ağlama',
      desc: 'Erziele 3 exakte Tipps auf Siege von Fenerbahçe.',
      req: '3 exakte FB-Siege richtig getippt',
      rarity: 'common' as const
    },
    {
      id: 'kara_kartal',
      name: 'Kara Kartal',
      desc: 'Erziele 3 exakte Tipps auf Siege von Beşiktaş.',
      req: '3 exakte BJK-Siege richtig getippt',
      rarity: 'common' as const
    },
    {
      id: 'bize_her_yer_trabzon',
      name: 'Bize Her Yer Trabzon',
      desc: 'Erziele 3 exakte Tipps auf Siege von Trabzonspor.',
      req: '3 exakte TS-Siege richtig getippt',
      rarity: 'common' as const
    },
    {
      id: 'der_alman',
      name: 'Der Alman',
      desc: 'Tippe in den ersten 3 Derbys der Big 4 jeweils auf ein Unentschieden.',
      req: 'Erste 3 Big-4 Derbies Unentschieden getippt',
      rarity: 'rare' as const
    },
    {
      id: 'gurbetci',
      name: 'Gurbetçi',
      desc: 'Tippe jedes einzelne Spiel der gesamten Hinrunde (Spieltage 1-19).',
      req: 'Alle Hinrundenspiele getippt',
      rarity: 'epic' as const
    },
    {
      id: 'hadi_lan',
      name: 'Hadi Lan!',
      desc: 'Gib einen Tipp in der allerletzten Minute vor Anpfiff ab und erhalte Punkte.',
      req: 'Tippabgabe < 1 Min vor Anpfiff mit Punkten',
      rarity: 'rare' as const
    },
    // --- 4. Purer Flex ---
    {
      id: 'ilk_kan',
      name: 'İlk Kan',
      desc: 'Gib deinen allerersten Tipp in dieser Saison ab.',
      req: 'Erster abgegebener Tipp',
      rarity: 'common' as const
    },
    {
      id: 'hosgeldin_abi',
      name: 'Hoşgeldin Abi',
      desc: 'Vervollständige dein Profil, indem du ein Benutzerbild (Avatar) hochlädst.',
      req: 'Profilbild hochgeladen',
      rarity: 'common' as const
    },
    {
      id: 'macher',
      name: 'Macher',
      desc: 'Gib an 5 aufeinanderfolgenden Spieltagen Tipps für jedes einzelne Spiel ab.',
      req: 'Alle Spiele an 5 Spieltagen in Folge getippt',
      rarity: 'epic' as const
    },
    {
      id: 'kahin',
      name: 'Kahin',
      desc: 'Erziele an einem einzigen Spieltag mindestens 3 exakte Tippergebnisse (4 Punkte).',
      req: '3 exakte Tipps an einem Spieltag',
      rarity: 'legendary' as const
    },
    {
      id: 'son_dakika',
      name: 'Son Dakika',
      desc: 'Gib deinen Tipp in den letzten 5 Minuten vor dem Anpfiff ab und hole Punkte.',
      req: 'Last-Minute Tipp mit Punkten',
      rarity: 'rare' as const
    },
    {
      id: 'bereket',
      name: 'Bereket',
      desc: 'Tippe 5 Spiele der Big 4 in Folge richtig mit mindestens 2 Punkten.',
      req: '5x Big 4 in Folge richtig getippt (min. 2 Punkte)',
      rarity: 'epic' as const
    },
    {
      id: 'psikopat',
      name: 'Psikopat',
      desc: 'Tippe ein wildes Ergebnis mit mindestens 6 Toren (z.B. 4:2, 3:3, 5:1) exakt richtig.',
      req: 'Exakter Tipp bei Spiel mit >= 6 Toren oder Differenz >= 4',
      rarity: 'legendary' as const
    },
    {
      id: 'kebap_spiess',
      name: 'Kebap-Spieß',
      desc: 'Erziele an einem einzigen Spieltag 4 exakte Tippergebnisse (4 Punkte).',
      req: '4 exakte Tipps an einem Spieltag',
      rarity: 'legendary' as const
    },
    {
      id: 'sifir_sikinti',
      name: 'Sıfır Sıkıntı',
      desc: 'Hole in 10 aufeinanderfolgenden Spielen jeweils mindestens einen Punkt.',
      req: '10 Spiele in Folge Punkte erzielt',
      rarity: 'epic' as const
    },
    {
      id: 'gegen_den_strom',
      name: 'Gegen den Strom',
      desc: 'Tippe erfolgreich auf den Außenseiter gegen eines der Big 4 und hole Punkte.',
      req: 'Erfolgreicher Außenseiter-Tipp gegen Big 4',
      rarity: 'epic' as const
    },
    {
      id: 'kardesim_benim',
      name: 'Kardeşim Benim',
      desc: 'Tippe an einem Spieltag dreimal das exakt gleiche Ergebnis (z.B. 3x 2:1).',
      req: '3x gleiches Ergebnis an einem Spieltag getippt',
      rarity: 'common' as const
    }
  ]

  const unlockedCount = unlockedSet.size

  const sortedAchievementsList = useMemo(() => {
    return [...achievementsList].sort((a, b) => {
      const aUnlocked = unlockedSet.has(a.id)
      const bUnlocked = unlockedSet.has(b.id)
      if (aUnlocked && !bUnlocked) return -1
      if (!aUnlocked && bUnlocked) return 1
      return 0
    })
  }, [unlockedSet])

  // Speichere den Count im localStorage, damit andere Komponenten (wie AppShell) darauf zugreifen können
  useEffect(() => {
    localStorage.setItem('superbet_achievements_count', unlockedCount.toString())
    if (user?.id) {
      const storageKey = `superbet_unlocked_achievements_${user.id}`
      localStorage.setItem(storageKey, JSON.stringify(Array.from(unlockedSet)))
    }
    // Optional: Event dispatchen, falls AppShell sofort updaten soll
    window.dispatchEvent(new Event('achievements_updated'))
  }, [unlockedCount, unlockedSet, user])

  return (
    <div className="bg-surface-container-low border border-surface-container-high rounded-xl p-4 shadow-sm stagger-in">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-surface-container-high/60">
        <Award size={16} className="text-primary-fixed-dim" />
        <h3 className="text-xs font-mono text-on-surface uppercase tracking-wider font-bold">
          Meine Erfolge ({unlockedCount}/{achievementsList.length})
        </h3>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 animate-fade-in text-left">
          {sortedAchievementsList.map(ach => {
            const unlocked = unlockedSet.has(ach.id)
            const isNew = newlyUnlocked.has(ach.id)
            return (
              <div
                key={ach.id}
                className={`flex items-center gap-3 border rounded-xl p-2.5 transition-all duration-300 ${
                  unlocked
                    ? `bg-surface-container-lowest border-surface-container-high shadow-sm`
                    : 'bg-black/15 border-surface-container-high/40 opacity-45 text-on-surface-variant'
                }`}
              >
                <div className="relative">
                  <AchievementBadge id={ach.id} unlocked={unlocked} rarity={ach.rarity} />
                  {isNew && (
                    <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-[#1E1E1E] animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)] z-20" />
                  )}
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-between h-full py-0.5">
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <h4 className={`text-[12px] font-bold truncate leading-tight ${unlocked ? 'text-on-surface' : 'text-on-surface-variant'}`}>
                        {ach.name}
                      </h4>
                      {unlocked ? (
                        <span className="flex items-center gap-1 text-[7px] font-mono uppercase tracking-wider text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded border border-green-500/20 font-bold shrink-0">
                          <Check size={8} strokeWidth={3} /> Freigeschaltet
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[7px] font-mono uppercase tracking-wider text-slate-400 bg-slate-500/10 px-1.5 py-0.5 rounded border border-slate-500/20 shrink-0 font-bold">
                          <Lock size={8} strokeWidth={3} /> Gesperrt
                        </span>
                      )}
                    </div>
                    <p className={`text-[10px] leading-snug font-normal ${unlocked ? 'text-on-surface-variant' : 'text-on-surface-variant/60'}`}>
                      {ach.desc}
                    </p>
                  </div>
                  <div className={`flex items-start gap-1.5 mt-2.5 p-1.5 rounded-lg border ${unlocked ? 'bg-primary-container/20 border-primary/20 text-primary-fixed-dim' : 'bg-surface-container border-surface-container-high text-on-surface-variant/70'}`}>
                    <Target size={12} className="shrink-0 mt-0.5" />
                    <span className="text-[8.5px] font-mono leading-snug font-semibold">
                      <span className="uppercase tracking-wider opacity-70 block text-[7px] mb-0.5">Mission</span>
                      {ach.req}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
    </div>
  )
}

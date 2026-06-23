import { useState, memo, useMemo, useEffect } from 'react'
import { Award, ChevronDown, ChevronUp, Lock, Check, Target } from 'lucide-react'
import { evaluateAchievements } from '../../utils/achievementEvaluator'
import type { TipDetails } from '../../utils/achievementEvaluator'

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
    epic: 'border-purple-500/30 text-purple-400 shadow-[0_0_12px_rgba(168,85,247,0.25)]',
    legendary: 'border-yellow-500/40 text-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.35)]',
    toxic: 'border-red-500/30 text-red-400 shadow-[0_0_10px_rgba(239,68,68,0.2)]',
    local: 'border-emerald-500/45 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
  }

  const borderClass = rarityColors[rarity] || rarityColors.common

  if (!unlocked) {
    return (
      <div className="relative w-14 h-14 p-1 flex items-center justify-center bg-black/85 border border-white/5 rounded-xl flex-shrink-0 shadow-inner opacity-30 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-300">
        <img 
          src={`/achievements/${id}.png`} 
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
        src={`/achievements/${id}.png`} 
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
      desc: '5 exakte Tipps (4 Pkt.) in Folge richtig getippt. Purer Rausch!',
      req: '5 exakte Tipps in Folge treffen',
      rarity: 'local' as const
    },
    {
      id: 'maxi_flaneur',
      name: 'Maxi-Flaneur',
      desc: 'Erreiche die krasse 100-Gesamtpunkte-Marke in der Liga.',
      req: '100 Gesamtpunkte erreichen',
      rarity: 'local' as const
    },
    {
      id: 'schorle_und_cay',
      name: 'Schorle & Çay',
      desc: 'An einem Freitagabend alle abgegebenen Spiele (mindestens 2) richtig getippt (Tendenz).',
      req: 'Min. 2 Freitagsspiele erfolgreich tippen',
      rarity: 'local' as const
    },
    {
      id: 'technik_museum',
      name: 'Technik-Museum',
      desc: 'Frühaufsteher: 5 Mal deine Tipps mehr als 48 Stunden vor Anpfiff abgegeben.',
      req: '5 Mal Tipps über 48h vor Anpfiff eintragen',
      rarity: 'local' as const
    },
    {
      id: 'altpoertel_sniper',
      name: 'Altpörtel-Sniper',
      desc: '3 Auswärtssiege an einem einzigen Spieltag exakt (4 Pkt.) getippt.',
      req: '3 Auswärtssiege exakt an einem Spieltag',
      rarity: 'local' as const
    },
    {
      id: 'speyer_boss',
      name: 'Speyer-Boss',
      desc: 'Gesamtsieger (Platz 1) am Ende der Saison (über 300 absolvierte Spiele).',
      req: 'Saison als Platz 1 beenden',
      rarity: 'local' as const
    },

    // --- 2. Trash-Talk & Fails ---
    {
      id: 'vallah_krise',
      name: 'Vallah Krise',
      desc: 'Mindestens 3 Spiele an einem Spieltag getippt und am Ende exakt 0 Punkte geholt.',
      req: '0 Punkte an einem kompletten Spieltag',
      rarity: 'toxic' as const
    },
    {
      id: 'kupon_yirtan',
      name: 'Kupon Yırtan',
      desc: 'Du tippst einen Sieg um 2+ Tore, aber dein favorisiertes Team verliert.',
      req: 'Favorisiertes Team verliert trotz 2+ Tore Tipp',
      rarity: 'toxic' as const
    },
    {
      id: 'amk_modus',
      name: 'Amk-Modus',
      desc: '3x in Folge die Tordifferenz um exakt 1 Tor verfehlt (nur Tendenz = 2 Pkt).',
      req: '3x in Folge Tordifferenz um 1 Tor verpassen',
      rarity: 'toxic' as const
    },
    {
      id: 'ters_koese',
      name: 'Ters Köşe',
      desc: 'Auf den klaren Heimsieg eines Big 4 Teams getippt und sie verlieren.',
      req: 'Heimniederlage eines Topteams getippt',
      rarity: 'toxic' as const
    },
    {
      id: 'hayalet',
      name: 'Hayalet (Gespenst)',
      desc: '3 Spieltage in Folge komplett vergessen, deine Tipps abzugeben.',
      req: 'Vergiss 3 Spieltage hintereinander das Tippen',
      rarity: 'toxic' as const
    },
    {
      id: 'ugursuz',
      name: 'Uğursuz',
      desc: 'Pechvogel: 3x hintereinander ein exaktes Ergebnis um genau ein Tor verpasst.',
      req: '3x hintereinander ein Tor am Exaktergebnis vorbei',
      rarity: 'toxic' as const
    },
    {
      id: 'kral_ciplak',
      name: 'Kral Çıplak',
      desc: 'Höchstens 2 Punkte an einem Spieltag geholt, nachdem du zuvor zweistellig abgeräumt hast (abgestürzt).',
      req: 'Max. 2 Punkte nach starkem Spieltag',
      rarity: 'toxic' as const
    },
    {
      id: 'finito',
      name: 'Finito',
      desc: 'Die Saison (nach über 300 absolvierten Spielen) auf dem allerletzten Platz der Liga beendet.',
      req: 'Letzter Platz am Ende der Saison',
      rarity: 'toxic' as const
    },

    // --- 3. Süper Lig Culture ---
    {
      id: 'derby_baba',
      name: 'Derby-Baba',
      desc: 'Das Ergebnis bei Galatasaray vs. Fenerbahçe exakt (4 Pkt.) richtig getippt.',
      req: 'Triff das Interkontinentale Derby exakt',
      rarity: 'epic' as const
    },
    {
      id: 'cim_bom_bom',
      name: 'Cim Bom Bom',
      desc: '3 Mal den Sieg von Galatasaray exakt (4 Pkt.) richtig getippt.',
      req: '3x Galatasaray-Sieg exakt treffen',
      rarity: 'rare' as const
    },
    {
      id: 'fener_aglama',
      name: 'Fener Ağlama',
      desc: '3 Mal den Sieg von Fenerbahçe exakt (4 Pkt.) richtig getippt.',
      req: '3x Fenerbahçe-Sieg exakt treffen',
      rarity: 'rare' as const
    },
    {
      id: 'kara_kartal',
      name: 'Kara Kartal',
      desc: '3 Mal den Sieg von Beşiktaş exakt (4 Pkt.) richtig getippt.',
      req: '3x Beşiktaş-Sieg exakt treffen',
      rarity: 'rare' as const
    },
    {
      id: 'bize_her_yer_trabzon',
      name: 'Bize Her Yer Trabzon',
      desc: '3 Mal den Sieg von Trabzonspor exakt (4 Pkt.) richtig getippt.',
      req: '3x Trabzonspor-Sieg exakt treffen',
      rarity: 'rare' as const
    },
    {
      id: 'der_alman',
      name: 'Der Alman',
      desc: 'Sicherheits-Abi: Du tippst bei jedem großen Derby immer Unentschieden.',
      req: 'Tippe Unentschieden bei allen Derbies',
      rarity: 'common' as const
    },
    {
      id: 'gurbetci',
      name: 'Gurbetçi',
      desc: 'Lückenlos: Du hast die komplette Hinrunde (Spieltag 1 bis 19) komplett durchgetippt.',
      req: 'Tippe alle Spiele der gesamten Hinrunde',
      rarity: 'epic' as const
    },
    {
      id: 'hadi_lan',
      name: 'Hadi Lan!',
      desc: 'Last-Minute: Tippe in den letzten 60 Sekunden vor Anpfiff und hole Punkte.',
      req: 'Tippänderung in der allerletzten Minute',
      rarity: 'rare' as const
    },

    // --- 4. Purer Flex ---
    {
      id: 'hosgeldin_abi',
      name: 'Hoşgeldin Abi',
      desc: 'Profil komplett ausgefüllt und eigenes Profilbild hochgeladen.',
      req: 'Profilbild & Benutzername einrichten',
      rarity: 'common' as const
    },
    {
      id: 'ilk_kan',
      name: 'İlk Kan (First Blood)',
      desc: 'Deinen allerersten Tipp in der Tipprunden-App abgegeben.',
      req: 'Gib deinen ersten Tipp ab',
      rarity: 'common' as const
    },
    {
      id: 'macher',
      name: 'Macher',
      desc: 'An 5 Spieltagen in Folge jedes einzelne Spiel getippt. Nur Taten zählen!',
      req: '5 Spieltage am Stück voll tippen',
      rarity: 'epic' as const
    },
    {
      id: 'kahin',
      name: 'Kahin (Der Seher)',
      desc: 'Mindestens 3 exakte Ergebnisse an einem einzigen Spieltag richtig getippt.',
      req: 'Hol 3x exakt 4 Punkte an einem Spieltag',
      rarity: 'epic' as const
    },
    {
      id: 'son_dakika',
      name: 'Son Dakika',
      desc: 'Tipp in den letzten 5 Minuten vor Anpfiff abgegeben und gepunktet.',
      req: 'Tippe kurz vor Anpfiff und punkte',
      rarity: 'rare' as const
    },
    {
      id: 'bereket',
      name: 'Bereket',
      desc: '5x in Folge bei Spielen der Big 4 Mannschaften Punkte geholt. Segen!',
      req: '5x hintereinander bei den Big 4 punkten',
      rarity: 'legendary' as const
    },
    {
      id: 'psikopat',
      name: 'Psikopat',
      desc: 'Triff ein wildes Ergebnis (insg. >= 6 Tore oder ein Team schießt >= 4 Tore) exakt.',
      req: 'Triff ein wildes torfreiches Ergebnis exakt',
      rarity: 'legendary' as const
    },
    {
      id: 'kebap_spiess',
      name: 'Kebap-Spieß',
      desc: 'Gönnung: 4 Spiele an einem einzigen Spieltag exakt richtig getippt.',
      req: 'Triff 4 Spiele an einem Spieltag exakt (16 Pkt.)',
      rarity: 'legendary' as const
    },
    {
      id: 'sifir_sikinti',
      name: 'Sıfır Sıkıntı',
      desc: 'Lauf: In 10 aufeinanderfolgenden Spielen jeweils Punkte mitgenommen.',
      req: 'Punkte in 10 aufeinanderfolgenden Spielen',
      rarity: 'epic' as const
    },
    {
      id: 'gegen_den_strom',
      name: 'Gegen den Strom',
      desc: 'Tippe auf den Sieg des Underdogs gegen ein Big-Team und punkte damit.',
      req: 'Erfolgreicher Außenseitertipp gegen Favoriten',
      rarity: 'legendary' as const
    },
    {
      id: 'kardesim_benim',
      name: 'Kardeşim Benim',
      desc: 'Copycat: Tippe am selben Spieltag mindestens 3 Mal das exakt gleiche Ergebnis.',
      req: 'Gib 3x das gleiche Spielergebnis ab (z.B. 2:1)',
      rarity: 'epic' as const
    }
  ]

  const unlockedCount = achievementsList.filter(a => unlockedSet.has(a.id)).length

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
    // Optional: Event dispatchen, falls AppShell sofort updaten soll
    window.dispatchEvent(new Event('achievements_updated'))
  }, [unlockedCount])

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

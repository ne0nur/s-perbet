/**
 * Berechnet die Punkte für einen Tipp anhand des tatsächlichen Ergebnisses.
 * 4P = Exaktes Ergebnis
 * 3P = Richtige Tordifferenz (oder exaktes Unentschieden)
 * 2P = Richtige Tendenz (richtiger Sieger)
 * 0P = Daneben
 */
export function berechnePunkte(
  tippHeim: number, tippGast: number,
  toreHeim: number, toreGast: number
): number {
  const d = Math.abs(tippHeim - toreHeim) + Math.abs(tippGast - toreGast)
  const tendenzStimmt = Math.sign(tippHeim - tippGast) === Math.sign(toreHeim - toreGast)

  if (tendenzStimmt) {
    if (d === 0) return 4
    if (d === 1) return 3
    if (d === 2) return 2
    return 1
  } else {
    if (d <= 1) return 0
    if (d <= 3) return -1
    return -2
  }
}

export function calculateLevelDetails(punkte: number, achievementsCount: number = 0, bonusTippsCount: number = 0) {
  // Nur positive Punkte geben EXP — 0 und Minuspunkte geben nichts
  const calculatedExp = (Math.max(0, punkte) * 10) + (achievementsCount * 50) + (bonusTippsCount * 50)
  const totalExp = Math.max(0, calculatedExp)
  
  let remainingExp = totalExp
  let level = 1
  let xpRequired = 80 + (level * 8) // Smooth curve: reaches Lvl 30 at ~5800 EXP (balanced for 1 season)
  
  while (remainingExp >= xpRequired) {
    remainingExp -= xpRequired
    level++
    xpRequired = 80 + (level * 8)
  }
  
  const xpCurrent = remainingExp
  const xpPct = (xpCurrent / xpRequired) * 100
  return { level, xpCurrent, xpRequired, xpPct, totalExp }
}

export function getRangTitelSystem(language: string) {
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

export function calculateLevel(punkte: number, achievementsCount: number = 0, bonusTippsCount: number = 0): number {
  return calculateLevelDetails(punkte, achievementsCount, bonusTippsCount).level
}

export function getLevelBadgeStyle(level: number): string {
  // ═══════════════════════════════════════════════
  //  TIERED BADGE SYSTEM — 30 Level Erweiterung
  //  Font: Geist Black Italic (fett, breit)
  // ═══════════════════════════════════════════════

  // ── LVL 30 🌌 SECHSTER SINN (GOJO SATORU - Majestic Infinity) ──
  if (level >= 30) {
    return 'badge-sweep badge-gojo text-cyan-50 font-geist font-black italic tracking-[0.06em]'
  }
  // ── LVL 27-29 👑 MYTHIC (Amethyst: Purple/Pink) ──
  if (level >= 27) {
    return 'badge-sweep badge-amethyst text-purple-100 font-geist font-black italic tracking-[0.06em]'
  }
  // ── LVL 24-26 💎 DIAMOND (Sapphire: Deep Blue/Cyan) ──
  if (level >= 24) {
    return 'badge-sweep badge-sapphire text-cyan-100 font-geist font-black italic tracking-[0.06em]'
  }
  // ── LVL 20-23 🔥 PLATINUM (Ruby: Crimson/Amber) ──
  if (level >= 20) {
    return 'badge-sweep badge-ruby text-amber-100 font-geist font-black italic tracking-[0.06em]'
  }
  // ── LVL 15-19 🏆 GOLD (Amber/Yellow) ──
  if (level >= 15) {
    return 'bg-gradient-to-br from-yellow-950 via-amber-900 to-yellow-950 border border-yellow-500/50 text-amber-200 ring-2 ring-yellow-500/30 shadow-[0_0_15px_rgba(234,179,8,0.4)] animate-level-glow-wobble font-geist font-black italic tracking-[0.05em]'
  }
  // ── LVL 10-14 🌿 EMERALD (Green/Teal) ──
  if (level >= 10) {
    return 'bg-gradient-to-br from-emerald-950 to-teal-900 border border-emerald-500/40 text-emerald-200 ring-1 ring-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.3)] animate-level-glow-fast font-geist font-black italic tracking-[0.04em]'
  }
  // ── LVL 5-9 💧 SAPPHIRE BASIC (Blue/Cyan) ──
  if (level >= 5) {
    return 'bg-gradient-to-br from-blue-950 to-cyan-950 border border-blue-500/30 text-blue-200 shadow-[0_0_8px_rgba(59,130,246,0.2)] animate-level-glow font-geist font-bold italic tracking-[0.04em]'
  }
  // ── LVL 1-4 🪨 SLATE (Gray/Steel) ──
  return 'bg-slate-900 border border-slate-700/50 text-slate-300 font-geist font-medium'
}

export function getTournamentLogo(tournamentName: string): string {
  const base = import.meta.env.BASE_URL || '/'
  const cleanName = tournamentName ? tournamentName.toLowerCase() : ''

  // Exakte Matches zuerst
  if (cleanName === 'champions league' || cleanName.includes('champions league')) {
    return `${base}logos/UEFA_Champions_League_logo.png`
  }
  if (cleanName === 'süper lig' || cleanName.includes('süper lig')) {
    return `${base}logos/Süper_Lig.png`
  }
  if (cleanName.includes('europa league')) {
    return `${base}logos/UEFA_Europa_League_logo.png`
  }

  // World Cup / WM
  if (cleanName.includes('world cup') || cleanName.includes('wm ') || cleanName === 'wm') {
    return 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/10/FIFA_World_Cup_2026_Logo.png/320px-FIFA_World_Cup_2026_Logo.png'
  }

  // Teil-Matches: suche nach bekannten Turnier-Logos
  const knownLogos: Record<string, string> = {
    'bundesliga': 'Bundesliga_logo.png',
    'premier league': 'Premier_League_logo.png',
    'la liga': 'La_Liga_logo.png',
    'serie a': 'Serie_A_logo.png',
    'ligue 1': 'Ligue_1_logo.png',
    'europa': 'UEFA_Europa_League_logo.png',
    'conference': 'UEFA_Conference_League_logo.png',
    'nations league': 'UEFA_Nations_League_logo.png',
  }

  for (const [key, file] of Object.entries(knownLogos)) {
    if (cleanName.includes(key)) return `${base}logos/${file}`
  }

  return `${base}logos/soccer_ball.png`
}


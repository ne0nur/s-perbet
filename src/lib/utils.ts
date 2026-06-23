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
  if (tippHeim === toreHeim && tippGast === toreGast) return 4
  if ((tippHeim - tippGast) === (toreHeim - toreGast)) return 3
  if (Math.sign(tippHeim - tippGast) === Math.sign(toreHeim - toreGast)) return 2
  return 0
}

export function calculateLevelDetails(punkte: number, achievementsCount: number = 0, bonusTippsCount: number = 0) {
  const totalExp = (punkte * 10) + (achievementsCount * 50) + (bonusTippsCount * 50)
  
  let remainingExp = totalExp
  let level = 1
  let xpRequired = 50 * level // Level 1->2 braucht 50, 2->3 braucht 100, etc.
  
  while (remainingExp >= xpRequired) {
    remainingExp -= xpRequired
    level++
    xpRequired = 50 * level
  }
  
  const xpCurrent = remainingExp
  const xpPct = (xpCurrent / xpRequired) * 100
  return { level, xpCurrent, xpRequired, xpPct, totalExp }
}

export function calculateLevel(punkte: number, achievementsCount: number = 0, bonusTippsCount: number = 0): number {
  return calculateLevelDetails(punkte, achievementsCount, bonusTippsCount).level
}

export function getLevelBadgeStyle(level: number): string {
  if (level >= 13) {
    return 'bg-gradient-to-br from-red-900 to-red-950 border border-red-500 text-red-100 shadow-[0_0_20px_rgba(239,68,68,1.0),_0_0_8px_rgba(251,191,36,0.5)] font-mono font-black animate-pulse'
  }
  if (level >= 11) {
    return 'bg-gradient-to-br from-purple-900 to-indigo-950 border border-purple-400 text-purple-200 shadow-[0_0_15px_rgba(167,139,250,0.85)] font-mono font-black'
  }
  if (level >= 10) {
    return 'bg-gradient-to-br from-amber-900 to-amber-950 border border-amber-400 text-amber-200 shadow-[0_0_12px_rgba(245,158,11,0.8)] font-mono font-black'
  }
  if (level >= 9) {
    return 'bg-gradient-to-br from-amber-950 to-yellow-950 border border-yellow-450 text-yellow-300 shadow-[0_0_10px_rgba(234,179,8,0.75)] font-mono font-bold'
  }
  if (level >= 7) {
    return 'bg-gradient-to-br from-emerald-950 to-emerald-900 border border-emerald-400 text-emerald-200 shadow-[0_0_8px_rgba(16,185,129,0.7)] font-mono font-bold'
  }
  if (level >= 5) {
    return 'bg-gradient-to-br from-blue-950 to-blue-900 border border-blue-400 text-blue-200 shadow-[0_0_7px_rgba(59,130,246,0.6)] font-mono font-bold'
  }
  if (level >= 3) {
    return 'bg-gradient-to-br from-cyan-950 to-cyan-900 border border-cyan-400 text-cyan-200 shadow-[0_0_6px_rgba(34,211,238,0.5)] font-mono font-bold'
  }
  if (level >= 2) {
    return 'bg-slate-800 border border-slate-500 text-slate-200 shadow-[0_0_4px_rgba(148,163,184,0.3)] font-mono font-medium'
  }
  return 'bg-slate-900 border border-slate-700 text-slate-400 shadow-[0_0_2px_rgba(71,85,105,0.2)] font-mono'
}

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
  // ── EMPEROR (Lvl 13+) ── Red/Gold double-pulse, max aura, ring glow ──
  if (level >= 13) {
    return 'bg-gradient-to-br from-red-900 via-rose-900 to-amber-950 border border-red-400/70 text-red-50 shadow-[0_0_32px_rgba(239,68,68,0.95),0_0_12px_rgba(251,191,36,0.6)] ring-2 ring-red-400/40 animate-emperor font-mono font-black'
  }
  // ── SULTAN (Lvl 12) ── Purple-magenta, strong aura ──
  if (level >= 12) {
    return 'bg-gradient-to-br from-purple-900 via-fuchsia-950 to-indigo-950 border border-purple-300/60 text-purple-100 shadow-[0_0_28px_rgba(192,132,252,0.85),0_0_8px_rgba(167,139,250,0.5)] ring-2 ring-purple-400/35 animate-level-glow font-mono font-black'
  }
  // ── SULTAN (Lvl 11) ── Purple-indigo, strong glow ──
  if (level >= 11) {
    return 'bg-gradient-to-br from-purple-900 to-indigo-950 border border-purple-400/55 text-purple-200 shadow-[0_0_24px_rgba(167,139,250,0.8),0_0_6px_rgba(129,140,248,0.4)] ring-2 ring-purple-400/30 animate-level-glow font-mono font-black'
  }
  // ── NOSTRADAMUS ⚡ (Lvl 10) ── EXTRA: amber-orange, pulsing aura ring, breathing gradient ──
  if (level >= 10) {
    return 'bg-gradient-to-br from-amber-800 via-orange-900 to-amber-950 border border-amber-300/60 text-amber-50 shadow-[0_0_28px_rgba(245,158,11,0.9),0_0_10px_rgba(251,191,36,0.55)] ring-2 ring-amber-400/40 animate-nostradamus font-mono font-black'
  }
  // ── BARON (Lvl 9) ── Amber-gold, aura ring ──
  if (level >= 9) {
    return 'bg-gradient-to-br from-amber-950 to-yellow-950 border border-yellow-450/60 text-amber-200 shadow-[0_0_22px_rgba(234,179,8,0.75),0_0_6px_rgba(250,204,21,0.4)] ring-1 ring-amber-400/30 animate-level-glow font-mono font-bold'
  }
  // ── ORAKEL (Lvl 8) ── Emerald, strong glow, aura ring ──
  if (level >= 8) {
    return 'bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-950 border border-emerald-400/55 text-emerald-100 shadow-[0_0_20px_rgba(16,185,129,0.8),0_0_6px_rgba(45,212,191,0.35)] ring-1 ring-emerald-400/25 animate-level-glow font-mono font-bold'
  }
  // ── ORAKEL (Lvl 7) ── Emerald, solid glow ──
  if (level >= 7) {
    return 'bg-gradient-to-br from-emerald-950 to-emerald-900 border border-emerald-400/50 text-emerald-200 shadow-[0_0_16px_rgba(16,185,129,0.7),0_0_4px_rgba(52,211,153,0.3)] animate-level-glow font-mono font-bold'
  }
  // ── FELDWEBEL (Lvl 6) ── Blue, brighter glow, subtle aura ring ──
  if (level >= 6) {
    return 'bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-950 border border-blue-400/45 text-blue-100 shadow-[0_0_14px_rgba(59,130,246,0.65),0_0_4px_rgba(96,165,250,0.3)] ring-1 ring-blue-400/20 animate-level-glow font-mono font-bold'
  }
  // ── FELDWEBEL (Lvl 5) ── Blue, first aura ring ──
  if (level >= 5) {
    return 'bg-gradient-to-br from-blue-950 to-blue-900 border border-blue-400/40 text-blue-200 shadow-[0_0_12px_rgba(59,130,246,0.55),0_0_3px_rgba(96,165,250,0.25)] ring-1 ring-blue-400/15 animate-level-glow font-mono font-bold'
  }
  // ── COUSENG (Lvl 4) ── Teal, brighter glow ──
  if (level >= 4) {
    return 'bg-gradient-to-br from-teal-950 to-cyan-950 border border-teal-400/40 text-teal-200 shadow-[0_0_10px_rgba(45,212,191,0.45),0_0_2px_rgba(34,211,238,0.2)] animate-level-glow font-mono font-semibold'
  }
  // ── FUSSSOLDAT (Lvl 3) ── Cyan, first minimal glow ──
  if (level >= 3) {
    return 'bg-gradient-to-br from-cyan-950 to-slate-900 border border-cyan-400/35 text-cyan-300 shadow-[0_0_8px_rgba(34,211,238,0.35),0_0_2px_rgba(34,211,238,0.15)] animate-level-glow font-mono font-semibold'
  }
  // ── PRAKTIKANT (Lvl 2) ── Subtle slate highlight ──
  if (level >= 2) {
    return 'bg-slate-800 border border-slate-500/60 text-slate-200 shadow-[0_0_5px_rgba(148,163,184,0.2)] font-mono font-medium'
  }
  // ── SPUCKER (Lvl 1) ── Plain, no glow ──
  return 'bg-slate-900 border border-slate-700/50 text-slate-400 font-mono'
}

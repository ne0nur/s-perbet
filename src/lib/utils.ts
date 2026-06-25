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
  // ═══════════════════════════════════════════════
  //  TIERED BADGE SYSTEM — Jedes Level stärker
  //  Font: Geist Black Italic (fett, breit)
  // ═══════════════════════════════════════════════

  // ── LVL 13 👑 EMPEROR: Alles kombiniert ──
  if (level >= 13) {
    return 'badge-sweep badge-emperor text-amber-300 font-geist font-black italic tracking-[0.06em]'
  }
  // ── LVL 12 💎 SULTAN+: Fuchsia-Magenta, triple ring, schnellster Chroma-Pulse ──
  if (level >= 12) {
    return 'badge-sweep badge-sultan-plus text-fuchsia-100 font-geist font-black italic tracking-[0.06em]'
  }
  // ── LVL 11 ⚔️ SULTAN: Purple-Fuchsia, Chroma-Shift — STÄRKER ALS 10 ──
  if (level >= 11) {
    return 'badge-sweep badge-sultan text-purple-100 font-geist font-black italic tracking-[0.06em]'
  }
  // ── LVL 10 ⚡ NOSTRADAMUS: Amber-Orange, 4-Phasen Wobble, doppelter Aura-Ring ──
  if (level >= 10) {
    return 'badge-sweep badge-nostradamus text-amber-100 font-geist font-black italic tracking-[0.06em]'
  }
  // ── LVL 9 🏛️ BARON: Amber-Gold, Wobble-Pulse, doppelter Shadow ──
  if (level >= 9) {
    return 'bg-gradient-to-br from-amber-950 via-yellow-950 to-amber-900 border-2 border-yellow-400/55 text-amber-100 shadow-[0_0_26px_rgba(234,179,8,0.9),0_0_10px_rgba(250,204,21,0.5)] ring-2 ring-amber-400/35 animate-level-glow-wobble font-geist font-black italic tracking-[0.05em]'
  }
  // ── LVL 8 🔮 ORAKEL II: Emerald-Teal, Wobble, starker Aura-Ring ──
  if (level >= 8) {
    return 'bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-950 border-2 border-emerald-400/55 text-emerald-50 shadow-[0_0_24px_rgba(16,185,129,0.9),0_0_10px_rgba(45,212,191,0.45)] ring-2 ring-emerald-400/30 animate-level-glow-wobble font-geist font-black italic tracking-[0.05em]'
  }
  // ── LVL 7 🧿 ORAKEL I: Emerald, satter Glow, erster Wobble ──
  if (level >= 7) {
    return 'bg-gradient-to-br from-emerald-950 to-emerald-900 border-2 border-emerald-400/50 text-emerald-100 shadow-[0_0_20px_rgba(16,185,129,0.8),0_0_6px_rgba(52,211,153,0.35)] ring-1 ring-emerald-400/25 animate-level-glow-wobble font-geist font-black italic tracking-[0.04em]'
  }
  // ── LVL 6 🎖️ FELDWEBEL II: Blue-Indigo, schnelles Atmen, Aura-Ring ──
  if (level >= 6) {
    return 'bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-950 border-2 border-blue-400/50 text-blue-50 shadow-[0_0_18px_rgba(59,130,246,0.8),0_0_6px_rgba(96,165,250,0.4)] ring-2 ring-blue-400/25 animate-level-glow-fast font-geist font-black italic tracking-[0.04em]'
  }
  // ── LVL 5 🪖 FELDWEBEL I: Blue, erste Aura ──
  if (level >= 5) {
    return 'bg-gradient-to-br from-blue-950 to-blue-900 border-2 border-blue-400/45 text-blue-100 shadow-[0_0_14px_rgba(59,130,246,0.65),0_0_4px_rgba(96,165,250,0.3)] ring-1 ring-blue-400/20 animate-level-glow-fast font-geist font-black italic tracking-[0.04em]'
  }
  // ── LVL 4 🎫 COUSENG: Teal, stärkeres Atmen ──
  if (level >= 4) {
    return 'bg-gradient-to-br from-teal-950 to-cyan-950 border-2 border-teal-400/45 text-teal-100 shadow-[0_0_12px_rgba(45,212,191,0.55),0_0_4px_rgba(34,211,238,0.25)] animate-level-glow font-geist font-black italic tracking-[0.03em]'
  }
  // ── LVL 3 ⚽ FUSSSOLDAT: Cyan, erster Glow ──
  if (level >= 3) {
    return 'bg-gradient-to-br from-cyan-950 to-slate-900 border-2 border-cyan-400/40 text-cyan-200 shadow-[0_0_10px_rgba(34,211,238,0.4),0_0_3px_rgba(34,211,238,0.2)] animate-level-glow font-geist font-bold italic tracking-[0.03em]'
  }
  // ── LVL 2 🥤 PRAKTIKANT: Slate, leichter Highlight ──
  if (level >= 2) {
    return 'bg-slate-800 border-2 border-slate-500/50 text-slate-200 shadow-[0_0_6px_rgba(148,163,184,0.2)] font-geist font-semibold'
  }
  // ── LVL 1 🌻 SPUCKER: Plain, kein Effekt ──
  return 'bg-slate-900 border-2 border-slate-700/40 text-slate-400 font-geist font-medium'
}

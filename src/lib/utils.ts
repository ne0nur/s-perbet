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

export function calculateLevel(punkte: number, achievementsCount: number = 0, bonusTippsCount: number = 0): number {
  return calculateLevelDetails(punkte, achievementsCount, bonusTippsCount).level
}

export function getLevelBadgeStyle(level: number): string {
  // ═══════════════════════════════════════════════
  //  TIERED BADGE SYSTEM — 30 Level Erweiterung
  //  Font: Geist Black Italic (fett, breit)
  // ═══════════════════════════════════════════════

  // ── LVL 30 🌌 SECHSTER SINN (GOJO SATORU) ──
  if (level >= 30) {
    return 'badge-sweep badge-gojo text-purple-100 font-geist font-black italic tracking-[0.06em]'
  }
  // ── LVL 29 👑 ENDGEGNER (EMPEROR) ──
  if (level >= 29) {
    return 'badge-sweep badge-emperor text-amber-300 font-geist font-black italic tracking-[0.06em]'
  }
  // ── LVL 27-28 💎 LEGENDE/KRAL (SULTAN+) ──
  if (level >= 27) {
    return 'badge-sweep badge-sultan-plus text-fuchsia-100 font-geist font-black italic tracking-[0.06em]'
  }
  // ── LVL 24-26 ⚔️ BABA/PATRON/MASCHINE (SULTAN) ──
  if (level >= 24) {
    return 'badge-sweep badge-sultan text-purple-100 font-geist font-black italic tracking-[0.06em]'
  }
  // ── LVL 20-23 ⚡ VIP/MEISTER/LÖWE (NOSTRADAMUS) ──
  if (level >= 20) {
    return 'badge-sweep badge-nostradamus text-amber-100 font-geist font-black italic tracking-[0.06em]'
  }
  // ── LVL 15-19 🏛️ MACHER bis WETT-PATE ──
  if (level >= 15) {
    return 'bg-gradient-to-br from-amber-950 via-yellow-950 to-amber-900 border border-yellow-400/55 text-amber-100 ring-2 ring-amber-400/35 animate-level-glow-wobble font-geist font-black italic tracking-[0.05em]'
  }
  // ── LVL 10-14 🔮 KREISKLASSE bis STAMMGAST ──
  if (level >= 10) {
    return 'bg-gradient-to-br from-emerald-950 to-emerald-900 border border-emerald-400/50 text-emerald-100 ring-1 ring-emerald-400/25 animate-level-glow-fast font-geist font-black italic tracking-[0.04em]'
  }
  // ── LVL 7-9 🎖️ SCHÖNWETTER bis KREISLIGA-MESSI ──
  if (level >= 7) {
    return 'bg-gradient-to-br from-blue-950 to-blue-900 border border-blue-400/45 text-blue-100 ring-1 ring-blue-400/20 animate-level-glow font-geist font-black italic tracking-[0.04em]'
  }
  // ── LVL 4-6 🎫 ALMAN-TIPPER bis BALLJUNGE ──
  if (level >= 4) {
    return 'bg-gradient-to-br from-cyan-950 to-slate-900 border border-cyan-400/40 text-cyan-200 animate-level-glow font-geist font-bold italic tracking-[0.03em]'
  }
  // ── LVL 2-3 🥤 ÇAY-BRINGER bis LELLEK ──
  if (level >= 2) {
    return 'bg-slate-800 border border-slate-500/50 text-slate-200 font-geist font-semibold'
  }
  // ── LVL 1 🌻 WASSERHOLER ──
  return 'bg-slate-900 border border-slate-700/40 text-slate-400 font-geist font-medium'
}

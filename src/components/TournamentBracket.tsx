import React from 'react'
import type { Match } from '../stores/matchStore'
import { Trophy, HelpCircle } from 'lucide-react'

interface TournamentConfig {
  name: string
  has_knockout: boolean
  group_stage_matchdays: number
}

interface TournamentBracketProps {
  matches: Match[]
  config?: TournamentConfig | null
}

// Phasen-Definitionen pro Turnier-Typ (generic)
interface PhaseDef {
  name: string
  emoji: string
  matchCount: number   // erwartete Anzahl Matches in dieser Phase
}

function getPhaseDefs(config: TournamentConfig | null | undefined): PhaseDef[] {
  const gs = config?.group_stage_matchdays ?? 8

  // WM-style (few KO rounds): Round of 16 → QF → SF → Final
  // CL-style (many rounds): Playoffs → R16 → QF → SF → Final
  // Heuristik: Wenn group_stage <= 4 → WM-style, sonst CL-style
  if (gs <= 4) {
    return [
      { name: 'Achtelfinale', emoji: '🏟️', matchCount: 8 },
      { name: 'Viertelfinale', emoji: '⚔️', matchCount: 4 },
      { name: 'Halbfinale', emoji: '🔥', matchCount: 2 },
      { name: 'Finale', emoji: '🏆', matchCount: 1 },
    ]
  }

  return [
    { name: 'Play-offs', emoji: '🎟️', matchCount: 8 },
    { name: 'Achtelfinale', emoji: '🏟️', matchCount: 8 },
    { name: 'Viertelfinale', emoji: '⚔️', matchCount: 4 },
    { name: 'Halbfinale', emoji: '🔥', matchCount: 2 },
    { name: 'Finale', emoji: '🏆', matchCount: 1 },
  ]
}

function getPhaseLabelForSpieltag(st: number, config: TournamentConfig | null | undefined): string | null {
  const defs = getPhaseDefs(config)
  const gs = config?.group_stage_matchdays ?? 8
  const offset = st - gs
  if (offset < 1 || offset > defs.length) return null
  return defs[offset - 1]?.name ?? null
}

export function TournamentBracket({ matches, config }: TournamentBracketProps) {
  const gs = config?.group_stage_matchdays ?? 8
  const knockoutMatches = matches.filter(m => m.spieltag > gs)

  const phaseDefs = getPhaseDefs(config)

  // Group matches by phase
  const phases = phaseDefs.map((def, idx) => {
    const spieltag = gs + idx + 1
    const phaseMatches = knockoutMatches.filter(m => m.spieltag === spieltag)
    return { ...def, spieltag, matches: phaseMatches }
  })

  // Build empty bracket if no matches
  const hasAnyKnockout = knockoutMatches.length > 0

  const renderMatchCard = (m?: Match, placeholderIdx?: number) => {
    if (!m) {
      // Empty slot — show placeholder
      return (
        <div className="bg-white/3 border border-white/5 border-dashed rounded-xl p-3 mb-3 text-sm opacity-40">
          <div className="flex flex-col space-y-2">
            <div className="flex justify-between items-center text-white/30">
              <span className="truncate text-xs italic">TBD</span>
              <span className="text-right text-xs">-</span>
            </div>
            <div className="flex justify-between items-center text-white/30">
              <span className="truncate text-xs italic">TBD</span>
              <span className="text-right text-xs">-</span>
            </div>
          </div>
        </div>
      )
    }

    const h = m.heim_team
    const a = m.gast_team
    const ht = m.tore_heim
    const at = m.tore_gast
    const isFinished = m.status === 'finished'
    const isLive = m.status === 'live'
    const winner = isFinished && ht !== null && at !== null
      ? (ht > at ? h : at > ht ? a : null)
      : null

    return (
      <div className={`bg-white/5 backdrop-blur-md border rounded-xl p-3 mb-3 text-sm relative transition-colors ${
        isLive ? 'border-red-500/50 shadow-[0_0_12px_rgba(239,68,68,0.15)]' :
        isFinished ? 'border-white/10' : 'border-white/10'
      }`}>
        <div className="flex flex-col space-y-2">
          <div className={`flex justify-between items-center ${winner === h ? 'font-bold text-green-400' : 'text-white/70'}`}>
            <span className="truncate w-3/4">{h}</span>
            <span className="text-right font-mono">
              {isFinished || isLive ? ht : '-'}
              {isLive && <span className="ml-1 w-1.5 h-1.5 bg-red-500 rounded-full inline-block animate-pulse" />}
            </span>
          </div>
          <div className={`flex justify-between items-center ${winner === a ? 'font-bold text-green-400' : 'text-white/70'}`}>
            <span className="truncate w-3/4">{a}</span>
            <span className="text-right font-mono">
              {isFinished || isLive ? at : '-'}
              {isLive && <span className="ml-1 w-1.5 h-1.5 bg-red-500 rounded-full inline-block animate-pulse" />}
            </span>
          </div>
        </div>
        {isLive && (
          <div className="mt-2 text-[9px] text-red-400 font-mono text-right">LIVE</div>
        )}
      </div>
    )
  }

  const renderPhase = (phase: PhaseDef & { spieltag: number; matches: Match[] }, isFinal = false) => {
    const slots = phase.matchCount
    const matchSlots: (Match | undefined)[] = []

    // Fill with actual matches
    for (let i = 0; i < slots; i++) {
      matchSlots.push(phase.matches[i])
    }

    // Show phase even if no matches yet (empty bracket)
    // For group stage: only show if matches exist. For KO: always show structure.
    if (!hasAnyKnockout && knockoutMatches.length === 0 && matchSlots.every(s => !s)) {
      // No KO matches at all — show empty phase structure
      const emptySlots = Array.from({ length: slots }, (_, i) => undefined)
      return (
        <div key={phase.spieltag} className="flex flex-col w-56 shrink-0 opacity-60">
          <h3 className={`font-bold mb-4 flex items-center justify-center bg-white/5 py-2.5 rounded-lg text-xs uppercase tracking-wider ${isFinal ? 'text-yellow-400 bg-yellow-400/10' : 'text-on-surface-variant'}`}>
            {isFinal && <Trophy className="w-4 h-4 mr-1.5" />}
            {phase.emoji} {phase.name}
          </h3>
          <div className="flex flex-col justify-around h-full space-y-2">
            {emptySlots.map((_, idx) => (
              <React.Fragment key={idx}>
                <div className="bg-white/3 border border-white/5 border-dashed rounded-xl p-3 text-sm">
                  <div className="flex flex-col space-y-1.5">
                    <div className="text-white/20 text-xs italic text-center">TBD vs TBD</div>
                    <HelpCircle className="w-3 h-3 mx-auto text-white/10" />
                  </div>
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>
      )
    }

    if (matchSlots.every(s => !s)) return null

    const spacing = slots <= 2 ? 'space-y-8' : slots <= 4 ? 'space-y-4' : 'space-y-2'

    return (
      <div key={phase.spieltag} className="flex flex-col w-56 shrink-0">
        <h3 className={`font-bold mb-4 flex items-center justify-center py-2.5 rounded-lg text-xs uppercase tracking-wider ${isFinal ? 'text-yellow-400 bg-yellow-400/10' : 'text-on-surface-variant bg-white/5'}`}>
          {isFinal && <Trophy className="w-4 h-4 mr-1.5" />}
          {phase.emoji} {phase.name}
        </h3>
        <div className={`flex flex-col justify-around h-full ${spacing}`}>
          {matchSlots.map((m, idx) => (
            <React.Fragment key={m?.id ?? `empty-${idx}`}>
              {renderMatchCard(m, idx)}
            </React.Fragment>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="w-full overflow-x-auto pb-6 custom-scrollbar">
      <div className="flex min-w-max gap-6 p-4 items-start">
        {phases.map((phase, idx) => {
          const isFinal = idx === phases.length - 1
          return renderPhase(phase, isFinal)
        })}
      </div>
      {knockoutMatches.length === 0 && (
        <p className="text-center text-xs text-white/30 font-mono mt-2">
          K.o.-Runden stehen fest — Matches werden nach der Gruppenphase eingetragen
        </p>
      )}
    </div>
  )
}

export { getPhaseLabelForSpieltag }

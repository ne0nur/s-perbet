import React from 'react'
import type { Match } from '../stores/matchStore'
import { Trophy } from 'lucide-react'

interface TournamentBracketProps {
  matches: Match[]
}

const EXTRA_MATCH_INFO: Record<string, { aet?: boolean; pens?: string; agg?: string }> = {
  // Mock data for the 25/26 season final
  'Paris Saint Germain-Arsenal': { pens: '4:3 n.E.', aet: true }
}

function getExtraInfo(m: Match) {
  const key1 = `${m.heim_team}-${m.gast_team}`
  const key2 = `${m.gast_team}-${m.heim_team}`
  return EXTRA_MATCH_INFO[key1] || EXTRA_MATCH_INFO[key2]
}

export function TournamentBracket({ matches }: TournamentBracketProps) {
  // Filter knockout matches
  const knockoutMatches = matches.filter((m) => m.spieltag >= 9 && m.spieltag <= 13)

  // We want to group two-legged ties into a single "Tie" object
  const buildTies = (spieltag: number) => {
    const roundMatches = knockoutMatches.filter((m) => m.spieltag === spieltag)
    const ties: { team1: string, team2: string, leg1: Match, leg2?: Match, extra?: { aet?: boolean; pens?: string; agg?: string } }[] = []
    const processed = new Set<string>()

    roundMatches.forEach((m) => {
      if (processed.has(m.id)) return
      // Find return leg
      const returnLeg = roundMatches.find(
        (r) => r.id !== m.id && r.heim_team === m.gast_team && r.gast_team === m.heim_team
      )
      
      const tieInfo = getExtraInfo(m)
      
      ties.push({
        team1: m.heim_team,
        team2: m.gast_team,
        leg1: m,
        leg2: returnLeg,
        extra: tieInfo
      })
      processed.add(m.id)
      if (returnLeg) processed.add(returnLeg.id)
    })
    return ties
  }

  const playoffs = buildTies(9)
  const roundOf16 = buildTies(10)
  const quarters = buildTies(11)
  const semis = buildTies(12)
  const final = knockoutMatches.filter((m) => m.spieltag === 13)

  const renderTie = (tie: { team1: string, team2: string, leg1: Match, leg2?: Match, extra?: { aet?: boolean; pens?: string; agg?: string } }, title?: string) => {
    const { team1, team2, leg1, leg2, extra } = tie
    // For single match (Final)
    if (!leg2 && !leg1) return null
    
    const m1 = leg1
    const m2 = leg2
    
    // Calculate aggregate if both finished
    let agg1 = 0
    let agg2 = 0
    let isFinished = false
    
    // For single leg (Final)
    if (m1?.spieltag === 13) {
      agg1 = m1.tore_heim || 0
      agg2 = m1.tore_gast || 0
      if (m1.status === 'finished') isFinished = true
    } else {
      if (m1?.status === 'finished') {
        agg1 += m1.tore_heim || 0
        agg2 += m1.tore_gast || 0
        if (m2 && m2.status === 'finished') isFinished = true
      }
      if (m2?.status === 'finished') {
        agg1 += m2.tore_gast || 0 // team1 is away in leg2
        agg2 += m2.tore_heim || 0 // team2 is home in leg2
      }
    }

    const t1Winner = isFinished && (agg1 > agg2 || (agg1 === agg2 && extra?.pens && parseInt(extra.pens.split(':')[0]) > parseInt(extra.pens.split(':')[1])))
    const t2Winner = isFinished && (agg2 > agg1 || (agg1 === agg2 && extra?.pens && parseInt(extra.pens.split(':')[1]) > parseInt(extra.pens.split(':')[0])))

    return (
      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-3 mb-3 text-sm relative hover:bg-white/10 transition-colors shadow-lg">
        {title && <div className="text-xs text-white/50 mb-2 uppercase tracking-wider font-semibold">{title}</div>}
        <div className="flex flex-col space-y-2">
          <div className={`flex justify-between items-center ${t1Winner ? 'font-bold text-white' : 'text-white/70'}`}>
            <span className="truncate w-3/4">{team1}</span>
            <span className="text-right">{isFinished ? agg1 : '-'}</span>
          </div>
          <div className={`flex justify-between items-center ${t2Winner ? 'font-bold text-white' : 'text-white/70'}`}>
            <span className="truncate w-3/4">{team2}</span>
            <span className="text-right">{isFinished ? agg2 : '-'}</span>
          </div>
        </div>
        
        {/* Extra info like penalties or extra time */}
        {extra && (
          <div className="mt-2 text-xs text-emerald-400 font-medium text-right flex justify-end items-center space-x-2">
            {extra.aet && <span className="px-1.5 py-0.5 rounded bg-emerald-500/20">n.V.</span>}
            {extra.pens && <span className="px-1.5 py-0.5 rounded bg-emerald-500/20">{extra.pens}</span>}
          </div>
        )}
      </div>
    )
  }

  if (knockoutMatches.length === 0) {
    return <div className="p-8 text-center text-white/50">Turnierbaum noch nicht verfügbar</div>
  }

  return (
    <div className="w-full overflow-x-auto pb-6 custom-scrollbar">
      <div className="flex min-w-max gap-8 p-4">
        {/* Play-offs */}
        {playoffs.length > 0 && (
          <div className="flex flex-col w-64 shrink-0">
            <h3 className="text-emerald-400 font-bold mb-6 flex items-center justify-center bg-white/5 py-3 rounded-lg">Play-offs</h3>
            <div className="flex flex-col justify-around h-full space-y-2">
              {playoffs.map((tie, idx) => <React.Fragment key={idx}>{renderTie(tie)}</React.Fragment>)}
            </div>
          </div>
        )}
        
        {/* Achtelfinale */}
        <div className="flex flex-col w-64 shrink-0">
          <h3 className="text-emerald-400 font-bold mb-6 flex items-center justify-center bg-white/5 py-3 rounded-lg">Achtelfinale</h3>
          <div className="flex flex-col justify-around h-full space-y-4">
            {roundOf16.map((tie, idx) => <React.Fragment key={idx}>{renderTie(tie)}</React.Fragment>)}
          </div>
        </div>

        {/* Viertelfinale */}
        <div className="flex flex-col w-64 shrink-0">
          <h3 className="text-emerald-400 font-bold mb-6 flex items-center justify-center bg-white/5 py-3 rounded-lg">Viertelfinale</h3>
          <div className="flex flex-col justify-around h-full space-y-8">
            {quarters.map((tie, idx) => <React.Fragment key={idx}>{renderTie(tie)}</React.Fragment>)}
          </div>
        </div>

        {/* Halbfinale */}
        <div className="flex flex-col w-64 shrink-0">
          <h3 className="text-emerald-400 font-bold mb-6 flex items-center justify-center bg-white/5 py-3 rounded-lg">Halbfinale</h3>
          <div className="flex flex-col justify-around h-full space-y-16">
            {semis.map((tie, idx) => <React.Fragment key={idx}>{renderTie(tie)}</React.Fragment>)}
          </div>
        </div>

        {/* Finale */}
        <div className="flex flex-col w-72 shrink-0">
          <h3 className="text-yellow-400 font-bold mb-6 flex items-center justify-center bg-yellow-400/10 py-3 rounded-lg">
            <Trophy className="w-5 h-5 mr-2" /> Finale
          </h3>
          <div className="flex flex-col justify-center h-full">
            {final.map((m, idx) => (
              <React.Fragment key={idx}>
                {renderTie({ team1: m.heim_team, team2: m.gast_team, leg1: m, extra: getExtraInfo(m) })}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

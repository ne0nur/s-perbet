 
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Match } from '../stores/matchStore'
import { getTeamLogo } from '../lib/teamLogos'
import { TeamInspector } from '../components/TeamInspector'
import { TournamentBracket } from '../components/TournamentBracket'
import { useTranslation } from '../utils/translations'

interface LeagueRow {
  team: string
  played: number
  won: number
  drawn: number
  lost: number
  goalsFor: number
  goalsAgainst: number
  goalDifference: number
  points: number
  form: ('W' | 'D' | 'L')[]
}

export function StandingsPage() {
  const { t, language } = useTranslation()
  const [standings, setStandings] = useState<LeagueRow[]>([])
  const [matchesForPhase, setMatchesForPhase] = useState<Match[]>([]) // Für K.o.-Phasen
  const [isLaden, setIsLaden] = useState(true)
  const [saison, setSaison] = useState(2026)
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null)
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024)
  const [viewTournament, setViewTournament] = useState<'Süper Lig' | 'Champions League'>('Süper Lig')
  const [viewPhase, setViewPhase] = useState<'table' | 'baum'>('table')
  const [availablePhases, setAvailablePhases] = useState<number[]>([])

  const ladeMatchesTabelle = useCallback(async (targetSeason: number) => {
    setIsLaden(true)
    try {
      const { data: matchesData, error } = await supabase
        .from('matches').select('*').eq('season', targetSeason).order('anpfiff', { ascending: true })
      if (error) throw error

      const tournamentMatches = (matchesData || []).filter(
        m => m.spieltag !== 999 && m.heim_team !== 'LIGA' && m.gast_team !== 'CHAT' && (m.tournament || 'Süper Lig') === viewTournament
      )

      // Für Champions League: Verfügbare Phasen ermitteln (spieltag > 8)
      if (viewTournament === 'Champions League') {
        const knockoutMatches = tournamentMatches.filter(m => m.spieltag > 8)
        setMatchesForPhase(knockoutMatches)
        const knockoutPhases = new Set(knockoutMatches.map(m => m.spieltag))
        setAvailablePhases(Array.from(knockoutPhases).sort((a, b) => a - b))
      } else {
        setMatchesForPhase([])
        setAvailablePhases([])
      }

      // Tabellen-Berechnung (Für CL nur Matches spieltag <= 8)
      const tableMatches = viewTournament === 'Champions League' 
        ? tournamentMatches.filter(m => m.spieltag <= 8)
        : tournamentMatches

      const teamsMap: Record<string, LeagueRow> = {}

      tableMatches.forEach(m => {
        if (!teamsMap[m.heim_team]) teamsMap[m.heim_team] = { team: m.heim_team, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0, form: [] }
        if (!teamsMap[m.gast_team]) teamsMap[m.gast_team] = { team: m.gast_team, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0, form: [] }
      })

      tableMatches.forEach(m => {
        if (m.tore_heim !== null && m.tore_gast !== null && (m.status === 'finished' || m.status === 'live')) {
          const h = teamsMap[m.heim_team]; const a = teamsMap[m.gast_team]
          h.played += 1; a.played += 1
          h.goalsFor += m.tore_heim; h.goalsAgainst += m.tore_gast
          a.goalsFor += m.tore_gast; a.goalsAgainst += m.tore_heim
          if (m.tore_heim > m.tore_gast) { h.won += 1; h.points += 3; h.form.push('W'); a.lost += 1; a.form.push('L') }
          else if (m.tore_heim < m.tore_gast) { a.won += 1; a.points += 3; a.form.push('W'); h.lost += 1; h.form.push('L') }
          else { h.drawn += 1; h.points += 1; h.form.push('D'); a.drawn += 1; a.points += 1; a.form.push('D') }
        }
      })

      const list = Object.values(teamsMap).map(row => {
        row.goalDifference = row.goalsFor - row.goalsAgainst
        row.form = row.form.slice(-5)
        return row
      })
      list.sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points
        if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference
        if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor
        return a.team.localeCompare(b.team)
      })
      setStandings(list)
      setSelectedTeam(prev => {
        const hasTeam = list.some(s => s.team === prev)
        return hasTeam ? prev : (list[0]?.team || null)
      })
    } catch (e) { console.error(e) } finally { setIsLaden(false) }
  }, [viewTournament])

  const ladeTabelleHistorisch = useCallback(async (seasonYear: number) => {
    setIsLaden(true)
    try {
      if (viewTournament === 'Champions League') {
        setStandings([])
        setIsLaden(false)
        return
      }

      const { data, error } = await supabase
        .from('historical_standings')
        .select('*')
        .eq('season', seasonYear)
        .order('rank', { ascending: true })

      if (error) throw error

      const list: LeagueRow[] = (data || []).map(d => ({
        team: d.team_name,
        played: d.played,
        won: d.won,
        drawn: d.drawn,
        lost: d.lost,
        goalsFor: d.goals_for,
        goalsAgainst: d.goals_against,
        goalDifference: d.goal_difference,
        points: d.points,
        form: d.form ? d.form.split('').map((f: string) => f === 'W' ? 'W' : f === 'D' ? 'D' : 'L') : []
      }))

      setStandings(list)
      setSelectedTeam(prev => {
        const hasTeam = list.some(s => s.team === prev)
        return hasTeam ? prev : (list[0]?.team || null)
      })
    } catch (e) {
      console.error(e)
    } finally { setIsLaden(false) }
  }, [viewTournament])

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    if (viewTournament === 'Champions League') {
      ladeMatchesTabelle(saison)
    } else {
      if (saison === 2026) {
        ladeMatchesTabelle(2026)
      } else {
        ladeTabelleHistorisch(saison)
      }
    }
  }, [saison, viewTournament, ladeMatchesTabelle, ladeTabelleHistorisch])

  if (isLaden) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary-container border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-full px-3 md:px-6 lg:px-8 pt-4 md:pt-6 pb-24 md:pb-8 max-w-[1600px] mx-auto w-full animate-page-enter">
      {/* Turnier-Filter & Saison-Selector */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 md:mb-6 max-w-[1600px] w-full gap-3">
        <div className="flex bg-surface-container border border-surface-container-high p-1 rounded-lg">
          <button
            onClick={() => {
              setViewTournament('Süper Lig')
              setViewPhase('table')
              setSaison(2026)
            }}
            className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-all flex items-center gap-2 ${viewTournament === 'Süper Lig' ? 'bg-primary text-on-primary font-bold shadow-md' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container/50'}`}
          >
            <img src={`${import.meta.env.BASE_URL}logos/Süper_Lig.png`} alt="SL" className="w-6 h-6 object-contain drop-shadow-[0_0_8px_rgba(255,255,255,0.6)] brightness-110" />
            Süper Lig
          </button>
          <button
            onClick={() => {
              setViewTournament('Champions League')
              setViewPhase('table')
              setSaison(2026)
            }}
            className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-all flex items-center gap-2 ${viewTournament === 'Champions League' ? 'bg-primary text-on-primary font-bold shadow-md' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container/50'}`}
          >
            <img src={`${import.meta.env.BASE_URL}logos/UEFA_Champions_League_logo.png`} alt="CL" className="w-6 h-6 object-contain drop-shadow-[0_0_8px_rgba(255,255,255,0.6)] brightness-110" />
            Champions League
          </button>
        </div>

        <select
          value={saison}
          onChange={(e) => {
            setSaison(parseInt(e.target.value))
            setViewPhase('table')
          }}
          className="bg-surface-container border border-surface-container-high rounded-lg px-3 py-1.5 text-xs text-on-surface focus:outline-none focus:border-primary-container font-mono"
        >
          <option value={2026}>{t('seasonLabel', { year: '2026/27' })}</option>
          <option value={2025}>{t('seasonLabel', { year: '2025/26' })}</option>
          {viewTournament === 'Süper Lig' && (
            <>
              <option value={2024}>{t('seasonLabel', { year: '2024/25' })}</option>
              <option value={2023}>{t('seasonLabel', { year: '2023/24' })}</option>
              <option value={2022}>{t('seasonLabel', { year: '2022/23' })}</option>
              <option value={2021}>{t('seasonLabel', { year: '2021/22' })}</option>
            </>
          )}
        </select>
      </div>

      {/* CL Phasen Tabs */}
      {viewTournament === 'Champions League' && (
        <div className="flex bg-surface-container-lowest border border-surface-container-high p-1 rounded-lg mb-4 overflow-x-auto hide-scrollbar">
          <button
            onClick={() => setViewPhase('table')}
            className={`px-4 py-2 text-xs font-medium rounded-md whitespace-nowrap transition-all ${viewPhase === 'table' ? 'bg-surface-container-high text-on-surface font-bold shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
          >
            {t('clLeaguePhaseTable')}
          </button>
          {availablePhases.length > 0 && (
            <button
              onClick={() => setViewPhase('baum')}
              className={`px-4 py-2 text-xs font-medium rounded-md whitespace-nowrap transition-all ${viewPhase === 'baum' ? 'bg-surface-container-high text-on-surface font-bold shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
            >
              {t('clKnockoutPhase')}
            </button>
          )}
        </div>
      )}

      {viewPhase === 'baum' && viewTournament === 'Champions League' ? (
        // ─── Matches Ansicht für K.o.-Phasen (Turnierbaum) ───
        <div className="w-full">
          {matchesForPhase.length === 0 ? (
            <div className="col-span-full py-12 text-center text-on-surface-variant font-mono text-sm">{t('noMatchesFound')}</div>
          ) : (
            <TournamentBracket matches={matchesForPhase} />
          )}
        </div>
      ) : (
        // ─── Tabellen-Ansicht ───
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 xl:gap-10 items-start w-full">
          {/* Table Column */}
          <div className="lg:col-span-8 flex flex-col">
            {/* Tabelle */}
            <div className="bg-surface-container-low border border-surface-container-high rounded-lg overflow-hidden shadow-sm">
              <table className="w-full text-left table-fixed font-mono">
                <thead>
                  <tr className="bg-surface-container border-b border-surface-container-high">
                    <th className="py-2.5 px-2 text-center font-mono text-[9px] text-on-surface-variant uppercase font-normal w-[28px]">#</th>
                    <th className="py-2.5 px-2 font-mono text-[9px] text-on-surface-variant uppercase font-normal">Team</th>
                    <th className="py-2.5 px-1 text-center font-mono text-[9px] text-on-surface-variant uppercase font-normal w-[22px]" title={t('tableHeaderPlayedTitle')}>{t('tableHeaderPlayed')}</th>
                    <th className="py-2.5 px-1 text-center font-mono text-[9px] text-on-surface-variant uppercase font-normal w-[22px] hidden sm:table-cell" title={t('tableHeaderWonTitle')}>{t('tableHeaderWon')}</th>
                    <th className="py-2.5 px-1 text-center font-mono text-[9px] text-on-surface-variant uppercase font-normal w-[22px] hidden sm:table-cell" title={t('tableHeaderDrawnTitle')}>{t('tableHeaderDrawn')}</th>
                    <th className="py-2.5 px-1 text-center font-mono text-[9px] text-on-surface-variant uppercase font-normal w-[22px] hidden sm:table-cell" title={t('tableHeaderLostTitle')}>{t('tableHeaderLost')}</th>
                    <th className="py-2.5 px-1 text-center font-mono text-[9px] text-on-surface-variant uppercase font-normal w-[45px] hidden sm:table-cell" title={t('tableHeaderGoalsTitle')}>{t('tableHeaderGoals')}</th>
                    <th className="py-2.5 px-1 text-center font-mono text-[9px] text-on-surface-variant uppercase font-normal w-[30px]" title={t('tableHeaderDiffTitle')}>{t('tableHeaderDiff')}</th>
                    <th className="py-2.5 px-2 text-center font-mono text-[9px] text-primary-fixed-dim uppercase font-bold w-[30px]" title={t('tableHeaderPointsTitle')}>{t('tableHeaderPoints')}</th>
                    <th className="py-2.5 px-1 text-center font-mono text-[9px] text-on-surface-variant uppercase font-normal w-[80px]">{t('tableHeaderForm')}</th>
                  </tr>
                </thead>
                <tbody className="text-xs">
                  {standings.map((row, index) => {
                    let posColor = 'text-on-surface-variant'
                    let posBorder = ''
                    let rowBg = index % 2 === 0 ? '' : 'bg-surface-container-lowest'
                    
                    const isSL = viewTournament === 'Süper Lig'
                    const isRelegationDirect = isSL && index >= standings.length - 3 && standings.length >= 4
                    const isRelegationPlayoff = isSL && index === standings.length - 4 && standings.length >= 4

                    const isClDirect = !isSL && index < 8
                    const isClPlayoff = !isSL && index >= 8 && index < 24
                    const isClOut = !isSL && index >= 24

                    if (isSL) {
                      if (index === 0) { posColor = 'text-green-400 font-bold'; posBorder = 'border-l-[3px] border-green-500'; rowBg = 'bg-green-500/5' }
                      else if (index === 1) { posColor = 'text-emerald-400 font-bold'; posBorder = 'border-l-[3px] border-emerald-400'; rowBg = 'bg-emerald-500/5' }
                      else if (index === 2) { posColor = 'text-blue-400 font-bold'; posBorder = 'border-l-[3px] border-blue-500'; rowBg = 'bg-blue-500/5' }
                      else if (index === 3) { posColor = 'text-sky-400 font-bold'; posBorder = 'border-l-[3px] border-sky-400'; rowBg = 'bg-sky-400/5' }
                      else if (isRelegationPlayoff) { posColor = 'text-orange-400 font-bold'; posBorder = 'border-l-[3px] border-orange-500'; rowBg = 'bg-orange-500/5' }
                      else if (isRelegationDirect) { posColor = 'text-red-400 font-bold'; posBorder = 'border-l-[3px] border-red-500'; rowBg = 'bg-red-500/5' }
                    } else {
                      if (isClDirect) { posColor = 'text-green-400 font-bold'; posBorder = 'border-l-[3px] border-green-500'; rowBg = 'bg-green-500/5' }
                      else if (isClPlayoff) { posColor = 'text-emerald-400 font-bold'; posBorder = 'border-l-[3px] border-emerald-400'; rowBg = 'bg-emerald-500/5' }
                      else if (isClOut) { posColor = 'text-red-400 font-bold'; posBorder = 'border-l-[3px] border-red-500'; rowBg = 'bg-red-500/5' }
                    }

                    const isSelected = selectedTeam === row.team

                    return (
                      <tr
                        key={row.team}
                        onClick={() => { if (isDesktop) setSelectedTeam(row.team) }}
                        className={`border-b border-surface-container-high hover:bg-surface-container/60 transition-colors cursor-pointer ${rowBg} ${
                          isRelegationPlayoff || isClPlayoff && index === 8 ? 'border-t-2 border-orange-500/20' : isRelegationDirect && index === standings.length - 3 || isClOut && index === 24 ? 'border-t-2 border-red-500/20' : ''
                        } ${isSelected && isDesktop ? 'bg-primary-container/10 border-r-2 border-primary font-bold' : ''}`}
                      >
                        <td className={`py-2 px-2 text-center font-mono font-bold ${posColor} ${posBorder}`}>{index + 1}</td>
                        <td className="py-2 px-2">
                          <div className="flex items-center gap-1.5">
                            <img src={getTeamLogo(row.team)} alt="" className="w-6 h-6 object-contain flex-shrink-0"
                              onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0' }} />
                            <span className="truncate text-on-surface font-medium text-[11px]">{row.team}</span>
                          </div>
                        </td>
                        <td className="py-2 px-1 text-center font-mono text-on-surface-variant">{row.played}</td>
                        <td className="py-2 px-1 text-center font-mono text-on-surface-variant hidden sm:table-cell">{row.won}</td>
                        <td className="py-2 px-1 text-center font-mono text-on-surface-variant hidden sm:table-cell">{row.drawn}</td>
                        <td className="py-2 px-1 text-center font-mono text-on-surface-variant hidden sm:table-cell">{row.lost}</td>
                        <td className="py-2 px-1 text-center font-mono text-on-surface-variant hidden sm:table-cell">{row.goalsFor}:{row.goalsAgainst}</td>
                        <td className={`py-2 px-1 text-center font-mono ${
                          row.goalDifference > 0 ? 'text-green-400' : row.goalDifference < 0 ? 'text-red-400' : 'text-on-surface-variant'
                        }`}>{row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}</td>
                        <td className="py-2 px-2 text-center font-mono font-bold text-on-surface">{row.points}</td>
                        <td className="py-2 px-1">
                          <div className="flex items-center justify-center gap-0.5">
                            {row.form.map((f, i) => {
                              const color = f === 'W' ? 'bg-green-500' : f === 'L' ? 'bg-red-500' : 'bg-slate-600'
                              const letter = f === 'W' ? (language === 'de' ? 'S' : language === 'tr' ? 'G' : 'W') :
                                             f === 'L' ? (language === 'de' ? 'N' : language === 'tr' ? 'M' : 'L') :
                                             (language === 'de' ? 'U' : language === 'tr' ? 'B' : 'D')
                              return (
                                <span key={i} className={`w-4 h-4 rounded-full ${color} text-white flex items-center justify-center text-[7px] font-black`}
                                  title={f === 'W' ? t('win') : f === 'L' ? t('loss') : t('draw')}>{letter}</span>
                              )
                            })}
                            {row.form.length === 0 && <span className="text-[9px] text-on-surface-variant/30">–</span>}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Legende */}
            {viewTournament === 'Süper Lig' ? (
              <div className="flex flex-wrap gap-x-3 gap-y-1.5 text-[9px] font-mono text-on-surface-variant mt-4 px-1 uppercase tracking-wider">
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-500" /> {t('legendClGroups')}</span>
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> {t('legendClQuali')}</span>
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> {t('legendEl')}</span>
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-sky-400" /> {t('legendConfQuali')}</span>
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-orange-400" /> {t('legendRelegationPlayoffs')}</span>
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-500" /> {t('legendRelegation')}</span>
              </div>
            ) : (
              <div className="flex flex-wrap gap-x-3 gap-y-1.5 text-[9px] font-mono text-on-surface-variant mt-4 px-1 uppercase tracking-wider">
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-500" /> {t('legendClDirect')}</span>
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> {t('legendClPlayoffs')}</span>
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-500" /> {t('legendClOut')}</span>
              </div>
            )}

            {standings.length > 0 && standings.every(s => s.played === 0) && (
              <p className="text-center text-xs text-on-surface-variant/50 mt-4 font-mono">{t('tableCalculationNotice')}</p>
            )}
          </div>

          {/* Team Inspector Column (Desktop only) */}
          {isDesktop && selectedTeam && (
            <div className="hidden lg:block lg:col-span-4 lg:sticky lg:top-[80px]">
              <TeamInspector teamName={selectedTeam} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

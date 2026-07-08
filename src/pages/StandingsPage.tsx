 
import React, { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Match } from '../stores/matchStore'
import { getTeamLogo } from '../lib/teamLogos'
import { TeamInspector } from '../components/TeamInspector'
import { MatchCard } from '../components/MatchCard'
import { useTranslation } from '../utils/translations'
import { getTournamentLogo } from '../lib/utils'
import { useTournamentStore } from '../stores/tournamentStore'
import { getWMGroup } from '../lib/wmGroups'

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

// DB-Konfig pro Turnier — wird dynamisch aus tournament_configs geladen
interface TournamentConfig {
  name: string
  emoji: string
  has_table: boolean
  has_knockout: boolean
  group_stage_matchdays: number
  cl_spots: number
  cl_playoff_spots: number
  el_spots: number
  conf_spots: number
  relegation_playoff_count: number
  relegation_count: number
  ko_direct_spots: number
  ko_playoff_spots: number
  has_historical_data: boolean
}

// Berechnet Farbe/Border für eine Zeile abhängig von der Tournament-Config
function getRowStyle(index: number, total: number, config: TournamentConfig | null): { posColor: string; posBorder: string; rowBg: string } {
  if (!config) return { posColor: 'text-on-surface-variant', posBorder: '', rowBg: index % 2 === 0 ? '' : 'bg-surface-container-lowest' }

  const { cl_spots, cl_playoff_spots, el_spots, conf_spots, relegation_playoff_count, relegation_count, ko_direct_spots, ko_playoff_spots } = config

  // K.o.-Phasen-Tabelle (z.B. CL Ligaphase)
  if (config.has_knockout) {
    if (ko_direct_spots > 0 && index < ko_direct_spots)
      return { posColor: 'text-success font-bold', posBorder: 'border-l-[3px] border-success', rowBg: 'bg-success-container' }
    if (ko_playoff_spots > 0 && index < ko_direct_spots + ko_playoff_spots)
      return { posColor: 'text-emerald-400 font-bold', posBorder: 'border-l-[3px] border-emerald-400', rowBg: 'bg-emerald-500/5' }
    return { posColor: 'text-error font-bold', posBorder: 'border-l-[3px] border-error/50', rowBg: 'bg-error-container' }
  }

  // Normale Ligatabelle
  let cumulative = 0
  if (cl_spots > 0 && index < cumulative + cl_spots)
    return { posColor: 'text-success font-bold', posBorder: 'border-l-[3px] border-success', rowBg: 'bg-success-container' }
  cumulative += cl_spots

  if (cl_playoff_spots > 0 && index < cumulative + cl_playoff_spots)
    return { posColor: 'text-emerald-400 font-bold', posBorder: 'border-l-[3px] border-emerald-400', rowBg: 'bg-emerald-500/5' }
  cumulative += cl_playoff_spots

  if (el_spots > 0 && index < cumulative + el_spots)
    return { posColor: 'text-info font-bold', posBorder: 'border-l-[3px] border-info', rowBg: 'bg-info-container' }
  cumulative += el_spots

  if (conf_spots > 0 && index < cumulative + conf_spots)
    return { posColor: 'text-sky-400 font-bold', posBorder: 'border-l-[3px] border-sky-400', rowBg: 'bg-sky-400/5' }

  // Abstieg von hinten rechnen
  if (relegation_count > 0 && index >= total - relegation_count && total >= relegation_count + 1)
    return { posColor: 'text-error font-bold', posBorder: 'border-l-[3px] border-error/50', rowBg: 'bg-error-container' }

  if (relegation_playoff_count > 0 && index >= total - relegation_count - relegation_playoff_count && total >= relegation_count + relegation_playoff_count + 1)
    return { posColor: 'text-warning font-bold', posBorder: 'border-l-[3px] border-warning', rowBg: 'bg-warning-container' }

  return { posColor: 'text-on-surface-variant', posBorder: '', rowBg: index % 2 === 0 ? '' : 'bg-surface-container-lowest' }
}

// Generiert dynamische Legenden-Einträge aus der Config
function buildLegend(config: TournamentConfig, t: (key: string) => string, isGrouped: boolean): { color: string; label: string }[] {
  const items: { color: string; label: string }[] = []

  if (isGrouped) {
    items.push({ color: 'bg-success', label: t('legendGroupQualified') })
    items.push({ color: 'bg-error', label: t('legendClOut') })
    return items
  }

  if (config.has_knockout) {
    if (config.ko_direct_spots > 0) items.push({ color: 'bg-success', label: t('legendClDirect') })
    if (config.ko_playoff_spots > 0) items.push({ color: 'bg-emerald-400', label: t('legendClPlayoffs') })
    items.push({ color: 'bg-error', label: t('legendClOut') })
    return items
  }

  if (config.cl_spots > 0) items.push({ color: 'bg-success', label: t('legendClGroups') })
  if (config.cl_playoff_spots > 0) items.push({ color: 'bg-emerald-400', label: t('legendClQuali') })
  if (config.el_spots > 0) items.push({ color: 'bg-info', label: t('legendEl') })
  if (config.conf_spots > 0) items.push({ color: 'bg-sky-400', label: t('legendConfQuali') })
  if (config.relegation_playoff_count > 0) items.push({ color: 'bg-warning', label: t('legendRelegationPlayoffs') })
  if (config.relegation_count > 0) items.push({ color: 'bg-error', label: t('legendRelegation') })

  return items
}

export function StandingsPage() {
  const { t, language } = useTranslation()
  const [standings, setStandings] = useState<LeagueRow[]>([])
  const [matchesForPhase, setMatchesForPhase] = useState<Match[]>([])
  const [isLaden, setIsLaden] = useState(true)
  const [saison, setSaison] = useState(2026)
  const [availableSeasons, setAvailableSeasons] = useState<{ id: number; label: string }[]>([{ id: 2026, label: '2026/27' }])
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null)
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024)
  const [viewTournament, setViewTournament] = useState<string>('')
  const isGrouped = viewTournament === 'World Cup 2026' || viewTournament === 'Champions League'
  const [viewPhase, setViewPhase] = useState<number | 'table'>('table')
  const [availablePhases, setAvailablePhases] = useState<number[]>([])
  const [availableTournaments, setAvailableTournaments] = useState<string[]>([])
  // Konfig-Map: tournamentName → TournamentConfig
  const [configMap, setConfigMap] = useState<Record<string, TournamentConfig>>({})

  // Lade Tournament-Configs aus der zentralen Registry
  const tournamentConfigsFromStore = useTournamentStore(s => s.tournaments)
  const getTournamentConfig = useTournamentStore(s => s.getTournament)

  useEffect(() => {
    if (tournamentConfigsFromStore.length > 0) {
      const map: Record<string, TournamentConfig> = {}
      const tNames: string[] = []
      tournamentConfigsFromStore.forEach(cfg => {
        map[cfg.name] = cfg
        tNames.push(cfg.name)
      })
      setConfigMap(map)
      setAvailableTournaments(tNames)
    }
  }, [tournamentConfigsFromStore])

  // Lade verfügbare Saisons aus DB
  useEffect(() => {
    supabase.from('seasons').select('*').order('id', { ascending: false }).then(({ data }) => {
      if (data && data.length > 0) {
        setAvailableSeasons(data.map((s: any) => ({
          id: s.id,
          label: s.name || s.label || `${s.id}/${(s.id + 1).toString().slice(-2)}`
        })))
      }
    })
  }, [])

  const activeConfig = configMap[viewTournament] ?? null

  const ladeMatchesTabelle = useCallback(async (targetSeason: number, tournament: string) => {
    setIsLaden(true)
    try {
      const { data: matchesData, error } = await supabase
        .from('matches').select('*').eq('season', targetSeason).order('anpfiff', { ascending: true })
      if (error) throw error

      // Aktives Turnier setzen (beim ersten Laden)
      const activeTournament = tournament || availableTournaments[0] || 'Süper Lig'

      const tournamentMatches = (matchesData || []).filter(
        m => m.spieltag !== 999 && m.heim_team !== 'LIGA' && m.gast_team !== 'CHAT' &&
             (m.tournament || 'Süper Lig') === activeTournament
      )

      // K.o.-Phase: Spieltage über group_stage_matchdays (aus Config oder Fallback 8)
      const cfg = configMap[activeTournament]
      const koThreshold = cfg?.group_stage_matchdays ?? 8
      const knockoutMatches = tournamentMatches.filter(m => m.spieltag > koThreshold)

      if (knockoutMatches.length > 0) {
        setMatchesForPhase(knockoutMatches)
        const knockoutPhases = new Set(knockoutMatches.map(m => m.spieltag))
        setAvailablePhases(Array.from(knockoutPhases).sort((a, b) => a - b))
      } else {
        setMatchesForPhase([])
        setAvailablePhases([])
      }

      // Tabelle nur aus Gruppenphase-Spielen
      const tableMatches = cfg?.has_knockout
        ? tournamentMatches.filter(m => m.spieltag <= koThreshold)
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
  }, [configMap, viewTournament, availableTournaments])

  const ladeTabelleHistorisch = useCallback(async (seasonYear: number) => {
    setIsLaden(true)
    try {
      // Wenn das Turnier keine historischen Daten hat → leere Tabelle mit Hinweis
      if (activeConfig && !activeConfig.has_historical_data) {
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
  }, [activeConfig])

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 1024)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Initialer Turnier-Setzen: erst wenn availableTournaments geladen
  useEffect(() => {
    if (availableTournaments.length > 0 && !viewTournament) {
      setViewTournament(availableTournaments[0])
    }
  }, [availableTournaments, viewTournament])

  useEffect(() => {
    // Wenn ViewTournament noch leer ist, setzen wir einen Default, damit die Tabelle überhaupt lädt
    const currentTournament = viewTournament || 'Süper Lig'
    const isCurrentSeason = saison === (availableSeasons[0]?.id ?? 2026)
    const hasKnockout = activeConfig?.has_knockout ?? false
    const hasHistoricalData = (activeConfig?.has_historical_data ?? false) || currentTournament === 'Süper Lig'

    if (isCurrentSeason || hasKnockout) {
      ladeMatchesTabelle(saison, currentTournament)
    } else {
      if (hasHistoricalData) {
        ladeTabelleHistorisch(saison)
      } else {
        ladeMatchesTabelle(saison, currentTournament)
      }
    }
  }, [saison, viewTournament, activeConfig, availableSeasons, ladeMatchesTabelle, ladeTabelleHistorisch])

  const legendItems = activeConfig ? buildLegend(activeConfig, t, isGrouped) : []

  if (isLaden) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary-container border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-full px-3 md:px-6 lg:px-8 pt-2.5 md:pt-4 pb-24 md:pb-8 max-w-[1600px] mx-auto w-full overflow-x-hidden animate-page-enter">
      {/* Turnier-Filter & Saison-Selector */}
      <div className="flex justify-between items-center mb-2.5 max-w-[1600px] w-full gap-2">
        <div 
          className="flex bg-surface-container/50 border border-white/5 p-0.5 rounded-xl gap-1 backdrop-blur-md overflow-x-auto no-scrollbar max-w-[70%] sm:max-w-none"
          style={{ 
            maskImage: 'linear-gradient(to right, black calc(100% - 32px), transparent 100%)', 
            WebkitMaskImage: 'linear-gradient(to right, black calc(100% - 32px), transparent 100%)' 
          }}
        >
          {availableTournaments.map(tName => (
            <button
              key={tName}
              onClick={() => {
                setViewTournament(tName)
                setViewPhase('table')
                setSaison(availableSeasons[0]?.id ?? 2026)
              }}
              className={`px-2.5 py-1.5 text-[8px] xs:text-[9px] md:text-xs font-mono font-black uppercase tracking-wider rounded-lg whitespace-nowrap transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${viewTournament === tName ? 'bg-primary-container text-on-primary-container shadow-[0_1.5px_6px_rgba(var(--primary-rgb),0.1)] border border-primary/20 scale-[1.01]' : 'text-on-surface-variant hover:text-on-surface hover:bg-white/5 border border-transparent'}`}
            >
              <img src={getTournamentLogo(tName)} alt={tName} className="w-4 h-4 object-contain drop-shadow-[0_0_8px_rgba(255,255,255,0.6)] brightness-110 shrink-0"  loading="lazy" />
              <span className="hidden xs:inline">{tName}</span>
              <span className="xs:hidden">{tName.split(' ')[0]}</span>
            </button>
          ))}
        </div>

        {/* Saison-Dropdown — dynamisch aus DB */}
        <select
          value={saison}
          onChange={(e) => {
            setSaison(parseInt(e.target.value))
            setViewPhase('table')
          }}
          className="bg-surface-container border border-surface-container-high rounded-lg px-2 py-1 text-[10px] text-on-surface focus:outline-none focus:border-primary-container font-mono cursor-pointer shrink-0"
        >
          {availableSeasons.map(s => (
            <option key={s.id} value={s.id}>{s.label.split('/')[0]}</option>
          ))}
        </select>
      </div>

      {/* K.o.-Phasen Tabs — nur wenn das Turnier K.o.-Phasen hat */}
      {activeConfig?.has_knockout && (
        <div className="flex bg-surface-container/40 border border-white/5 p-0.5 rounded-xl mb-2.5 overflow-x-auto hide-scrollbar gap-1 backdrop-blur-sm">
          <button
            onClick={() => setViewPhase('table')}
            className={`px-3 py-1.5 text-[8px] xs:text-[9px] md:text-xs font-mono font-black uppercase tracking-wider rounded-lg whitespace-nowrap transition-all duration-200 cursor-pointer text-center ${viewPhase === 'table' ? 'bg-primary-container text-on-primary-container shadow-[0_1.5px_6px_rgba(var(--primary-rgb),0.1)] border border-primary/20 scale-[1.01]' : 'text-on-surface-variant hover:text-on-surface hover:bg-white/5 border border-transparent'}`}
          >
            {viewTournament.toLowerCase().includes('world cup') || viewTournament.toLowerCase().includes('wm') ? 'Gruppenphase' : t('clLeaguePhaseTable')}
          </button>
          
          {availablePhases.map(phase => {
            let label = `Phase ${phase}`
            if (viewTournament === 'World Cup 2026' || viewTournament.includes('WM')) {
              if (phase === 4) label = t('koPhase32')
              else if (phase === 5) label = t('koPhase16')
              else if (phase === 6) label = t('koPhase8')
              else if (phase === 7) label = t('koPhase4')
              else if (phase === 8) label = t('koPhase2')
            } else if (viewTournament === 'Champions League') {
              if (phase === 9) label = t('clRoundPlayoffs')
              else if (phase === 10) label = t('clRoundLast16')
              else if (phase === 11) label = t('clRoundQuarter')
              else if (phase === 12) label = t('clRoundSemi')
              else if (phase === 13) label = t('clRoundFinal')
            }

            return (
              <button
                key={phase}
                onClick={() => setViewPhase(phase)}
                className={`px-3 py-1.5 text-[8px] xs:text-[9px] md:text-xs font-mono font-black uppercase tracking-wider rounded-lg whitespace-nowrap transition-all duration-200 cursor-pointer text-center ${viewPhase === phase ? 'bg-primary-container text-on-primary-container shadow-[0_1.5px_6px_rgba(var(--primary-rgb),0.1)] border border-primary/20 scale-[1.01]' : 'text-on-surface-variant hover:text-on-surface hover:bg-white/5 border border-transparent'}`}
              >
                {label}
              </button>
            )
          })}
        </div>
      )}

      {viewPhase !== 'table' ? (
        // ─── K.o.-Phase Matches ───
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 w-full">
          {matchesForPhase.filter(m => m.spieltag === viewPhase).map(m => (
            <MatchCard key={m.id} match={m} readOnly />
          ))}
          {matchesForPhase.filter(m => m.spieltag === viewPhase).length === 0 && (
            <div className="col-span-full bg-surface-container-low border border-surface-container-high rounded-xl p-8 text-center">
              <p className="text-on-surface-variant font-mono text-sm">{t('noMatchesForPhase')}</p>
            </div>
          )}
        </div>
      ) : (
        // ─── Tabellen-Ansicht ───
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start w-full">
          {/* Tabelle */}
          <div className={`${isDesktop ? 'lg:col-span-7' : ''} flex flex-col`}>
            {/* Historische Daten nicht verfügbar */}
            {activeConfig && !activeConfig.has_historical_data && saison !== (availableSeasons[0]?.id ?? 2026) ? (
              <div className="bg-surface-container-low border border-surface-container-high rounded-xl p-8 text-center">
                <p className="text-on-surface-variant font-mono text-sm">{t('noHistoricalData')}</p>
              </div>
            ) : (
              <div className="bg-surface-container-low border border-surface-container-high rounded-lg overflow-hidden shadow-sm">
                <table className="w-full text-left table-auto font-mono">
                  <thead>
                    <tr className="bg-surface-container border-b border-surface-container-high">
                      <th className="py-2.5 px-2 text-center font-mono text-[9px] text-on-surface-variant uppercase font-normal w-[28px]">#</th>
                      <th className="py-2.5 px-2 font-mono text-[9px] text-on-surface-variant uppercase font-normal">Team</th>
                      <th className="py-2.5 px-1 text-center font-mono text-[9px] text-on-surface-variant uppercase font-normal w-[22px]" title={t('tableHeaderPlayedTitle')}>{t('tableHeaderPlayed')}</th>
                      <th className="py-2.5 px-1 text-center font-mono text-[9px] text-on-surface-variant uppercase font-normal w-[22px] hidden sm:table-cell" title={t('tableHeaderWonTitle')}>{t('tableHeaderWon')}</th>
                      <th className="py-2.5 px-1 text-center font-mono text-[9px] text-on-surface-variant uppercase font-normal w-[22px] hidden sm:table-cell" title={t('tableHeaderDrawnTitle')}>{t('tableHeaderDrawn')}</th>
                      <th className="py-2.5 px-1 text-center font-mono text-[9px] text-on-surface-variant uppercase font-normal w-[22px] hidden sm:table-cell" title={t('tableHeaderLostTitle')}>{t('tableHeaderLost')}</th>
                      <th className="py-2.5 px-1 text-center font-mono text-[9px] text-on-surface-variant uppercase font-normal w-[45px] hidden sm:table-cell" title={t('tableHeaderGoalsTitle')}>{t('tableHeaderGoals')}</th>
                      <th className="py-2.5 px-1 text-center font-mono text-[9px] text-on-surface-variant uppercase font-normal w-[28px] sm:w-[30px]" title={t('tableHeaderDiffTitle')}>{t('tableHeaderDiff')}</th>
                      <th className="py-2.5 px-2 text-center font-mono text-[9px] text-primary-fixed-dim uppercase font-bold w-[28px] sm:w-[30px]" title={t('tableHeaderPointsTitle')}>{t('tableHeaderPoints')}</th>
                      <th className="py-2.5 px-1 text-center font-mono text-[9px] text-on-surface-variant uppercase font-normal w-[60px] sm:w-[80px]">{t('tableHeaderForm')}</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs">
                    {(() => {
                      // Gruppierung-Logik für World Cup und CL
                      const isGrouped = viewTournament === 'World Cup 2026' || viewTournament === 'Champions League'
                      
                      const allTeams = Array.from(new Set(standings.map(s => s.team))).sort()

                      const getTeamGroup = (team: string) => {
                        if (!isGrouped) return 'Tabelle'
                        
                        // WM: echte Gruppen aus offiziellem Spielplan
                        if (viewTournament === 'World Cup 2026') {
                          const g = getWMGroup(team)
                          return g ? `Gruppe ${g}` : 'Ohne Gruppe'
                        }
                        
                        // CL: alphabetische Gruppen (wie bisher)
                        const numGroups = 8
                        const teamIndex = allTeams.indexOf(team)
                        const teamsPerGroup = Math.ceil(allTeams.length / numGroups)
                        const groupIndex = Math.floor(teamIndex / teamsPerGroup) % numGroups
                        return `Group ${String.fromCharCode(65 + groupIndex)}`
                      }

                      const groups: Record<string, LeagueRow[]> = {}
                      standings.forEach(row => {
                        const g = getTeamGroup(row.team)
                        if (!groups[g]) groups[g] = []
                        groups[g].push(row)
                      })
                      
                      // Sortiere Gruppen alphabetisch (Group A, Group B...)
                      const sortedGroups = Object.keys(groups).sort()

                      return sortedGroups.map(groupName => (
                        <React.Fragment key={groupName}>
                          {isGrouped && (
                            <tr className="bg-surface-container-high/30">
                              <td colSpan={10} className="py-2 px-3 text-[10px] font-black text-primary uppercase tracking-widest border-b border-surface-container-high shadow-inner">
                                {groupName}
                              </td>
                            </tr>
                          )}
                          {groups[groupName].map((row, index) => {
                            // Wenn gruppiert, rücken die ersten beiden pro Gruppe weiter (posColor grün)
                            const posColor = isGrouped ? (index < 2 ? 'text-green-400 font-bold' : 'text-on-surface-variant') : getRowStyle(index, groups[groupName].length, activeConfig).posColor
                            const posBorder = isGrouped ? (index < 2 ? 'border-l-[3px] border-green-500' : '') : getRowStyle(index, groups[groupName].length, activeConfig).posBorder
                            const rowBg = isGrouped
                              ? (index < 2 ? 'bg-success-container' : (index % 2 === 0 ? '' : 'bg-surface-container-lowest'))
                              : getRowStyle(index, groups[groupName].length, activeConfig).rowBg
                            const isSelected = selectedTeam === row.team

                            return (
                              <tr
                                key={row.team}
                                onClick={() => { if (isDesktop) setSelectedTeam(row.team) }}
                                className={`border-b border-surface-container-high hover:bg-surface-container/60 transition-colors cursor-pointer ${rowBg} ${isSelected && isDesktop ? 'bg-primary-container/10 border-r-2 border-primary font-bold' : ''}`}
                              >
                                <td className={`py-2 px-2 text-center font-mono font-bold ${posColor} ${posBorder}`}>{index + 1}</td>
                                <td className="py-2 px-2">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <img src={getTeamLogo(row.team)} alt="" className="w-5 h-5 sm:w-6 sm:h-6 object-contain flex-shrink-0"
                                      onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0' }} />
                                    <span className="truncate text-on-surface font-medium text-[11px] sm:text-xs">{row.team}</span>
                                  </div>
                                </td>
                                <td className="py-2 px-1 text-center font-mono text-on-surface-variant">{row.played}</td>
                                <td className="py-2 px-1 text-center font-mono text-on-surface-variant hidden sm:table-cell">{row.won}</td>
                                <td className="py-2 px-1 text-center font-mono text-on-surface-variant hidden sm:table-cell">{row.drawn}</td>
                                <td className="py-2 px-1 text-center font-mono text-on-surface-variant hidden sm:table-cell">{row.lost}</td>
                                <td className="py-2 px-1 text-center font-mono text-on-surface-variant hidden sm:table-cell">{row.goalsFor}:{row.goalsAgainst}</td>
                                <td className={`py-2 px-1 text-center font-mono ${row.goalDifference > 0 ? 'text-success' : row.goalDifference < 0 ? 'text-error' : 'text-on-surface-variant'}`}>
                                  {row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}
                                </td>
                                <td className="py-2 px-2 text-center font-mono font-bold text-on-surface">{row.points}</td>
                                <td className="py-2 px-1">
                                  <div className="flex items-center justify-center gap-0.5">
                                    {row.form.map((f, i) => {
                                      const color = f === 'W' ? 'bg-success' : f === 'L' ? 'bg-error' : 'bg-surface-container-highest'
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
                        </React.Fragment>
                      ))
                    })()}
                  </tbody>
                </table>
              </div>
            )}

            {/* Dynamische Legende */}
            {legendItems.length > 0 && saison === (availableSeasons[0]?.id ?? 2026) && (
              <div className="flex flex-wrap gap-x-3 gap-y-1.5 text-[9px] font-mono text-on-surface-variant mt-4 px-1 uppercase tracking-wider">
                {legendItems.map(item => (
                  <span key={item.label} className="flex items-center gap-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${item.color}`} /> {item.label}
                  </span>
                ))}
              </div>
            )}

            {standings.length > 0 && standings.every(s => s.played === 0) && (
              <p className="text-center text-xs text-on-surface-variant/50 mt-4 font-mono">{t('tableCalculationNotice')}</p>
            )}
          </div>

          {/* Team Inspector Panel (Desktop only) */}
          <div className="hidden lg:block lg:col-span-5 lg:sticky lg:top-[80px]">
            {isDesktop && selectedTeam ? (
              <div className="bg-surface/80 backdrop-blur-xl border border-white/[0.06] rounded-2xl overflow-hidden shadow-[0_4px_30px_rgba(0,0,0,0.4)]">
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.04] bg-surface-container/50">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-on-surface-variant/70">
                    {t('teamDetails')}
                  </span>
                  <button
                    onClick={() => setSelectedTeam(null)}
                    className="text-on-surface-variant/50 hover:text-on-surface p-1 rounded-lg hover:bg-white/5 transition-colors"
                  >
                    <span className="text-xs font-mono">✕</span>
                  </button>
                </div>
                <TeamInspector teamName={selectedTeam} onClose={() => setSelectedTeam(null)} />
              </div>
            ) : (
              <div className="bg-surface/40 backdrop-blur-sm border border-white/[0.03] rounded-2xl p-8 text-center flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-surface-container/50 flex items-center justify-center">
                  <span className="text-lg opacity-30">👆</span>
                </div>
                <p className="text-[10px] font-mono text-on-surface-variant/30 uppercase tracking-wider">
                  {language === 'tr' ? 'Detaylar için takıma tıkla' : language === 'en' ? 'Click a team for details' : 'Team auswählen für Details'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

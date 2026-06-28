 
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Match } from '../stores/matchStore'
import { getTeamLogo } from '../lib/teamLogos'
import { TeamInspector } from '../components/TeamInspector'
import { TournamentBracket } from '../components/TournamentBracket'
import { useTranslation } from '../utils/translations'
import { getTournamentLogo } from '../lib/utils'

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
      return { posColor: 'text-green-400 font-bold', posBorder: 'border-l-[3px] border-green-500', rowBg: 'bg-green-500/5' }
    if (ko_playoff_spots > 0 && index < ko_direct_spots + ko_playoff_spots)
      return { posColor: 'text-emerald-400 font-bold', posBorder: 'border-l-[3px] border-emerald-400', rowBg: 'bg-emerald-500/5' }
    return { posColor: 'text-red-400 font-bold', posBorder: 'border-l-[3px] border-red-500', rowBg: 'bg-red-500/5' }
  }

  // Normale Ligatabelle
  let cumulative = 0
  if (cl_spots > 0 && index < cumulative + cl_spots)
    return { posColor: 'text-green-400 font-bold', posBorder: 'border-l-[3px] border-green-500', rowBg: 'bg-green-500/5' }
  cumulative += cl_spots

  if (cl_playoff_spots > 0 && index < cumulative + cl_playoff_spots)
    return { posColor: 'text-emerald-400 font-bold', posBorder: 'border-l-[3px] border-emerald-400', rowBg: 'bg-emerald-500/5' }
  cumulative += cl_playoff_spots

  if (el_spots > 0 && index < cumulative + el_spots)
    return { posColor: 'text-blue-400 font-bold', posBorder: 'border-l-[3px] border-blue-500', rowBg: 'bg-blue-500/5' }
  cumulative += el_spots

  if (conf_spots > 0 && index < cumulative + conf_spots)
    return { posColor: 'text-sky-400 font-bold', posBorder: 'border-l-[3px] border-sky-400', rowBg: 'bg-sky-400/5' }

  // Abstieg von hinten rechnen
  if (relegation_count > 0 && index >= total - relegation_count && total >= relegation_count + 1)
    return { posColor: 'text-red-400 font-bold', posBorder: 'border-l-[3px] border-red-500', rowBg: 'bg-red-500/5' }

  if (relegation_playoff_count > 0 && index >= total - relegation_count - relegation_playoff_count && total >= relegation_count + relegation_playoff_count + 1)
    return { posColor: 'text-orange-400 font-bold', posBorder: 'border-l-[3px] border-orange-500', rowBg: 'bg-orange-500/5' }

  return { posColor: 'text-on-surface-variant', posBorder: '', rowBg: index % 2 === 0 ? '' : 'bg-surface-container-lowest' }
}

// Generiert dynamische Legenden-Einträge aus der Config
function buildLegend(config: TournamentConfig, t: (key: string) => string): { color: string; label: string }[] {
  const items: { color: string; label: string }[] = []

  if (config.has_knockout) {
    if (config.ko_direct_spots > 0) items.push({ color: 'bg-green-500', label: t('legendClDirect') })
    if (config.ko_playoff_spots > 0) items.push({ color: 'bg-emerald-400', label: t('legendClPlayoffs') })
    items.push({ color: 'bg-red-500', label: t('legendClOut') })
    return items
  }

  if (config.cl_spots > 0) items.push({ color: 'bg-green-500', label: t('legendClGroups') })
  if (config.cl_playoff_spots > 0) items.push({ color: 'bg-emerald-400', label: t('legendClQuali') })
  if (config.el_spots > 0) items.push({ color: 'bg-blue-500', label: t('legendEl') })
  if (config.conf_spots > 0) items.push({ color: 'bg-sky-400', label: t('legendConfQuali') })
  if (config.relegation_playoff_count > 0) items.push({ color: 'bg-orange-400', label: t('legendRelegationPlayoffs') })
  if (config.relegation_count > 0) items.push({ color: 'bg-red-500', label: t('legendRelegation') })

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
  const [viewPhase, setViewPhase] = useState<'table' | 'baum'>('table')
  const [availablePhases, setAvailablePhases] = useState<number[]>([])
  const [availableTournaments, setAvailableTournaments] = useState<string[]>([])
  // Konfig-Map: tournamentName → TournamentConfig
  const [configMap, setConfigMap] = useState<Record<string, TournamentConfig>>({})

  // Lade Tournament-Configs aus DB (einmalig)
  useEffect(() => {
    supabase.from('tournament_configs').select('*').then(({ data }) => {
      if (data && data.length > 0) {
        const map: Record<string, TournamentConfig> = {}
        data.forEach((cfg: TournamentConfig) => { map[cfg.name] = cfg })
        setConfigMap(map)
      }
    })
  }, [])

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

      // Turniere dynamisch ermitteln
      const uniqueTournaments = new Set<string>()
      ;(matchesData || []).forEach(m => {
        if (m.tournament && m.heim_team !== 'LIGA' && m.gast_team !== 'CHAT') {
          uniqueTournaments.add(m.tournament)
        }
      })
      const sorted = Array.from(uniqueTournaments).sort((a, b) => {
        const na = a.toLowerCase()
        const nb = b.toLowerCase()
        if (na.includes('süper lig')) return -1
        if (nb.includes('süper lig')) return 1
        return a.localeCompare(b)
      })
      if (sorted.length > 0) setAvailableTournaments(sorted)

      // Aktives Turnier setzen (beim ersten Laden)
      const activeTournament = tournament || sorted[0] || 'Süper Lig'

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
  }, [configMap, viewTournament])

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
    const hasHistoricalData = activeConfig?.has_historical_data ?? false

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

  const legendItems = activeConfig ? buildLegend(activeConfig, t) : []

  if (isLaden) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary-container border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-full px-3 md:px-6 lg:px-8 pt-4 md:pt-6 pb-24 md:pb-8 max-w-[1600px] mx-auto w-full animate-page-enter">
      {/* Turnier-Filter & Saison-Selector */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 md:mb-6 max-w-[1600px] w-full gap-3">
        <div className="flex bg-surface-container/50 border border-white/5 p-1 rounded-2xl gap-1.5 backdrop-blur-md">
          {availableTournaments.map(tName => (
            <button
              key={tName}
              onClick={() => {
                setViewTournament(tName)
                setViewPhase('table')
                setSaison(availableSeasons[0]?.id ?? 2026)
              }}
              className={`px-3 py-2 text-[9px] xs:text-[10px] md:text-xs font-mono font-black uppercase tracking-wider rounded-xl whitespace-nowrap transition-all duration-200 cursor-pointer flex items-center gap-2 ${viewTournament === tName ? 'bg-primary-container text-on-primary-container shadow-[0_2px_8px_rgba(251,191,36,0.15)] border border-primary/20 scale-[1.01]' : 'text-on-surface-variant hover:text-on-surface hover:bg-white/5 border border-transparent'}`}
            >
              <img src={getTournamentLogo(tName)} alt={tName} className="w-5 h-5 object-contain drop-shadow-[0_0_8px_rgba(255,255,255,0.6)] brightness-110 shrink-0" />
              {tName}
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
          className="bg-surface-container border border-surface-container-high rounded-lg px-3 py-1.5 text-xs text-on-surface focus:outline-none focus:border-primary-container font-mono"
        >
          {availableSeasons.map(s => (
            <option key={s.id} value={s.id}>{t('seasonLabel', { year: s.label })}</option>
          ))}
        </select>
      </div>

      {/* K.o.-Phasen Tabs — nur wenn das Turnier K.o.-Phasen hat */}
      {activeConfig?.has_knockout && availablePhases.length > 0 && (
        <div className="flex bg-surface-container/40 border border-white/5 p-1 rounded-2xl mb-4 overflow-x-auto hide-scrollbar gap-1.5 backdrop-blur-sm">
          <button
            onClick={() => setViewPhase('table')}
            className={`flex-1 px-4 py-2.5 text-[9px] xs:text-[10px] md:text-xs font-mono font-black uppercase tracking-wider rounded-xl whitespace-nowrap transition-all duration-200 cursor-pointer text-center ${viewPhase === 'table' ? 'bg-primary-container text-on-primary-container shadow-[0_2px_8px_rgba(251,191,36,0.15)] border border-primary/20 scale-[1.01]' : 'text-on-surface-variant hover:text-on-surface hover:bg-white/5 border border-transparent'}`}
          >
            {t('clLeaguePhaseTable')}
          </button>
          <button
            onClick={() => setViewPhase('baum')}
            className={`flex-1 px-4 py-2.5 text-[9px] xs:text-[10px] md:text-xs font-mono font-black uppercase tracking-wider rounded-xl whitespace-nowrap transition-all duration-200 cursor-pointer text-center ${viewPhase === 'baum' ? 'bg-primary-container text-on-primary-container shadow-[0_2px_8px_rgba(251,191,36,0.15)] border border-primary/20 scale-[1.01]' : 'text-on-surface-variant hover:text-on-surface hover:bg-white/5 border border-transparent'}`}
          >
            {t('clKnockoutPhase')}
          </button>
        </div>
      )}

      {viewPhase === 'baum' && availablePhases.length > 0 ? (
        // ─── Turnierbaum (K.o.) ───
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
          <div className="lg:col-span-8 flex flex-col">
            {/* Historische Daten nicht verfügbar */}
            {activeConfig && !activeConfig.has_historical_data && saison !== (availableSeasons[0]?.id ?? 2026) ? (
              <div className="bg-surface-container-low border border-surface-container-high rounded-xl p-8 text-center">
                <p className="text-on-surface-variant font-mono text-sm">{t('noHistoricalData')}</p>
              </div>
            ) : (
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
                      const { posColor, posBorder, rowBg } = getRowStyle(index, standings.length, activeConfig)
                      const isSelected = selectedTeam === row.team

                      return (
                        <tr
                          key={row.team}
                          onClick={() => { if (isDesktop) setSelectedTeam(row.team) }}
                          className={`border-b border-surface-container-high hover:bg-surface-container/60 transition-colors cursor-pointer ${rowBg} ${isSelected && isDesktop ? 'bg-primary-container/10 border-r-2 border-primary font-bold' : ''}`}
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
                          <td className={`py-2 px-1 text-center font-mono ${row.goalDifference > 0 ? 'text-green-400' : row.goalDifference < 0 ? 'text-red-400' : 'text-on-surface-variant'}`}>
                            {row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}
                          </td>
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

          {/* Team Inspector (Desktop only) */}
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

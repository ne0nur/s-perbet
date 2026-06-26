import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { Users, Copy, Check, Plus, LogIn, X, Trophy, LogOut, Trash2, MoreHorizontal, MessageCircle, Target, Share2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { LeagueChat } from '../components/LeagueChat'
import { useToastStore } from '../stores/toastStore'
import { calculateLevel, getLevelBadgeStyle } from '../lib/utils'
import { LevelBadge } from '../components/ui/LevelBadge'
import { useTranslation } from '../utils/translations'

interface Profile {
  id: string
  username: string
  avatar_url: string | null
  gesamt_punkte: number
}

interface TipSummary {
  user_id: string
  match_id: string
  tipp_heim: number
  tipp_gast: number
  punkte: number | null
}

// ─── Team-Abkürzungen ────────────────────────────────
function teamKuerzel(name: string): string {
  const map: Record<string, string> = {
    'Fenerbahçe': 'FEN', 'Galatasaray': 'GAL', 'Beşiktaş': 'BJK', 'Trabzonspor': 'TRA',
    'Başakşehir': 'BAŞ', 'Adana Demirspor': 'ADS', 'Antalyaspor': 'ANT', 'Konyaspor': 'KON',
    'Sivasspor': 'SIV', 'Kayserispor': 'KAY', 'Gaziantep FK': 'GFK', 'Hatayspor': 'HAT',
    'Alanyaspor': 'ALA', 'Kasımpaşa': 'KAS', 'Ankaragücü': 'ANK', 'Samsunspor': 'SAM',
    'Pendikspor': 'PEN', 'Rizespor': 'RIZ', 'Karagümrük': 'FKG', 'Bodrum FK': 'BOD',
    'Eyüpspor': 'EYÜ', 'Göztepe': 'GÖZ', 'LIGA': 'LIG', 'CHAT': 'CHT',
  }
  return map[name] || name.slice(0, 3).toUpperCase()
}

// ─── Typen ───────────────────────────────────────────
interface MatchInfo {
  id: string; heim_team: string; gast_team: string; tore_heim: number | null
  tore_gast: number | null; status: string; spieltag: number; tournament: string
}
interface MitgliedRow {
  id: string; username: string; avatar_url: string | null; gesamt_punkte: number
  tipps: Record<string, { heim: number; gast: number; punkte: number }>
  spieltag_punkte: number; spieltag_tipps: number; spieltag_gesamt: number
  trend?: number
}
interface Liga { id: string; name: string; invite_code: string; creator_id: string; active_tournaments: string[] }

// ─── Punkte-Farbe ────────────────────────────────────
function punkteKlasse(p: number): string {
  if (p === 4) return 'bg-green-500/20 text-green-400'
  if (p === 3) return 'bg-amber-500/20 text-amber-400'
  if (p === 2) return 'bg-blue-500/20 text-blue-400'
  return 'text-on-surface-variant/40'
}
function subscriptPunkte(p: number): string {
  const subs = ['₀','₁','₂','₃','₄']
  return subs[Math.min(p, 4)] || ''
}

// ─── Komponente ──────────────────────────────────────
export function LeaguePage() {
  const { t, language } = useTranslation()
  const { user } = useAuthStore()
  const [meineLigen, setMeineLigen] = useState<Liga[]>([])
  const [ligaMeta, setLigaMeta] = useState<Record<string, { mitglieder: number; rang: number }>>({})
  const [aktiveLiga, setAktiveLiga] = useState<Liga | null>(null)
  const [mitglieder, setMitglieder] = useState<MitgliedRow[]>([])
  const [isLaden, setIsLaden] = useState(true)
  const [viewSpieltag, setViewSpieltag] = useState<'gesamt' | number>('gesamt')
  const [maxSpieltag, setMaxSpieltag] = useState(38)
  const [codeKopiert, setCodeKopiert] = useState(false)
  const [zeigeErstellen, setZeigeErstellen] = useState(false)
  const [neueLigaName, setNeueLigaName] = useState('')
  const [beitrittsCode, setBeitrittsCode] = useState('')
  const [zeigeMenu, setZeigeMenu] = useState(false)
  const [zeigeTurnierModal, setZeigeTurnierModal] = useState(false)
  const [editTurniere, setEditTurniere] = useState<string[]>([])
  const [zeigeChatDrawer, setZeigeChatDrawer] = useState(false)
  const [saison, setSaison] = useState<number | null>(null)
  const [seasonsList, setSeasonsList] = useState<{id: number, name: string}[]>([])
  const [viewTournament, setViewTournament] = useState<string>('Alle')
  const [neueLigaTurniere, setNeueLigaTurniere] = useState<string[]>(['Süper Lig'])

  const [allMatches, setAllMatches] = useState<MatchInfo[]>([])
  const tableScrollRef = useRef<HTMLDivElement>(null)
  const initialized = useRef(false)
  const datenGeladen = useRef(false)
  const allTipsRef = useRef<TipSummary[]>([])
  const allProfilesRef = useRef<Profile[]>([])

  const tabRef = useRef<HTMLDivElement>(null)
  const fetchSeasons = useCallback(async () => {
    const { data } = await supabase.from('seasons').select('*').order('id', { ascending: false })
    if (data && data.length > 0) {
      setSeasonsList(data)
      const current = data.find(s => s.is_current) || data[0]
      setSaison(current.id)
    } else {
      setSaison(2026)
      setSeasonsList([{ id: 2026, name: 'Saison 2026/27' }])
    }
  }, [])

  const ladeLigen = useCallback(async () => {
    if (!user) { setIsLaden(false); return }

    const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
    const isAdmin = profile?.is_admin || false

    let ligenData: Liga[] = []

    if (isAdmin) {
      const { data } = await supabase.from('leagues').select('*').order('created_at', { ascending: false })
      if (data) ligenData = data as Liga[]
    } else {
      const { data: mof } = await supabase.from('league_members').select('league_id').eq('user_id', user.id)
      if (mof?.length) {
        const ids = mof.map(m => m.league_id)
        const { data } = await supabase.from('leagues').select('*').in('id', ids).order('created_at', { ascending: false })
        if (data) ligenData = data as Liga[]
      }
    }

    if (ligenData.length) {
      setMeineLigen(ligenData)
      const meta: Record<string, { mitglieder: number; rang: number }> = {}
      for (const liga of ligenData) {
        const { count } = await supabase.from('league_members').select('*', { count: 'exact', head: true }).eq('league_id', liga.id)
        meta[liga.id] = { mitglieder: count || 0, rang: 0 }
      }
      setLigaMeta(meta)
      
      if (ligenData.length === 1) {
        setAktiveLiga(ligenData[0])
      }
    }
    setIsLaden(false)
  }, [user])

  const ladeDaten = useCallback(async () => {
    if (!aktiveLiga) return

    // 1. Mitglieder
    const { data: members } = await supabase.from('league_members').select('user_id').eq('league_id', aktiveLiga.id)
    if (!members?.length) { setMitglieder([]); setIsLaden(false); return }
    const userIds = members.map(m => m.user_id)

    // 2. Profile
    const { data: profiles } = await supabase.from('profiles').select('id,username,avatar_url,gesamt_punkte').in('id', userIds)
    if (!profiles) { setIsLaden(false); return }
    allProfilesRef.current = profiles as Profile[]

    // 3. Max Spieltag + aktuellen Spieltag ermitteln
    const maxSt = allMatches.length > 0
      ? Math.max(...allMatches.map(m => m.spieltag))
      : 0
    if (maxSt > 0) setMaxSpieltag(maxSt)

    if (!initialized.current) {
      initialized.current = true
      const { data: stData } = await supabase.from('matches').select('spieltag').eq('status', 'upcoming').order('anpfiff', { ascending: true }).limit(1)
      const currentST = stData?.[0]?.spieltag || 1
      setViewSpieltag(currentST)
    }

    // 4. Matches für die gewählte Saison laden
    let query = supabase.from('matches')
      .select('id,heim_team,gast_team,tore_heim,tore_gast,status,spieltag,tournament')
      .order('anpfiff')
    if (saison) {
      query = query.eq('season', saison)
    }
    const { data: matchesData } = await query
    const fetchedMatches = (matchesData || []) as MatchInfo[]
    setAllMatches(fetchedMatches)

    // MaxSpieltag updaten
    if (fetchedMatches.length > 0) {
      const m = Math.max(...fetchedMatches.map(x => x.spieltag))
      setMaxSpieltag(m)
    }

    const matchIds = fetchedMatches.map(m => m.id)

    // 5. ALLE Tipps laden (für alle Matches)
    const { data: tips } = await supabase.from('tips')
      .select('user_id,match_id,tipp_heim,tipp_gast,punkte')
      .in('user_id', userIds).in('match_id', matchIds)
    allTipsRef.current = (tips || []) as TipSummary[]

    datenGeladen.current = true
    setIsLaden(false)
  }, [aktiveLiga, saison, allMatches])

  const computeRows = useCallback(() => {
    const profiles = allProfilesRef.current
    const tips = allTipsRef.current
    if (!profiles.length) return

    // Nur Matches für aktuellen viewSpieltag und viewTournament
    let activeMatches = allMatches
    if (viewTournament !== 'Alle') {
      activeMatches = activeMatches.filter(m => (m.tournament || 'Süper Lik') === viewTournament)
    }
    if (viewSpieltag !== 'gesamt') {
      activeMatches = activeMatches.filter(m => m.spieltag === viewSpieltag)
    }
    const activeMatchIds = new Set(activeMatches.map(m => m.id))
    
    // For season points, we also want to filter by tournament if 'Alle' is NOT selected
    // If 'Alle' is selected, season points are across ALL tournaments the league has active
    const leagueTournaments = new Set(aktiveLiga?.active_tournaments || ['Süper Lig'])
    const validMatchesForPoints = allMatches.filter(m => {
      if (viewTournament !== 'Alle') return (m.tournament || 'Süper Lig') === viewTournament
      return leagueTournaments.has(m.tournament || 'Süper Lig')
    })
    const validMatchesForPointsIds = new Set(validMatchesForPoints.map(m => m.id))

    const userIds = profiles.map((p) => p.id)

    // Tipp-Map + Spieltag-Punkte + Saison-Gesamtpunkte
    const tippMap: Record<string, Record<string, { heim: number; gast: number; punkte: number }>> = {}
    const spPunkte: Record<string, number> = {}
    const seasonPoints: Record<string, number> = {}
    const previousPoints: Record<string, number> = {}

    const finishedMatches = validMatchesForPoints.filter(m => m.status === 'finished' || m.status === 'live')
    const maxFinishedSpieltag = finishedMatches.length > 0 ? Math.max(...finishedMatches.map(m => m.spieltag)) : 0
    
    userIds.forEach(uid => { 
      spPunkte[uid] = 0 
      seasonPoints[uid] = 0
      previousPoints[uid] = 0
    })

    if (tips) {
      tips.forEach((t) => {
        // Saison-Punkte berechnen (abhängig vom aktiven Turnier-Filter)
        if (validMatchesForPointsIds.has(t.match_id)) {
          seasonPoints[t.user_id] = (seasonPoints[t.user_id] || 0) + (t.punkte || 0)
          const matchInfo = validMatchesForPoints.find(m => m.id === t.match_id)
          if (matchInfo && matchInfo.spieltag < maxFinishedSpieltag) {
            previousPoints[t.user_id] = (previousPoints[t.user_id] || 0) + (t.punkte || 0)
          }
        }

        if (!activeMatchIds.has(t.match_id)) return
        if (!tippMap[t.user_id]) tippMap[t.user_id] = {}
        tippMap[t.user_id][t.match_id] = { heim: t.tipp_heim, gast: t.tipp_gast, punkte: t.punkte || 0 }
        spPunkte[t.user_id] = (spPunkte[t.user_id] || 0) + (t.punkte || 0)
      })
    }

    const spieltagGesamt = activeMatches.length || 9

    const prevRankOrder = [...userIds].sort((a, b) => previousPoints[b] - previousPoints[a])
    const prevRankMap: Record<string, number> = {}
    prevRankOrder.forEach((uid, index) => {
      prevRankMap[uid] = index + 1
    })

    const rows: MitgliedRow[] = profiles.map((p) => ({
      id: p.id, username: p.username, avatar_url: p.avatar_url || null, 
      gesamt_punkte: seasonPoints[p.id] || 0,
      tipps: tippMap[p.id] || {},
      spieltag_punkte: spPunkte[p.id] || 0,
      spieltag_tipps: Object.keys(tippMap[p.id] || {}).length,
      spieltag_gesamt: spieltagGesamt,
    }))

    if (viewSpieltag === 'gesamt') {
      rows.sort((a, b) => b.gesamt_punkte - a.gesamt_punkte)
    } else {
      rows.sort((a, b) => b.spieltag_punkte - a.spieltag_punkte || b.gesamt_punkte - a.gesamt_punkte)
    }

    rows.forEach((row, index) => {
      const currentRank = index + 1
      const prevRank = prevRankMap[row.id] || currentRank
      if (maxFinishedSpieltag > 1 && viewSpieltag === 'gesamt') {
        row.trend = prevRank - currentRank
      } else {
        row.trend = 0
      }
    })

    setMitglieder(rows)
  }, [allMatches, viewSpieltag, viewTournament, aktiveLiga])

  useEffect(() => { 
    fetchSeasons()
    ladeLigen() 
  }, [fetchSeasons, ladeLigen])

  useEffect(() => {
    if (aktiveLiga && saison) {
      datenGeladen.current = false
      setIsLaden(true)
      ladeDaten()
    }
  }, [aktiveLiga, saison, ladeDaten])

  useEffect(() => {
    if (aktiveLiga && datenGeladen.current) {
      computeRows()
    }
  }, [viewSpieltag, viewTournament, allMatches, computeRows, aktiveLiga])

  const filteredMatches = useMemo(() => {
    let matches = allMatches
    if (viewTournament !== 'Alle') {
      matches = matches.filter(m => (m.tournament || 'Süper Lig') === viewTournament)
    }
    if (viewSpieltag === 'gesamt') return matches
    return matches.filter(m => m.spieltag === viewSpieltag)
  }, [viewSpieltag, viewTournament, allMatches])

  useEffect(() => {
    if (viewSpieltag === 'gesamt' || !tabRef.current) return
    const tabBtn = tabRef.current.querySelector(`[data-st="${viewSpieltag}"]`) as HTMLElement | null
    if (tabBtn) tabBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [viewSpieltag])

  // ─── Liga Aktionen ─────────────────────────────────
  async function handleLigaErstellen() {
    if (!user || !neueLigaName.trim()) return
    const code = 'LIGA-' + Math.random().toString(36).substring(2, 8).toUpperCase()
    const { data, error } = await supabase.from('leagues').insert({ name: neueLigaName.trim(), invite_code: code, creator_id: user.id, active_tournaments: neueLigaTurniere }).select().single()
    if (!error && data) {
      await supabase.from('league_members').insert({ league_id: data.id, user_id: user.id })
      setZeigeErstellen(false); setNeueLigaName('')
      setAktiveLiga(data as Liga); await ladeLigen()
    }
  }
  async function handleBeitreten() {
    if (!user || !beitrittsCode.trim()) return
    const { data: leagueId, error } = await supabase.rpc('join_league_by_code', { p_invite_code: beitrittsCode.trim().toUpperCase() })
    
    if (error || !leagueId) {
      useToastStore.getState().toast(t('codeInvalidOrNotFound'), 'error')
      return
    }

    // Da wir jetzt Mitglied sind, greift die RLS-Policy und wir können die Ligadaten abrufen
    const { data: liga } = await supabase.from('leagues').select('*').eq('id', leagueId).single()
    
    setBeitrittsCode('')
    useToastStore.getState().toast(t('joinedLeagueToast', { name: liga?.name || '' }))
    if (liga) setAktiveLiga(liga as Liga)
    await ladeLigen()
  }
  function handleCodeKopieren(code: string) { navigator.clipboard.writeText(code); setCodeKopiert(true); setTimeout(() => setCodeKopiert(false), 2000); useToastStore.getState().toast(t('copied'), 'info') }

  async function handleLigaVerlassen() {
    if (!user || !aktiveLiga) return
    if (!window.confirm(t('leaveLeagueConfirm'))) return
    await supabase.from('league_members').delete().eq('league_id', aktiveLiga.id).eq('user_id', user.id)
    useToastStore.getState().toast(t('leftLeagueToast', { name: aktiveLiga.name }))
    setZeigeMenu(false)
    setAktiveLiga(null)
    await ladeLigen()
  }

  async function handleLigaLoeschen() {
    if (!user || !aktiveLiga) return
    const istErsteller = aktiveLiga.creator_id === user.id
    if (!istErsteller) return
    if (!window.confirm(t('deleteLeagueConfirm'))) return
    await supabase.from('leagues').delete().eq('id', aktiveLiga.id)
    useToastStore.getState().toast(t('deletedLeagueToast', { name: aktiveLiga.name }))
    setZeigeMenu(false)
    setAktiveLiga(null)
    await ladeLigen()
  }

  async function handleTurniereSpeichern() {
    if (!user || !aktiveLiga || editTurniere.length === 0) return
    const istErsteller = aktiveLiga.creator_id === user.id
    if (!istErsteller) return
    const { error } = await supabase.from('leagues').update({ active_tournaments: editTurniere }).eq('id', aktiveLiga.id)
    if (!error) {
      setAktiveLiga({ ...aktiveLiga, active_tournaments: editTurniere })
      setZeigeTurnierModal(false)
      useToastStore.getState().toast(t('tournamentsUpdatedToast'), 'success')
      setViewTournament('Alle')
      await ladeLigen() // Refresh die Meta-Daten in meineLigen
    } else {
      useToastStore.getState().toast(t('errorUpdatingTournamentsToast'), 'error')
    }
  }

  // ─── Dynamische Tabs ───────────────────────────────
  const getPhaseLabel = (st: number, tournament: string) => {
    if (tournament === 'Champions League') {
      if (st <= 8) return t('clRoundLeague', { st })
      if (st === 9) return t('clRoundPlayoffs')
      if (st === 10) return t('clRoundLast16')
      if (st === 11) return t('clRoundQuarter')
      if (st === 12) return t('clRoundSemi')
      if (st === 13) return t('clRoundFinal')
      return `${st}.`
    }
    return `${st}.`
  }

  const availableSpieltage = useMemo(() => {
    let matches = allMatches;
    if (viewTournament !== 'Alle') {
       matches = matches.filter(m => (m.tournament || 'Süper Lig') === viewTournament);
    }
    const st = new Set(matches.map(m => m.spieltag));
    return Array.from(st).sort((a,b) => a - b);
  }, [allMatches, viewTournament]);

  const tabs: { key: 'gesamt' | number; label: string }[] = [
    { key: 'gesamt', label: t('gesamt') },
    ...availableSpieltage.map(st => ({ key: st, label: getPhaseLabel(st, viewTournament) }))
  ]

  // Wenn "Alle" ausgewählt ist, zeige Fallback 1..maxSpieltag
  if (viewTournament === 'Alle' && availableSpieltage.length === 0) {
    for (let i = 1; i <= maxSpieltag; i++) {
      tabs.push({ key: i, label: `${i}.` });
    }
  }

  // ─── Loading ───────────────────────────────────────
  if (isLaden && !aktiveLiga) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary-container border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-full pb-24 md:pb-6 flex flex-col">
      {/* Detail-Ansicht (wenn Liga ausgewählt) */}
      {aktiveLiga && (
        <div className="flex flex-col flex-1 min-h-0 md:px-6 lg:px-8 md:pt-4 max-w-[1600px] mx-auto w-full animate-page-enter">
          {/* Header mit Back-Button */}
          <div className="px-4 pt-4 mb-3 md:px-0">
            <div className="flex items-center gap-4 mb-5 flex-wrap">
              <button onClick={() => { setAktiveLiga(null); setZeigeChatDrawer(false); }} className="p-2 bg-surface-container-low border border-surface-container-high shadow-sm text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-full transition-all">
                <X size={20} />
              </button>
              <div className="flex-1 min-w-[200px]">
                <div className="flex items-center gap-1.5 text-primary-fixed-dim mb-1">
                  <Trophy size={14} />
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider">{t('currentLeague')}</span>
                </div>
                <h1 className="text-3xl md:text-4xl font-black text-on-surface tracking-tight leading-none">{aktiveLiga.name}</h1>
              </div>

              {/* Saison-Selector */}
              {seasonsList.length > 0 && (
                <select
                  value={saison || ''}
                  onChange={(e) => setSaison(parseInt(e.target.value))}
                  className="bg-surface-container border border-surface-container-high rounded-lg px-2 py-1.5 text-xs text-on-surface focus:outline-none focus:border-primary-container font-mono ml-auto"
                >
                  {seasonsList.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              )}

              {/* Liga-Menü */}
              <div className="relative">
                <button onClick={() => setZeigeMenu(!zeigeMenu)}
                  className="p-1 text-on-surface-variant hover:text-on-surface rounded">
                  <MoreHorizontal size={18} />
                </button>
                {zeigeMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setZeigeMenu(false)} />
                    <div className="absolute right-0 top-8 z-50 bg-surface-container-high border border-surface-container-highest rounded-lg py-1 min-w-[160px] shadow-lg">
                      <button onClick={handleLigaVerlassen}
                        className="w-full flex items-center gap-2 px-3 py-2 text-[11px] font-medium text-on-surface hover:bg-surface-container-highest transition-colors">
                        <LogOut size={13} className="text-on-surface-variant" /> {t('leaveLeague')}
                      </button>
                      {aktiveLiga.creator_id === user?.id && (
                        <>
                          <button onClick={() => { setEditTurniere(aktiveLiga.active_tournaments || ['Süper Lig']); setZeigeTurnierModal(true); setZeigeMenu(false); }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-[11px] font-medium text-on-surface hover:bg-surface-container-highest transition-colors border-t border-surface-container-high">
                            <Target size={13} className="text-on-surface-variant" /> {t('manageTournaments')}
                          </button>
                          <button onClick={handleLigaLoeschen}
                            className="w-full flex items-center gap-2 px-3 py-2 text-[11px] font-medium text-red-400 hover:bg-surface-container-highest transition-colors border-t border-surface-container-high">
                            <Trash2 size={13} /> {t('deleteLeague')}
                          </button>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Turnier-Filter */}
            {aktiveLiga.active_tournaments?.length > 1 && (
              <div className="flex bg-surface-container/50 border border-white/5 p-1 rounded-2xl mb-3 mx-4 md:mx-0 overflow-x-auto hide-scrollbar backdrop-blur-md gap-1">
                <button
                  onClick={() => setViewTournament('Alle')}
                  className={`px-3 py-2 text-[9px] xs:text-[10px] md:text-xs font-mono font-black uppercase tracking-wider rounded-xl whitespace-nowrap transition-all duration-200 cursor-pointer ${viewTournament === 'Alle' ? 'bg-primary-container text-on-primary-container shadow-[0_2px_8px_rgba(251,191,36,0.15)] border border-primary/20 scale-[1.01]' : 'text-on-surface-variant hover:text-on-surface hover:bg-white/5 border border-transparent'}`}
                >
                  {t('filterAll')}
                </button>
                {aktiveLiga.active_tournaments.map(t => (
                  <button
                    key={t}
                    onClick={() => setViewTournament(t)}
                    className={`px-3 py-2 text-[9px] xs:text-[10px] md:text-xs font-mono font-black uppercase tracking-wider rounded-xl whitespace-nowrap transition-all duration-200 cursor-pointer flex items-center gap-2 ${viewTournament === t ? 'bg-primary-container text-on-primary-container shadow-[0_2px_8px_rgba(251,191,36,0.15)] border border-primary/20 scale-[1.01]' : 'text-on-surface-variant hover:text-on-surface hover:bg-white/5 border border-transparent'}`}
                  >
                    {t === 'Champions League' ? (
                      <img src={`${import.meta.env.BASE_URL}logos/UEFA_Champions_League_logo.png`} alt="CL" className="w-5 h-5 object-contain drop-shadow-[0_0_8px_rgba(255,255,255,0.6)] brightness-110 shrink-0" />
                    ) : t === 'Süper Lig' ? (
                      <img src={`${import.meta.env.BASE_URL}logos/Süper_Lig.png`} alt="SL" className="w-5 h-5 object-contain drop-shadow-[0_0_8px_rgba(255,255,255,0.6)] brightness-110 shrink-0" />
                    ) : null}
                    {t}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ─── Detail-Content ─── */}
          {isLaden ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-6 h-6 border-2 border-primary-container border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-8 xl:gap-10 px-4 md:px-0 flex-1 min-h-0 items-start">
              {/* Left Column: Spieltag-Tabs, Table, Invite Info */}
              <div className="md:col-span-8 flex flex-col min-h-0 space-y-4 w-full">
                
                {/* Admin-Zuschauermodus Banner */}
                {user && mitglieder.length > 0 && !mitglieder.some(m => m.id === user.id) && (
                  <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                      <span className="text-blue-400 text-sm">👀</span>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-blue-400 uppercase tracking-wider mb-0.5">{t('adminSpectator')}</p>
                      <p className="text-[10px] text-blue-400/70 font-mono">{t('spectatorWarning')}</p>
                    </div>
                  </div>
                )}
                {/* Spieltag-Tabs Segmented Control */}
                <div className="bg-surface-container/40 border border-white/5 p-1 rounded-2xl flex items-center gap-1.5 overflow-hidden backdrop-blur-sm -mx-4 md:mx-0">
                  {/* Sticky "Gesamt" Button */}
                  <button
                    data-st="gesamt"
                    onClick={() => setViewSpieltag('gesamt')}
                    className={`shrink-0 px-3.5 py-2 rounded-xl text-[9px] xs:text-[10px] md:text-xs font-mono font-black uppercase tracking-wider whitespace-nowrap transition-all duration-200 cursor-pointer ${
                      viewSpieltag === 'gesamt'
                        ? 'bg-primary-container text-on-primary-container shadow-[0_2px_8px_rgba(251,191,36,0.15)] border border-primary/20 scale-[1.01]'
                        : 'text-on-surface-variant hover:text-on-surface hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    {t('gesamt')}
                  </button>

                  <span className="w-[1px] h-4 bg-white/10 shrink-0" />

                  {/* Scrollable Spieltag-Nummern */}
                  <div ref={tabRef} className="overflow-x-auto no-scrollbar flex-1" style={{ maskImage: 'linear-gradient(to right, transparent 0px, black 8px, black calc(100% - 16px), transparent 100%)', WebkitMaskImage: 'linear-gradient(to right, transparent 0px, black 8px, black calc(100% - 16px), transparent 100%)' }}>
                    <div className="flex gap-1.5 px-3 min-w-max">
                      {tabs.filter(t => t.key !== 'gesamt').map(t => (
                        <button key={t.key} data-st={t.key} onClick={() => setViewSpieltag(t.key)}
                          className={`px-3 py-2 rounded-xl text-[9px] xs:text-[10px] md:text-xs font-mono font-black uppercase tracking-wider whitespace-nowrap transition-all duration-200 cursor-pointer ${
                            viewSpieltag === t.key
                              ? 'bg-primary-container text-on-primary-container shadow-[0_2px_8px_rgba(251,191,36,0.15)] border border-primary/20 scale-[1.01]'
                              : 'text-on-surface-variant hover:text-on-surface hover:bg-white/5 border border-transparent'
                          }`}>
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Mitglieder-Tabelle */}
                <div className="overflow-y-auto max-h-[50vh] md:max-h-[60vh] shrink-0">
                  {mitglieder.length === 0 ? (
                    <div className="bg-surface-container-low border border-surface-container-high rounded-xl p-8 text-center">
                      <div className="w-12 h-12 rounded-full bg-surface-container-high flex items-center justify-center mx-auto mb-3">
                        <Trophy size={20} className="text-on-surface-variant/30" />
                      </div>
                      <p className="text-on-surface text-sm font-bold mb-1">{t('noTipsYet')}</p>
                      <p className="text-on-surface-variant text-[11px] max-w-[200px] mx-auto">
                        {t('tableCalculationNotice')}
                      </p>
                    </div>
                  ) : (
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={`${viewTournament}-${viewSpieltag}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="w-full"
                      >
                        <div ref={tableScrollRef} className="overflow-x-auto no-scrollbar border border-surface-container-high rounded-xl bg-surface-container-low/40">
                          <table className="w-full text-left border-collapse min-w-[600px]">
                        <thead>
                          <tr className="border-b border-surface-container-high bg-surface-container-low">
                            <th className="py-2.5 pl-3 pr-2 text-[10px] font-mono font-medium text-on-surface-variant/60 uppercase tracking-wider w-8" title={t('rank')}>#</th>
                            <th className="py-2.5 pr-2 text-[10px] font-mono font-medium text-on-surface-variant/60 uppercase tracking-wider" title={t('player')}>{t('player')}</th>
                            {filteredMatches.map(m => (
                              <th key={m.id} className="py-2.5 px-1 text-[10px] font-mono font-medium text-on-surface-variant/60 uppercase tracking-wider text-center w-10 relative" title={`${m.heim_team} vs ${m.gast_team}`}>
                                {(m.tournament === 'Champions League') && (
                                  <div className="absolute top-0 right-1/2 translate-x-1/2 -mt-1 text-[8px] opacity-70">⭐</div>
                                )}
                                <span className="block mt-1">{teamKuerzel(m.heim_team)}</span>
                                <span className="block text-[8px]">vs</span>
                                <span className="block">{teamKuerzel(m.gast_team)}</span>
                              </th>
                            ))}
                            <th className="py-2.5 pr-2 text-[10px] font-mono font-medium text-on-surface-variant/60 uppercase tracking-wider w-14 text-right" title={t('spieltag')}>Sp</th>
                            <th className="py-2.5 pr-3 text-[10px] font-mono font-medium text-on-surface-variant/60 uppercase tracking-wider w-14 text-right" title={t('pointsLong')}>{t('pointsShort')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {mitglieder.map((m, idx) => {
                            const isMe = m.id === user?.id
                            return (
                              <tr key={m.id} className={`border-b border-surface-container-high/50 last:border-0 hover:bg-white/[0.02] transition-colors duration-200 group/row border-l-2 ${isMe ? 'bg-primary-container/8 border-l-primary-container shadow-[inset_3px_0_0_#fbbf24]' : 'border-l-transparent hover:border-l-white/20'}`}>
                                <td className="py-2.5 pr-2 pl-3">
                                  <div className="flex flex-col items-center justify-center">
                                    {idx === 0 ? (
                                      <span className="text-base select-none drop-shadow-[0_0_6px_rgba(251,191,36,0.6)]" title="1. Platz">🥇</span>
                                    ) : idx === 1 ? (
                                      <span className="text-base select-none drop-shadow-[0_0_6px_rgba(226,232,240,0.5)]" title="2. Platz">🥈</span>
                                    ) : idx === 2 ? (
                                      <span className="text-base select-none drop-shadow-[0_0_6px_rgba(254,215,170,0.5)]" title="3. Platz">🥉</span>
                                    ) : (
                                      <span className="text-[11px] font-mono font-bold text-on-surface-variant/80">{idx + 1}</span>
                                    )}
                                    {m.trend !== undefined && m.trend !== 0 && (
                                      <span className={`text-[8px] font-bold ${m.trend > 0 ? 'text-emerald-400' : 'text-red-400'} animate-bounce`}>
                                        {m.trend > 0 ? '▲' : '▼'} {Math.abs(m.trend)}
                                      </span>
                                    )}
                                    {m.trend === 0 && viewSpieltag === 'gesamt' && (
                                      <span className="text-[8px] font-bold text-on-surface-variant/30">-</span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-2.5 pr-2">
                                  <div className="flex items-center gap-1.5 min-w-[90px]">
                                    <div className="relative w-6.5 h-6.5 flex-shrink-0">
                                      <div className="w-full h-full rounded-full bg-surface-container-high overflow-hidden border border-white/5">
                                        {m.avatar_url ? (
                                          <img src={m.avatar_url} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                          <div className="w-full h-full flex items-center justify-center text-[9px] font-bold text-on-surface-variant/40">
                                            {m.username?.charAt(0).toUpperCase() || '?'}
                                          </div>
                                        )}
                                      </div>
                                      <LevelBadge level={calculateLevel(m.gesamt_punkte)} className="absolute -bottom-0.5 -right-0.5 z-10 text-[7px] h-3.5 w-3.5 rounded-full shadow shadow-black/80 select-none">
                                        {calculateLevel(m.gesamt_punkte)}
                                      </LevelBadge>
                                    </div>
                                    <span className={`text-[11px] font-medium truncate max-w-[80px] flex items-center gap-1 ${isMe ? 'text-primary-fixed-dim' : 'text-on-surface'}`}>
                                      {m.username}
                                      {m.id === aktiveLiga.creator_id && <span title={t('leagueCreator')}>👑</span>}
                                    </span>
                                  </div>
                                </td>
                                {filteredMatches.map(match => {
                                  const tipp = m.tipps[match.id]
                                  const hasResult = match.status === 'finished' && match.tore_heim !== null && match.tore_gast !== null
                                  const punkteValue = hasResult && tipp ? tipp.punkte : null

                                  if (!tipp) return (
                                    <td key={match.id} className="py-2.5 px-1 text-center">
                                      <span className="text-[10px] text-on-surface-variant/25">–</span>
                                    </td>
                                  )
                                  return (
                                    <td key={match.id} className={`py-2.5 px-1 text-center rounded ${punkteValue ? punkteKlasse(punkteValue) : ''}`}>
                                      <div className="flex flex-col items-center">
                                        <span className={`text-[10px] font-mono leading-tight ${hasResult ? 'text-on-surface font-bold' : 'text-on-surface-variant/60'}`}>
                                          {tipp.heim}:{tipp.gast}
                                        </span>
                                        {punkteValue != null && punkteValue > 0 && (
                                          <span className="text-[8px] font-mono leading-tight">{punkteValue}{subscriptPunkte(punkteValue)}</span>
                                        )}
                                      </div>
                                    </td>
                                  )
                                })}
                                <td className="py-2.5 pr-2 text-right">
                                  <span className="text-[11px] font-mono font-bold text-on-surface">
                                    {viewSpieltag === 'gesamt' ? m.gesamt_punkte : m.spieltag_punkte}
                                  </span>
                                </td>
                                <td className="py-2.5 pr-3 text-right">
                                  <span className="text-[11px] font-mono font-bold text-primary-fixed-dim">{m.gesamt_punkte}</span>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                        </div>
                      </motion.div>
                    </AnimatePresence>
                  )}
                </div>

                {/* Einladungs-Code */}
                <div className="bg-surface-container-low border border-surface-container-high rounded-xl px-4 py-3 flex items-center gap-2 shrink-0">
                  <span className="text-[10px] text-on-surface-variant/60 shrink-0">{t('shareThisCode')}</span>
                  <span className="text-[11px] font-mono font-bold text-primary-fixed-dim tracking-wider truncate">{aktiveLiga.invite_code}</span>
                  <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                    <button onClick={() => handleCodeKopieren(aktiveLiga.invite_code)}
                      className="btn-press bg-primary-container text-on-primary-container px-3 py-1.5 rounded-lg font-mono text-[10px] font-bold uppercase tracking-wider hover:opacity-90 flex items-center gap-1.5 border border-primary-container/20">
                      {codeKopiert ? <Check size={12} /> : <Copy size={12} />}
                      {codeKopiert ? t('copied') : t('copy')}
                    </button>
                    <button onClick={async () => {
                      const joinUrl = `${window.location.origin}${import.meta.env.BASE_URL}?join=${aktiveLiga.invite_code}`
                      const text = language === 'tr'
                        ? `SüperBET ligime katıl! Kod: ${aktiveLiga.invite_code}`
                        : language === 'en'
                        ? `Join my SüperBET league! Code: ${aktiveLiga.invite_code}`
                        : `Tritt meiner SüperBET-Liga bei! Code: ${aktiveLiga.invite_code}`
                      if (navigator.share) {
                        try { await navigator.share({ title: 'SüperBET Liga', text, url: joinUrl }) } catch {}
                      } else {
                        try { await navigator.clipboard.writeText(joinUrl) } catch {}
                        useToastStore.getState().toast(language === 'tr' ? 'Link kopyalandı!' : language === 'en' ? 'Link copied!' : 'Link kopiert!')
                      }
                    }}
                      className="btn-press bg-surface-container-high text-on-surface-variant px-3 py-1.5 rounded-lg font-mono text-[10px] font-bold uppercase tracking-wider hover:bg-primary-container/10 hover:text-primary border border-white/10 flex items-center gap-1.5">
                      <Share2 size={12} />
                    </button>
                  </div>
                </div>

                {/* Liga-Chat Trigger-Button (only visible on mobile) */}
                <button
                  onClick={() => setZeigeChatDrawer(true)}
                  className="w-full bg-primary-container/10 border border-primary-container/20 rounded-xl p-3 flex items-center justify-between text-on-surface hover:bg-primary-container/15 transition-all active:scale-[0.98] cursor-pointer shadow-sm animate-pulse-slow md:hidden"
                >
                  <div className="flex items-center gap-2.5">
                    <MessageCircle className="text-primary-fixed-dim" size={18} />
                    <div className="text-left">
                      <p className="text-xs font-bold text-primary-fixed-dim">{t('openLeagueChat')}</p>
                      <p className="text-[9px] font-mono text-on-surface-variant/70 uppercase tracking-wider">{t('openLeagueChatDesc')}</p>
                    </div>
                  </div>
                  <span className="text-xs text-primary-fixed-dim font-mono flex items-center gap-0.5">{t('showArrow')}</span>
                </button>
              </div>

              {/* Right Column: Chat (Desktop only) */}
              <div className="hidden md:flex md:col-span-4 flex-col bg-surface-container-low border border-surface-container-high rounded-xl p-4 h-[580px] sticky top-4 text-left">
                <div className="pb-3 border-b border-surface-container-high">
                  <h2 className="text-sm font-bold text-on-surface">{t('leagueChatTitle')}</h2>
                  <p className="text-[9px] font-mono text-on-surface-variant uppercase tracking-wider">{aktiveLiga.name}</p>
                </div>
                <div className="flex-1 min-h-0 mt-3">
                  <LeagueChat leagueId={aktiveLiga.id} />
                </div>
              </div>

              {/* Sliding Chat Bottom Sheet Drawer (mobile only) */}
              {zeigeChatDrawer && (
                <div className="fixed inset-0 z-50 flex flex-col justify-end md:hidden">
                  {/* Backdrop mit Blur */}
                  <div 
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 animate-fade-in"
                    onClick={() => setZeigeChatDrawer(false)}
                  />
                  
                  {/* Drawer Panel */}
                  <div className="relative w-full max-w-lg mx-auto bg-surface-container-low border-t border-surface-container-high rounded-t-2xl shadow-2xl flex flex-col h-[80vh] animate-drawer-slide-up pb-safe">
                    {/* Drag Handle */}
                    <div className="w-12 h-1 bg-surface-container-highest rounded-full mx-auto my-3" />
                    
                    {/* Drawer Header */}
                    <div className="px-4 pb-3 border-b border-surface-container-high flex items-center justify-between">
                      <div>
                        <h2 className="text-sm font-bold text-on-surface">{t('leagueChatTitle')}</h2>
                        <p className="text-[9px] font-mono text-on-surface-variant uppercase tracking-wider">{aktiveLiga.name}</p>
                      </div>
                      <button 
                        onClick={() => setZeigeChatDrawer(false)}
                        className="p-1.5 rounded-full bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant transition-colors"
                      >
                        <X size={15} />
                      </button>
                    </div>
                    
                    {/* Chat Container */}
                    <div className="flex-1 min-h-0 overflow-y-auto">
                      <LeagueChat leagueId={aktiveLiga.id} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ─── Turniere Verwalten Modal ─── */}
      <AnimatePresence>
        {zeigeTurnierModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setZeigeTurnierModal(false)} />
            <motion.div 
              initial={{opacity:0, scale: 0.9, y: 20}} 
              animate={{opacity:1, scale: 1, y: 0}} 
              exit={{opacity:0, scale: 0.9, y: 20}}
              className="bg-surface-container-low border border-surface-container-high rounded-2xl p-6 w-full max-w-sm relative z-10 shadow-2xl"
            >
              <h3 className="text-lg font-bold text-on-surface mb-1">{t('manageTournaments')}</h3>
              <p className="text-xs text-on-surface-variant mb-6">{t('activeTournamentsInfo')}</p>
              
              <div className="grid grid-cols-2 gap-3 mb-6">
                <motion.div
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => {
                    if (editTurniere.includes('Süper Lig')) setEditTurniere(editTurniere.filter(t => t !== 'Süper Lig'))
                    else setEditTurniere([...editTurniere, 'Süper Lig'])
                  }}
                  className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-colors relative overflow-hidden ${editTurniere.includes('Süper Lig') ? 'border-primary bg-primary/10' : 'border-surface-container-high bg-surface-container-lowest hover:border-surface-variant'}`}
                >
                  {editTurniere.includes('Süper Lig') && <div className="absolute top-2 right-2 w-4 h-4 bg-primary rounded-full flex items-center justify-center text-on-primary"><Check size={10} strokeWidth={4} /></div>}
                  <img src={`${import.meta.env.BASE_URL}logos/Süper_Lig.png`} alt="SL" className="w-10 h-10 object-contain drop-shadow-[0_0_8px_rgba(255,255,255,0.6)] brightness-110 mb-3" />
                  <span className={`text-xs font-bold ${editTurniere.includes('Süper Lig') ? 'text-primary' : 'text-on-surface'}`}>Süper Lig</span>
                </motion.div>
                
                <motion.div
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => {
                    if (editTurniere.includes('Champions League')) setEditTurniere(editTurniere.filter(t => t !== 'Champions League'))
                    else setEditTurniere([...editTurniere, 'Champions League'])
                  }}
                  className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-colors relative overflow-hidden ${editTurniere.includes('Champions League') ? 'border-primary bg-primary/10' : 'border-surface-container-high bg-surface-container-lowest hover:border-surface-variant'}`}
                >
                  {editTurniere.includes('Champions League') && <div className="absolute top-2 right-2 w-4 h-4 bg-primary rounded-full flex items-center justify-center text-on-primary"><Check size={10} strokeWidth={4} /></div>}
                  <img src={`${import.meta.env.BASE_URL}logos/UEFA_Champions_League_logo.png`} alt="CL" className="w-10 h-10 object-contain drop-shadow-[0_0_8px_rgba(255,255,255,0.6)] brightness-110 mb-3" />
                  <span className={`text-xs font-bold text-center ${editTurniere.includes('Champions League') ? 'text-primary' : 'text-on-surface'}`}>Champions League</span>
                </motion.div>
              </div>
              
              <div className="flex gap-2">
                <button onClick={() => setZeigeTurnierModal(false)} className="flex-1 py-3 rounded-xl font-mono text-xs font-bold uppercase tracking-wider text-on-surface bg-surface-container hover:bg-surface-container-high transition-colors">{t('cancel')}</button>
                <button onClick={handleTurniereSpeichern} disabled={editTurniere.length === 0} className="flex-1 py-3 rounded-xl font-mono text-xs font-bold uppercase tracking-wider text-on-primary-container bg-primary-container hover:opacity-90 transition-colors disabled:opacity-50">{t('save')}</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── Liga-Auswahl-Screen ─── */}
      {meineLigen.length > 0 && !aktiveLiga && !isLaden && (
        <div className="px-4 md:px-6 lg:px-8 pt-6 md:pt-8 max-w-3xl mx-auto w-full animate-page-enter">

          <div className="space-y-2 mb-4">
            {meineLigen.map(liga => {
              const meta = ligaMeta[liga.id]
              return (
                <button key={liga.id} onClick={() => setAktiveLiga(liga)}
                  className="w-full card-lift bg-surface-container-low border border-surface-container-high rounded-lg p-4 text-left group">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-on-surface">{liga.name}</span>
                    <span className="text-[10px] font-mono text-on-surface-variant/50 uppercase tracking-wider">#{meta?.rang || '–'}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <Users size={12} className="text-on-surface-variant/40" />
                      <span className="text-[10px] font-mono text-on-surface-variant/60">{meta?.mitglieder || 0} {t('members')}</span>
                    </div>
                    <span className="text-[10px] font-mono text-primary-fixed-dim opacity-0 group-hover:opacity-100 transition-opacity">{t('showArrow')}</span>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Aktionen */}
          <div className="space-y-2">
            <div className="bg-surface-container-low border border-surface-container-high rounded-lg p-4 space-y-3">
              <span className="text-sm text-on-surface font-medium">{t('joinLeagueTitle')}</span>
              <div className="flex gap-2">
                <input value={beitrittsCode} onChange={e => setBeitrittsCode(e.target.value)} placeholder={t('inviteCodeLabel')}
                  className="flex-1 bg-surface-container-lowest border border-surface-container-high rounded-lg px-3 py-2 font-mono text-sm text-on-surface uppercase focus:border-primary focus:outline-none" />
                <button onClick={handleBeitreten} disabled={!beitrittsCode.trim()}
                  className="bg-primary-container text-on-primary-container px-3 py-2 rounded-lg font-mono text-xs font-bold uppercase tracking-wider hover:opacity-90 disabled:opacity-30"><LogIn size={16} /></button>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {!zeigeErstellen ? (
                <motion.button 
                   key="btn"
                  initial={{opacity:0, y:-10}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-10}}
                  onClick={() => setZeigeErstellen(true)}
                  className="w-full bg-surface-container-low border border-surface-container-high rounded-xl p-4 flex items-center justify-center gap-3 hover:bg-surface-container transition-colors text-on-surface text-sm font-medium shadow-sm"
                >
                  <div className="bg-primary/20 p-1.5 rounded-full"><Plus size={16} className="text-primary" /></div>
                  {t('createLeagueTitle')}
                </motion.button>
              ) : (
                <motion.div 
                  key="form"
                  initial={{opacity:0, height:0}} animate={{opacity:1, height:'auto'}} exit={{opacity:0, height:0}}
                  className="bg-surface-container-low border border-surface-container-high rounded-xl p-5 space-y-5 shadow-lg overflow-hidden"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-base text-on-surface font-bold block">{t('createLeagueTitle')}</span>
                      <span className="text-xs text-on-surface-variant">{t('newLeagueDesc')}</span>
                    </div>
                    <button onClick={() => setZeigeErstellen(false)} className="text-on-surface-variant hover:text-on-surface bg-surface-container p-1.5 rounded-full"><X size={16} /></button>
                  </div>
                  
                  <div>
                    <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2 block">{t('leagueName')}</label>
                    <input value={neueLigaName} onChange={e => setNeueLigaName(e.target.value)} placeholder={t('leagueNamePlaceholder')}
                      className="w-full bg-surface-container-lowest border-2 border-surface-container-high rounded-xl px-4 py-3 text-sm text-on-surface focus:border-primary focus:outline-none transition-colors" autoFocus />
                  </div>
                  
                  <div>
                    <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2 block">{t('includedTournaments')}</label>
                    <div className="grid grid-cols-2 gap-3">
                      <motion.div
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          if (neueLigaTurniere.includes('Süper Lig')) setNeueLigaTurniere(neueLigaTurniere.filter(t => t !== 'Süper Lig'))
                          else setNeueLigaTurniere([...neueLigaTurniere, 'Süper Lig'])
                        }}
                        className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 cursor-pointer transition-colors relative overflow-hidden ${neueLigaTurniere.includes('Süper Lig') ? 'border-primary bg-primary/10' : 'border-surface-container-high bg-surface-container-lowest hover:border-surface-variant'}`}
                      >
                        {neueLigaTurniere.includes('Süper Lig') && <div className="absolute top-2 right-2 w-4 h-4 bg-primary rounded-full flex items-center justify-center text-on-primary"><Check size={10} strokeWidth={4} /></div>}
                        <img src={`${import.meta.env.BASE_URL}logos/Süper_Lig.png`} alt="SL" className="w-8 h-8 object-contain drop-shadow-[0_0_8px_rgba(255,255,255,0.6)] brightness-110 mb-2" />
                        <span className={`text-xs font-bold ${neueLigaTurniere.includes('Süper Lig') ? 'text-primary' : 'text-on-surface'}`}>Süper Lig</span>
                      </motion.div>
                      
                      <motion.div
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          if (neueLigaTurniere.includes('Champions League')) setNeueLigaTurniere(neueLigaTurniere.filter(t => t !== 'Champions League'))
                          else setNeueLigaTurniere([...neueLigaTurniere, 'Champions League'])
                        }}
                        className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 cursor-pointer transition-colors relative overflow-hidden ${neueLigaTurniere.includes('Champions League') ? 'border-primary bg-primary/10' : 'border-surface-container-high bg-surface-container-lowest hover:border-surface-variant'}`}
                      >
                        {neueLigaTurniere.includes('Champions League') && <div className="absolute top-2 right-2 w-4 h-4 bg-primary rounded-full flex items-center justify-center text-on-primary"><Check size={10} strokeWidth={4} /></div>}
                        <img src={`${import.meta.env.BASE_URL}logos/UEFA_Champions_League_logo.png`} alt="CL" className="w-8 h-8 object-contain drop-shadow-[0_0_8px_rgba(255,255,255,0.6)] brightness-110 mb-2" />
                        <span className={`text-xs font-bold text-center ${neueLigaTurniere.includes('Champions League') ? 'text-primary' : 'text-on-surface'}`}>Champions League</span>
                      </motion.div>
                    </div>
                  </div>
                  
                  <button onClick={handleLigaErstellen} disabled={!neueLigaName.trim() || neueLigaTurniere.length === 0}
                    className="bg-primary-container text-on-primary-container w-full py-3.5 rounded-xl font-mono text-sm font-bold uppercase tracking-wider shadow hover:opacity-90 transition-opacity disabled:opacity-30 disabled:shadow-none mt-2">{t('createLeagueBtn')}</button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Keine Liga */}
      {meineLigen.length === 0 && !isLaden && (
        <div className="px-4 md:px-6 lg:px-8 pt-8 max-w-3xl mx-auto w-full animate-page-enter">
          <div className="bg-surface-container-low border border-surface-container-high rounded-xl p-8 text-center mb-6">
            <div className="w-16 h-16 rounded-full bg-surface-container-high flex items-center justify-center mx-auto mb-4">
              <Users size={28} className="text-on-surface-variant/40" />
            </div>
            <p className="text-on-surface text-base font-bold mb-1">{t('noLeaguesTitle')}</p>
            <p className="text-on-surface-variant text-xs mb-2 max-w-[240px] mx-auto">
              {t('noLeaguesDesc')}
            </p>
          </div>

          {/* Clean full-width actions */}
          <div className="space-y-4">
            {/* Join card */}
            <div className="bg-surface-container-low border border-surface-container-high rounded-lg p-4 space-y-3">
              <span className="text-sm text-on-surface font-medium">{t('joinLeagueTitle')}</span>
              <div className="flex gap-2">
                <input
                  value={beitrittsCode}
                  onChange={e => setBeitrittsCode(e.target.value)}
                  placeholder={t('inviteCodeLabel')}
                  className="flex-1 bg-surface-container-lowest border border-surface-container-high rounded-lg px-3 py-2 font-mono text-sm text-on-surface uppercase focus:border-primary focus:outline-none"
                />
                <button
                  onClick={handleBeitreten}
                  disabled={!beitrittsCode.trim()}
                  className="bg-primary-container text-on-primary-container px-4 py-2 rounded-lg font-mono text-xs font-bold uppercase tracking-wider hover:opacity-90 disabled:opacity-30 flex items-center justify-center"
                >
                  <LogIn size={16} />
                </button>
              </div>
            </div>

            {/* Create card */}
            {!zeigeErstellen ? (
              <button
                onClick={() => setZeigeErstellen(true)}
                className="w-full bg-surface-container-low border border-surface-container-high rounded-lg p-4 flex items-center gap-3 hover:bg-surface-container transition-colors text-on-surface text-sm font-medium"
              >
                <Plus size={18} className="text-primary-fixed-dim" /> {t('createLeagueTitle')}
              </button>
            ) : (
              <div className="bg-surface-container-low border border-surface-container-high rounded-lg p-4 space-y-3 animate-page-enter">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-on-surface font-medium">{t('createLeagueTitle')}</span>
                  <button onClick={() => setZeigeErstellen(false)} className="text-on-surface-variant">
                    <X size={16} />
                  </button>
                </div>
                <input
                  value={neueLigaName}
                  onChange={e => setNeueLigaName(e.target.value)}
                  placeholder={t('leagueName')}
                  className="w-full bg-surface-container-lowest border border-surface-container-high rounded-lg px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none"
                  autoFocus
                />
                <div className="space-y-3 py-2">
                  <span className="text-xs text-on-surface-variant font-bold uppercase tracking-wider">{t('chooseTournaments')}</span>
                  <div className="grid grid-cols-2 gap-3">
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        if (neueLigaTurniere.includes('Süper Lig')) setNeueLigaTurniere(neueLigaTurniere.filter(t => t !== 'Süper Lig'))
                        else setNeueLigaTurniere([...neueLigaTurniere, 'Süper Lig'])
                      }}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 cursor-pointer transition-colors relative overflow-hidden ${neueLigaTurniere.includes('Süper Lig') ? 'border-primary bg-primary/10' : 'border-surface-container-high bg-surface-container-lowest hover:border-surface-variant'}`}
                    >
                      {neueLigaTurniere.includes('Süper Lig') && <div className="absolute top-2 right-2 w-4 h-4 bg-primary rounded-full flex items-center justify-center text-on-primary"><Check size={10} strokeWidth={4} /></div>}
                      <img src={`${import.meta.env.BASE_URL}logos/Süper_Lig.png`} alt="SL" className="w-8 h-8 object-contain drop-shadow-[0_0_8px_rgba(255,255,255,0.6)] brightness-110 mb-2" />
                      <span className={`text-xs font-bold ${neueLigaTurniere.includes('Süper Lig') ? 'text-primary' : 'text-on-surface'}`}>Süper Lig</span>
                    </motion.div>
                    
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        if (neueLigaTurniere.includes('Champions League')) setNeueLigaTurniere(neueLigaTurniere.filter(t => t !== 'Champions League'))
                        else setNeueLigaTurniere([...neueLigaTurniere, 'Champions League'])
                      }}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 cursor-pointer transition-colors relative overflow-hidden ${neueLigaTurniere.includes('Champions League') ? 'border-primary bg-primary/10' : 'border-surface-container-high bg-surface-container-lowest hover:border-surface-variant'}`}
                    >
                      {neueLigaTurniere.includes('Champions League') && <div className="absolute top-2 right-2 w-4 h-4 bg-primary rounded-full flex items-center justify-center text-on-primary"><Check size={10} strokeWidth={4} /></div>}
                      <img src={`${import.meta.env.BASE_URL}logos/UEFA_Champions_League_logo.png`} alt="CL" className="w-8 h-8 object-contain drop-shadow-[0_0_8px_rgba(255,255,255,0.6)] brightness-110 mb-2" />
                      <span className={`text-xs font-bold text-center ${neueLigaTurniere.includes('Champions League') ? 'text-primary' : 'text-on-surface'}`}>Champions League</span>
                    </motion.div>
                  </div>
                </div>
                <button
                  onClick={handleLigaErstellen}
                  disabled={!neueLigaName.trim() || neueLigaTurniere.length === 0}
                  className="bg-primary-container text-on-primary-container w-full py-2.5 rounded-lg font-mono text-xs font-bold uppercase tracking-wider hover:opacity-90 disabled:opacity-30"
                >
                  {t('createLeagueBtn')}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

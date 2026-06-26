import { useEffect, useState, useMemo, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { BarChart2, Award, X, Swords, Target } from 'lucide-react'
import { calculateLevelDetails, getLevelBadgeStyle } from '../lib/utils'
import { LevelBadge } from './ui/LevelBadge'
import { evaluateAchievements, type TipDetails } from '../utils/achievementEvaluator'
import { AvatarLightbox } from './AvatarLightbox'
import { useTranslation } from '../utils/translations'
import { useAuthStore } from '../stores/authStore'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

interface Profil {
  id: string
  username: string
  avatar_url: string | null
  gesamt_punkte: number
  exakte_treffer: number
  is_admin?: boolean
}

interface TippMitMatch {
  id: string
  tipp_heim: number
  tipp_gast: number
  punkte: number
  match: {
    id: string
    heim_team: string
    gast_team: string
    tore_heim: number | null
    tore_gast: number | null
    status: string
    spieltag: number
  }
}

function PunkteFarbe(p: number): string {
  if (p === 4) return 'text-green-400'
  if (p === 3) return 'text-amber-400'
  if (p === 2) return 'text-blue-400'
  return 'text-slate-500'
}

interface RivalInspectorProps {
  userId: string
  onClose?: () => void
}

function CompareBar({ label, myVal, rivalVal }: { label: string, myVal: number, rivalVal: number }) {
  const total = myVal + rivalVal
  // Wenn beide 0 sind, setzen wir den Balken auf 50/50
  const myPct = total > 0 ? (myVal / total) * 100 : 50
  
  let myColor = 'text-on-surface'
  let rivalColor = 'text-on-surface'
  let barMyColor = 'bg-primary'
  let barRivalColor = 'bg-red-500'

  if (myVal > rivalVal) {
    myColor = 'text-primary font-bold'
    barMyColor = 'bg-primary shadow-[0_0_8px_rgba(251,191,36,0.6)] z-10'
    barRivalColor = 'bg-red-500/50'
  } else if (rivalVal > myVal) {
    rivalColor = 'text-red-400 font-bold'
    barRivalColor = 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)] z-10'
    barMyColor = 'bg-primary/50'
  }

  return (
    <div className="space-y-1.5 mt-3">
      <div className="flex justify-between items-center text-[10px] font-mono">
        <span className={myColor}>{Number.isInteger(myVal) ? myVal : myVal.toFixed(2)}</span>
        <span className="text-on-surface-variant uppercase tracking-wider">{label}</span>
        <span className={rivalColor}>{Number.isInteger(rivalVal) ? rivalVal : rivalVal.toFixed(2)}</span>
      </div>
      <div className="h-2 w-full bg-surface-container-highest rounded-full overflow-hidden flex">
        <div className={`h-full transition-all duration-1000 relative ${barMyColor}`} style={{ width: `${myPct}%` }} />
        <div className={`h-full transition-all duration-1000 relative ${barRivalColor}`} style={{ width: `${100 - myPct}%` }} />
      </div>
    </div>
  )
}

export function RivalInspector({ userId, onClose }: RivalInspectorProps) {
  const { t } = useTranslation()
  const { user: me } = useAuthStore()
  
  const isH2H = me?.id && me.id !== userId

  const [profil, setProfil] = useState<Profil | null>(null)
  const [tipps, setTipps] = useState<TippMitMatch[]>([])
  const [myProfil, setMyProfil] = useState<Profil | null>(null)
  const [myTipps, setMyTipps] = useState<TippMitMatch[]>([])
  
  const [isLaden, setIsLaden] = useState(true)
  const [barsVisible, setBarsVisible] = useState(false)

  const lade = useCallback(async () => {
    if (!userId) return
    setIsLaden(true)
    try {
      const promises = [
        supabase.from('profiles').select('*').eq('id', userId).single(),
        supabase.from('tips').select('id,tipp_heim,tipp_gast,punkte,match:matches(id,heim_team,gast_team,tore_heim,tore_gast,status,spieltag)').eq('user_id', userId).order('created_at', { ascending: false })
      ]
      
      if (isH2H) {
        promises.push(supabase.from('profiles').select('*').eq('id', me.id).single())
        promises.push(supabase.from('tips').select('id,tipp_heim,tipp_gast,punkte,match:matches(id,heim_team,gast_team,tore_heim,tore_gast,status,spieltag)').eq('user_id', me.id).order('created_at', { ascending: false }))
      }

      const results = await Promise.all(promises)
      const p = results[0].data
      const t = results[1].data
      
      if (p) setProfil(p as Profil)
      if (t) setTipps(t as unknown as TippMitMatch[])

      if (isH2H && results.length === 4) {
        if (results[2].data) setMyProfil(results[2].data as Profil)
        if (results[3].data) setMyTipps(results[3].data as unknown as TippMitMatch[])
      }
    } catch (e) {
      console.error('Fehler beim Laden im RivalInspector:', e)
    } finally {
      setIsLaden(false)
    }
  }, [userId, me?.id, isH2H])

  useEffect(() => {
    lade()
  }, [lade])

  useEffect(() => {
    setBarsVisible(false)
    const t = setTimeout(() => setBarsVisible(true), 150)
    return () => clearTimeout(t)
  }, [userId])

  const computeUserStats = (p: Profil, tArr: TippMitMatch[]) => {
    const finishedTips = tArr.filter(t => t.match?.status === 'finished')
    const totalFinished = finishedTips.length
    const totalPoints = p.gesamt_punkte || 0
    const avgPoints = totalFinished > 0 ? (totalPoints / totalFinished).toFixed(2) : '0.00'

    const formattedTips = tArr.map(t => ({
      id: t.id,
      tipp_heim: t.tipp_heim,
      tipp_gast: t.tipp_gast,
      punkte: t.punkte,
      created_at: '',
      updated_at: '',
      match: {
        id: t.match?.id || '',
        spieltag: t.match?.spieltag || 1,
        status: t.match?.status || 'scheduled',
        heim_team: t.match?.heim_team || '',
        gast_team: t.match?.gast_team || '',
        anpfiff: '',
        tore_heim: t.match?.tore_heim ?? null,
        tore_gast: t.match?.tore_gast ?? null,
        tournament: ''
      }
    }))

    const unlockedSet = evaluateAchievements(
      formattedTips as unknown as TipDetails[],
      { gesamt_punkte: p.gesamt_punkte || 0, exakte_treffer: p.exakte_treffer || 0, is_admin: p.is_admin || false, rang: null, league_count: 0 },
      p.avatar_url, p.username
    )

    const achievementsCount = unlockedSet.size
    const lvlDetails = calculateLevelDetails(totalPoints, achievementsCount)

    const spieltagPunkte: Record<number, number> = {}
    tArr.forEach(t => {
      if (t.match?.status === 'finished' && t.match?.spieltag) {
        spieltagPunkte[t.match.spieltag] = (spieltagPunkte[t.match.spieltag] || 0) + t.punkte
      }
    })

    return { 
      totalTips: tArr.length, 
      totalFinished, 
      avgPoints: Number(avgPoints), 
      achievementsCount, 
      level: lvlDetails.level, 
      spieltagPunkte, 
      xpPct: lvlDetails.xpPct, 
      xpCurrent: lvlDetails.xpCurrent, 
      xpRequired: lvlDetails.xpRequired,
      exact: p.exakte_treffer || 0,
      total: totalPoints
    }
  }

  const rivalStats = useMemo(() => {
    if (!profil || !tipps) return null
    return computeUserStats(profil, tipps)
  }, [profil, tipps])

  const myStats = useMemo(() => {
    if (!myProfil || !myTipps) return null
    return computeUserStats(myProfil, myTipps)
  }, [myProfil, myTipps])

  const duels = useMemo(() => {
    if (!isH2H || !myTipps.length || !tipps.length) return null
    let myWins = 0
    let rivalWins = 0
    let draws = 0
    let totalCommon = 0

    const myTippsMap = new Map(myTipps.map(t => [t.match.id, t]))
    const commonHistory: any[] = []

    tipps.forEach(rivalTip => {
      if (rivalTip.match?.status === 'finished') {
        const myTip = myTippsMap.get(rivalTip.match.id)
        if (myTip) {
          totalCommon++
          if (myTip.punkte > rivalTip.punkte) myWins++
          else if (rivalTip.punkte > myTip.punkte) rivalWins++
          else draws++
          
          commonHistory.push({
            match: rivalTip.match,
            myTip,
            rivalTip,
            diff: myTip.punkte - rivalTip.punkte
          })
        }
      }
    })

    commonHistory.sort((a, b) => b.match.spieltag - a.match.spieltag)

    return { myWins, rivalWins, draws, totalCommon, commonHistory }
  }, [isH2H, myTipps, tipps])

  const chartData = useMemo(() => {
    if (!isH2H || !myStats || !rivalStats) return []
    const allSt = new Set([...Object.keys(myStats.spieltagPunkte), ...Object.keys(rivalStats.spieltagPunkte)])
    const maxSt = Math.max(0, ...Array.from(allSt).map(Number))
    
    const data = [{ name: 'Start', myTotal: 0, rivalTotal: 0, myST: 0, rivalST: 0 }]
    let myC = 0
    let rivalC = 0

    for (let i = 1; i <= maxSt; i++) {
      myC += (myStats.spieltagPunkte[i] || 0)
      rivalC += (rivalStats.spieltagPunkte[i] || 0)
      data.push({
        name: `${i}. ST`,
        myTotal: myC,
        rivalTotal: rivalC,
        myST: myStats.spieltagPunkte[i] || 0,
        rivalST: rivalStats.spieltagPunkte[i] || 0
      })
    }
    return data
  }, [isH2H, myStats, rivalStats])

  const letzte = rivalStats ? Object.keys(rivalStats.spieltagPunkte).map(Number).sort((a, b) => b - a).slice(0, 6).reverse() : []
  const maxP = rivalStats ? Math.max(...Object.values(rivalStats.spieltagPunkte), 1) : 1

  if (isLaden) return (
    <div className="flex flex-col items-center justify-center h-full min-h-[300px] bg-surface-container-low border border-surface-container-high rounded-xl">
      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!profil) return (
    <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center p-6 bg-surface-container-low border border-surface-container-high rounded-xl">
      <p className="text-on-surface-variant/40 text-sm font-mono">{t('profileNotFound')}</p>
    </div>
  )

  const H2HTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      if (data.name === 'Start') return null
      return (
        <div className="bg-[#1E1E1E]/90 backdrop-blur border border-white/10 p-2.5 rounded-xl shadow-xl min-w-[140px]">
          <p className="text-[10px] font-bold text-on-surface mb-2 uppercase tracking-wider text-center">{data.name}</p>
          <div className="flex justify-between items-center mb-1">
            <span className="text-[9px] text-primary font-mono uppercase truncate max-w-[50px]">{myProfil?.username}</span>
            <span className="text-xs font-black text-primary">{data.myTotal}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[9px] text-red-400 font-mono uppercase truncate max-w-[50px]">{profil?.username}</span>
            <span className="text-xs font-black text-red-400">{data.rivalTotal}</span>
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <div className="bg-surface-container-low border border-surface-container-high rounded-xl overflow-hidden flex flex-col h-full shadow-lg max-h-[85vh] lg:max-h-[calc(100vh-130px)]">
      
      {/* ─── Header: VS Mode oder Single Mode ─── */}
      <div className="bg-surface-container border-b border-surface-container-high p-4 relative">
        {isH2H && myProfil ? (
          <div className="flex items-center justify-between">
            {/* Ich */}
            <div className="flex flex-col items-center gap-1 w-[40%]">
              <AvatarLightbox src={myProfil.avatar_url} username={myProfil.username} size="md" />
              <span className="text-[10px] font-mono font-bold text-primary uppercase tracking-wider truncate w-full text-center">{myProfil.username}</span>
            </div>
            {/* VS */}
            <div className="flex flex-col items-center justify-center shrink-0">
              <Swords size={24} className="text-on-surface-variant/40 mb-1" />
              <span className="text-[9px] font-black italic text-on-surface-variant uppercase tracking-widest">VS</span>
            </div>
            {/* Rivale */}
            <div className="flex flex-col items-center gap-1 w-[40%]">
              <AvatarLightbox src={profil.avatar_url} username={profil.username} size="md" />
              <span className="text-[10px] font-mono font-bold text-red-400 uppercase tracking-wider truncate w-full text-center">{profil.username}</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <AvatarLightbox src={profil.avatar_url} username={profil.username} size="md" />
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-xs font-mono font-bold text-white uppercase tracking-wider">{profil.username}</h2>
                {profil.is_admin && (
                  <span className="inline-flex px-1.5 py-0.5 rounded text-[7px] font-black bg-amber-500/20 text-amber-400 border border-amber-500/30 font-mono tracking-wide scale-90">ADMIN</span>
                )}
              </div>
              <div className="flex gap-2.5 mt-0.5">
                <span className="text-[9px] text-primary font-mono font-bold">{profil.gesamt_punkte} Pkt</span>
                <span className="text-[9px] text-on-surface-variant/65 font-mono">🎯 {profil.exakte_treffer} exakt</span>
              </div>
            </div>
          </div>
        )}

        {onClose && (
          <button onClick={onClose} className="absolute top-2 right-2 text-on-surface-variant hover:text-on-surface p-1 rounded-lg hover:bg-white/5 transition-colors">
            <X size={15} />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        
        {/* ─── VS Bars (Nur in H2H) ─── */}
        {isH2H && myStats && rivalStats && (
          <div className="bg-surface-container-lowest/60 border border-white/5 rounded-xl p-4">
            <div className="text-[9px] font-mono text-on-surface-variant uppercase tracking-widest text-center mb-3">Head to Head Stats</div>
            <CompareBar label="Punkte" myVal={myStats.total} rivalVal={rivalStats.total} />
            <CompareBar label="Exakte Treffer" myVal={myStats.exact} rivalVal={rivalStats.exact} />
            <CompareBar label="Punkte / Spiel" myVal={myStats.avgPoints} rivalVal={rivalStats.avgPoints} />
            <CompareBar label="Level" myVal={myStats.level} rivalVal={rivalStats.level} />
          </div>
        )}

        {/* ─── H2H Chart (Nur in H2H) ─── */}
        {isH2H && chartData.length > 1 && (
          <div className="space-y-2">
            <div className="flex items-center gap-1 text-[9px] font-mono text-on-surface-variant uppercase tracking-wider">
              <BarChart2 size={11} className="text-primary" /> Verlauf Duell
            </div>
            <div className="bg-surface-container-lowest/40 border border-white/5 rounded-xl p-3 h-40">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="name" stroke="rgba(255,255,255,0.2)" fontSize={9} tickFormatter={(val) => val === 'Start' ? '' : val.replace('. ST', '')} axisLine={false} tickLine={false} />
                  <YAxis stroke="rgba(255,255,255,0.2)" fontSize={9} allowDecimals={false} axisLine={false} tickLine={false} />
                  <Tooltip content={<H2HTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 2 }} />
                  <Line type="monotone" dataKey="myTotal" stroke="#fbbf24" strokeWidth={2.5} dot={false} activeDot={{ r: 4, fill: '#fbbf24' }} animationDuration={1500} />
                  <Line type="monotone" dataKey="rivalTotal" stroke="#f87171" strokeWidth={2.5} dot={false} activeDot={{ r: 4, fill: '#f87171' }} animationDuration={1500} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* ─── Direktes Duell (Nur in H2H) ─── */}
        {isH2H && duels && duels.totalCommon > 0 && (
          <div className="bg-surface-container-lowest/60 border border-white/5 rounded-xl p-4 text-center">
            <div className="text-[9px] font-mono text-on-surface-variant uppercase tracking-widest mb-3">Direktes Duell (Gleiche Spiele)</div>
            <div className="flex justify-center items-center gap-4">
              <div className="flex flex-col items-center">
                <span className="text-xs font-black text-primary">{duels.myWins}</span>
                <span className="text-[8px] font-mono text-primary/70 uppercase">Siege</span>
              </div>
              <div className="text-xl font-black text-on-surface-variant/30">-</div>
              <div className="flex flex-col items-center">
                <span className="text-xs font-black text-on-surface">{duels.draws}</span>
                <span className="text-[8px] font-mono text-on-surface-variant uppercase">Remis</span>
              </div>
              <div className="text-xl font-black text-on-surface-variant/30">-</div>
              <div className="flex flex-col items-center">
                <span className="text-xs font-black text-red-400">{duels.rivalWins}</span>
                <span className="text-[8px] font-mono text-red-400/70 uppercase">Siege</span>
              </div>
            </div>
          </div>
        )}

        {/* ─── Single Mode: Generelle Statistiken & Level (Fallback) ─── */}
        {!isH2H && rivalStats && (
          <div className="space-y-3">
            <div className={`bg-surface-container-lowest/70 border border-surface-container-high/60 rounded-xl p-3 flex flex-col gap-2 relative overflow-hidden ${
              rivalStats.level >= 30 ? 'border-cyan-500/25 bg-gradient-to-r from-purple-950/10 via-surface-container-lowest/70 to-cyan-950/10 shadow-[0_0_15px_rgba(6,182,212,0.1)]' : ''
            }`}>
              {rivalStats.level >= 30 && (
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(6,182,212,0.06),transparent)] pointer-events-none" />
              )}
              <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-2">
                  <LevelBadge level={rivalStats.level} className="w-7 h-7 rounded-full text-[10px] font-bold shadow">{rivalStats.level}</LevelBadge>
                  <div className="text-left">
                    <div className={`text-[10px] font-mono font-bold uppercase tracking-wider ${
                      rivalStats.level >= 30 ? 'text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.4)]' : 'text-on-surface'
                    }`}>Level {rivalStats.level}</div>
                    <div className="text-[7px] font-mono text-on-surface-variant">{t('xpDesc')}</div>
                  </div>
                </div>
                <span className={`text-[10px] font-mono font-bold ${rivalStats.level >= 30 ? 'text-cyan-400' : 'text-primary'}`}>{rivalStats.xpCurrent} / {rivalStats.xpRequired} XP</span>
              </div>
              <div className="h-1.5 w-full bg-surface-container rounded-full overflow-hidden p-[1px] border border-white/5 relative z-10">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    rivalStats.level >= 30 
                      ? 'bg-gradient-to-r from-cyan-400 via-white to-purple-500 animate-pulse shadow-[0_0_8px_rgba(6,182,212,0.6)]' 
                      : 'bg-primary'
                  }`} 
                  style={{ width: `${rivalStats.xpPct}%` }} 
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-surface-container-lowest/50 border border-white/5 rounded-xl p-2.5 text-center">
                <div className="text-[7px] font-mono text-on-surface-variant/70 uppercase tracking-wider mb-0.5">{t('totalTips')}</div>
                <div className="font-mono text-xs font-black text-on-surface">{rivalStats.totalTips}</div>
              </div>
              <div className="bg-surface-container-lowest/50 border border-white/5 rounded-xl p-2.5 text-center">
                <div className="text-[7px] font-mono text-on-surface-variant/70 uppercase tracking-wider mb-0.5">{t('avgPointsPerMatchday')}</div>
                <div className="font-mono text-xs font-black text-on-surface">{rivalStats.avgPoints}</div>
              </div>
            </div>
          </div>
        )}

        {/* ─── Single Mode: Formkurve ─── */}
        {!isH2H && letzte.length > 0 && rivalStats && (
          <div className="space-y-2">
            <div className="flex items-center gap-1 text-[9px] font-mono text-on-surface-variant uppercase tracking-wider">
              <BarChart2 size={11} className="text-primary" /> {t('formCurve')}
            </div>
            <div className="bg-surface-container-lowest/40 border border-white/5 rounded-xl p-3 flex items-end gap-2 h-20 pt-5">
              {letzte.map((st, i) => {
                const p = rivalStats.spieltagPunkte[st] || 0
                const heightPct = barsVisible ? (p / maxP) * 100 : 0
                const barColor = p >= 20 ? 'bg-emerald-500' : p >= 12 ? 'bg-amber-500' : p >= 5 ? 'bg-blue-500' : 'bg-surface-container-highest'
                return (
                  <div key={st} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                    <span className="text-[7.5px] font-mono text-on-surface-variant transition-opacity duration-300" style={{ opacity: barsVisible ? 1 : 0 }}>{p}P</span>
                    <div className="w-full relative flex items-end h-9">
                      <div className={`w-full ${barColor} rounded-t-sm`} style={{ height: `${Math.max(heightPct, 8)}%`, transition: `height 0.6s cubic-bezier(0.34, 1.2, 0.64, 1)`, transitionDelay: `${i * 60}ms` }} />
                    </div>
                    <span className="text-[7px] font-mono text-on-surface-variant/40">{t('spieltagShort')}{st}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ─── Tipp-Historie (Gemeinsam oder Single) ─── */}
        <div className="space-y-2">
          <div className="flex items-center gap-1 text-[9px] font-mono text-on-surface-variant uppercase tracking-wider">
            <Award size={11} className="text-primary" /> {isH2H ? 'Gemeinsame Spiele' : t('tipHistory')}
          </div>
          <div className="space-y-2">
            {isH2H && duels ? (
              duels.commonHistory.slice(0, 15).map((d) => (
                <div key={d.match.id} className="bg-surface-container-lowest/60 border border-white/5 rounded-xl p-2.5 flex flex-col gap-2 text-xs font-mono">
                  <div className="flex justify-between items-center border-b border-white/5 pb-1.5">
                    <span className="text-on-surface font-medium text-[10px] uppercase truncate">{d.match.heim_team} - {d.match.gast_team}</span>
                    <span className="text-[8px] text-on-surface-variant/50">{t('endColon')} {d.match.tore_heim}:{d.match.tore_gast}</span>
                  </div>
                  <div className="flex justify-between items-center px-1">
                    <div className="flex flex-col">
                      <span className="text-[8px] text-primary/60 uppercase">Du</span>
                      <div className="flex items-center gap-1">
                        <span className="font-bold">{d.myTip.tipp_heim}:{d.myTip.tipp_gast}</span>
                        <span className={`text-[8px] font-bold ${PunkteFarbe(d.myTip.punkte)}`}>({d.myTip.punkte}P)</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-[8px] text-red-400/60 uppercase">Er</span>
                      <div className="flex items-center gap-1">
                        <span className={`text-[8px] font-bold ${PunkteFarbe(d.rivalTip.punkte)}`}>({d.rivalTip.punkte}P)</span>
                        <span className="font-bold">{d.rivalTip.tipp_heim}:{d.rivalTip.tipp_gast}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              tipps.filter(t => t.match?.status === 'finished').map((tip) => (
                <div key={tip.id} className="bg-surface-container-lowest/60 border border-white/5 rounded-xl p-2.5 flex items-center justify-between text-xs font-mono">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[8px] text-on-surface-variant/50 uppercase">{t('spieltagShort')} {tip.match.spieltag}</span>
                    <span className="text-on-surface font-medium max-w-[150px] truncate">{tip.match.heim_team} - {tip.match.gast_team}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="font-bold text-[10px] text-on-surface bg-surface-container px-1.5 py-0.5 rounded border border-white/5">{t('tipColon')} {tip.tipp_heim}:{tip.tipp_gast}</span>
                      <div className="text-[9px] text-on-surface-variant/40 mt-0.5">{t('endColon')} {tip.match.tore_heim}:{tip.match.tore_gast}</div>
                    </div>
                    <span className={`w-8 text-center font-bold text-[10px] ${PunkteFarbe(tip.punkte)} bg-surface-container px-1 py-0.5 rounded border border-white/5`}>
                      {tip.punkte > 0 ? `+${tip.punkte}P` : '0P'}
                    </span>
                  </div>
                </div>
              ))
            )}

            {tipps.filter(t => t.match?.status === 'finished').length === 0 && (
              <div className="text-center py-8 text-xs font-mono text-on-surface-variant/30">{t('noRivalTips')}</div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}

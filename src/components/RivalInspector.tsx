import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { ArrowLeft, Trophy, BarChart2, Award, X } from 'lucide-react'

interface Profil {
  id: string
  username: string
  avatar_url: string | null
  gesamt_punkte: number
  exakte_treffer: number
}

interface TippMitMatch {
  id: string
  tipp_heim: number
  tipp_gast: number
  punkte: number
  match: {
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

export function RivalInspector({ userId, onClose }: RivalInspectorProps) {
  const [profil, setProfil] = useState<Profil | null>(null)
  const [tipps, setTipps] = useState<TippMitMatch[]>([])
  const [isLaden, setIsLaden] = useState(true)
  const [barsVisible, setBarsVisible] = useState(false)

  useEffect(() => {
    if (!userId) return
    lade()
  }, [userId])

  useEffect(() => {
    setBarsVisible(false)
    const t = setTimeout(() => setBarsVisible(true), 150)
    return () => clearTimeout(t)
  }, [userId])

  async function lade() {
    setIsLaden(true)
    try {
      const [{ data: p }, { data: t }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).single(),
        supabase.from('tips').select('id,tipp_heim,tipp_gast,punkte,match:matches(heim_team,gast_team,tore_heim,tore_gast,status,spieltag)').eq('user_id', userId).order('created_at', { ascending: false }).limit(50)
      ])
      if (p) setProfil(p as Profil)
      if (t) setTipps(t as unknown as TippMitMatch[])
    } catch (e) {
      console.error('Fehler beim Laden im RivalInspector:', e)
    } finally {
      setIsLaden(false)
    }
  }

  const spieltagPunkte: Record<number, number> = {}
  tipps.forEach(t => {
    if (t.match?.status === 'finished' && t.match?.spieltag) {
      spieltagPunkte[t.match.spieltag] = (spieltagPunkte[t.match.spieltag] || 0) + t.punkte
    }
  })
  const letzte = Object.keys(spieltagPunkte).map(Number).sort((a, b) => b - a).slice(0, 6).reverse()
  const maxP = Math.max(...Object.values(spieltagPunkte), 1)

  if (isLaden) return (
    <div className="flex flex-col items-center justify-center h-full min-h-[300px] bg-surface-container-low border border-surface-container-high rounded-xl">
      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!profil) return (
    <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center p-6 bg-surface-container-low border border-surface-container-high rounded-xl">
      <p className="text-on-surface-variant/40 text-sm font-mono">Profil nicht gefunden.</p>
    </div>
  )

  return (
    <div className="bg-surface-container-low border border-surface-container-high rounded-xl overflow-hidden flex flex-col h-full shadow-lg max-h-[85vh] lg:max-h-[calc(100vh-130px)]">
      {/* Panel Header */}
      <div className="bg-surface-container border-b border-surface-container-high p-4 flex items-center justify-between relative">
        <div className="flex items-center gap-3">
          {profil.avatar_url ? (
            <img src={profil.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover border border-white/10 flex-shrink-0" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-surface-container-high border border-white/5 flex items-center justify-center flex-shrink-0">
              <span className="text-on-surface-variant font-bold text-base">{profil.username.slice(0, 1).toUpperCase()}</span>
            </div>
          )}
          <div>
            <h2 className="text-xs font-mono font-bold text-white uppercase tracking-wider">{profil.username}</h2>
            <div className="flex gap-2.5 mt-0.5">
              <span className="text-[9px] text-primary font-mono font-bold">{profil.gesamt_punkte} Pkt</span>
              <span className="text-[9px] text-on-surface-variant/65 font-mono">🎯 {profil.exakte_treffer} exakt</span>
            </div>
          </div>
        </div>

        {onClose && (
          <button 
            onClick={onClose}
            className="text-on-surface-variant hover:text-on-surface p-1 rounded-lg hover:bg-white/5 transition-colors"
          >
            <X size={15} />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Formkurve */}
        {letzte.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-1 text-[9px] font-mono text-on-surface-variant uppercase tracking-wider">
              <BarChart2 size={11} className="text-primary" /> Formkurve
            </div>
            <div className="bg-surface-container-lowest/40 border border-white/5 rounded-xl p-3 flex items-end gap-2 h-20 pt-5">
              {letzte.map((st, i) => {
                const p = spieltagPunkte[st] || 0
                const heightPct = barsVisible ? (p / maxP) * 100 : 0
                const barColor = p >= 20 ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]' : p >= 12 ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.3)]' : p >= 5 ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.3)]' : 'bg-surface-container-highest'
                return (
                  <div key={st} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                    <span className="text-[7.5px] font-mono text-on-surface-variant transition-opacity duration-300" style={{ opacity: barsVisible ? 1 : 0 }}>{p}P</span>
                    <div className="w-full relative flex items-end h-9">
                      <div
                        className={`w-full ${barColor} rounded-t-sm`}
                        style={{
                          height: `${Math.max(heightPct, 8)}%`,
                          transition: `height 0.6s cubic-bezier(0.34, 1.2, 0.64, 1)`,
                          transitionDelay: `${i * 60}ms`,
                        }}
                      />
                    </div>
                    <span className="text-[7px] font-mono text-on-surface-variant/40">ST{st}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Tipp-Historie */}
        <div className="space-y-2">
          <div className="flex items-center gap-1 text-[9px] font-mono text-on-surface-variant uppercase tracking-wider">
            <Award size={11} className="text-primary" /> Tipp-Historie
          </div>
          <div className="space-y-1.5">
            {tipps.filter(t => t.match?.status === 'finished').map((tip, i) => (
              <div key={tip.id} className="bg-surface-container-lowest/60 border border-white/5 rounded-xl p-2.5 flex items-center justify-between text-xs font-mono">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[8px] text-on-surface-variant/50 uppercase">ST {tip.match.spieltag}</span>
                  <span className="text-on-surface font-medium max-w-[150px] truncate">
                    {tip.match.heim_team} - {tip.match.gast_team}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="font-bold text-[10px] text-on-surface bg-surface-container px-1.5 py-0.5 rounded border border-white/5">
                      Tipp: {tip.tipp_heim}:{tip.tipp_gast}
                    </span>
                    <div className="text-[9px] text-on-surface-variant/40 mt-0.5">Ende: {tip.match.tore_heim}:{tip.match.tore_gast}</div>
                  </div>
                  <span className={`w-8 text-center font-bold text-[10px] ${PunkteFarbe(tip.punkte)} bg-surface-container px-1 py-0.5 rounded border border-white/5`}>
                    {tip.punkte > 0 ? `+${tip.punkte}P` : '0P'}
                  </span>
                </div>
              </div>
            ))}

            {tipps.filter(t => t.match?.status === 'finished').length === 0 && (
              <div className="text-center py-8 text-xs font-mono text-on-surface-variant/30">
                Keine beendeten Tipps in dieser Saison.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

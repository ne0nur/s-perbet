import { useState, useEffect, useRef, memo } from 'react'
import { useTipStore } from '../stores/tipStore'
import { getTeamLogo } from '../lib/teamLogos'
import { berechnePunkte } from '../lib/utils'
import { ChevronRight, Check, Minus, Plus, Lock, WifiOff } from 'lucide-react'
import { useSettingsStore } from '../stores/settingsStore'
import { useNetworkStore } from '../stores/networkStore'
import type { Match } from '../stores/matchStore'
import { motion, AnimatePresence } from 'framer-motion'

function punkteFarbe(punkte: number): string {
  if (punkte === 4) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
  if (punkte === 3) return 'text-amber-400 bg-amber-500/10 border-amber-500/30'
  if (punkte === 2) return 'text-blue-400 bg-blue-500/10 border-blue-500/30'
  if (punkte === 1) return 'text-purple-400 bg-purple-500/10 border-purple-500/30'
  if (punkte === -1) return 'text-red-400/90 bg-red-500/5 border-red-500/20'
  if (punkte === -2) return 'text-red-500 bg-red-600/10 border-red-600/30 font-bold'
  return 'text-slate-500 bg-slate-500/10 border-slate-500/30'
}

function randFarbe(punkte: number): string {
  if (punkte === 4) return 'border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.1)]'
  if (punkte === 3) return 'border-amber-500/50'
  if (punkte === 2) return 'border-blue-500/50'
  if (punkte === 1) return 'border-purple-500/40'
  if (punkte === -1) return 'border-red-500/20 opacity-80'
  if (punkte === -2) return 'border-red-600/40 opacity-75 shadow-[0_0_10px_rgba(220,38,38,0.05)]'
  return ''
}

function liveGlowKlasse(punkte: number): string {
  if (punkte === 4) return 'animate-pulse border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.3)] bg-emerald-950/[0.04]'
  if (punkte === 3) return 'animate-pulse border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.3)] bg-amber-950/[0.04]'
  if (punkte === 2) return 'animate-pulse border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.3)] bg-blue-950/[0.04]'
  if (punkte === 1) return 'animate-pulse border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.3)] bg-purple-950/[0.04]'
  if (punkte === -1) return 'animate-pulse border-red-500/30 shadow-[0_0_10px_rgba(239,68,68,0.15)] bg-red-950/[0.02]'
  if (punkte === -2) return 'animate-pulse border-red-600/40 shadow-[0_0_12px_rgba(220,38,38,0.2)] bg-red-950/[0.03]'
  return 'animate-pulse border-slate-500/30 shadow-[0_0_8px_rgba(100,116,139,0.15)] bg-slate-950/[0.02]'
}

function formatDatum(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' })
}

function formatUhrzeit(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
}

// ─── Stepper-Komponente ───────────────────────────────
function Stepper({ value, onChange, disabled }: { value: number; onChange: (v: number) => void; disabled?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <motion.button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); onChange(Math.max(0, value - 1)) }}
        disabled={disabled || value === 0}
        whileTap={{ scale: 0.85 }}
        className="w-8 h-8 rounded-full bg-surface-container-highest border border-surface-container-high flex items-center justify-center text-on-surface-variant
          hover:border-primary-container/40 hover:text-on-surface active:scale-90
          disabled:opacity-30 transition-all duration-150 cursor-pointer"
      >
        <Minus size={13} />
      </motion.button>

      <div className="w-7 h-8 relative overflow-hidden flex items-center justify-center">
        <AnimatePresence mode="popLayout">
          <motion.span
            key={value}
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -12, opacity: 0 }}
            transition={{ type: "spring", stiffness: 450, damping: 22 }}
            className="absolute font-mono text-xl font-bold text-on-surface tabular-nums select-none"
          >
            {value}
          </motion.span>
        </AnimatePresence>
      </div>

      <motion.button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); onChange(Math.min(20, value + 1)) }}
        disabled={disabled || value === 20}
        whileTap={{ scale: 0.85 }}
        className="w-8 h-8 rounded-full bg-surface-container-highest border border-surface-container-high flex items-center justify-center text-on-surface-variant
          hover:border-primary-container/40 hover:text-on-surface active:scale-90
          disabled:opacity-30 transition-all duration-150 cursor-pointer"
      >
        <Plus size={13} />
      </motion.button>
    </div>
  )
}


interface MatchCardProps {
  match: Match
  onNavigate?: () => void
  className?: string
  trendStats?: { home: number; draw: number; away: number }
}

export const MatchCard = memo(function MatchCard({ match, onNavigate, className = '', trendStats }: MatchCardProps) {
  const eigenerTipp = useTipStore(s => s.meineTipps.find(t => t.match_id === match.id))
  const tippSpeichern = useTipStore(s => s.tippSpeichern)
  const tippsFreigeschaltet = useSettingsStore(s => s.tippsFreigeschaltet)
  const isOnline = useNetworkStore(s => s.isOnline)

  const istVorbei  = match.status === 'finished'
  const istLive    = match.status === 'live'
  const istUpcoming = match.status === 'upcoming'

  // Tipp-Input State
  const [tippHeim, setTippHeim] = useState(eigenerTipp?.tipp_heim ?? 0)
  const [tippGast, setTippGast] = useState(eigenerTipp?.tipp_gast ?? 0)
  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const initialized = useRef(false)

  // Einmal initialisieren wenn Tipp aus Store geladen wird
  useEffect(() => {
    if (eigenerTipp && !initialized.current) {
      setTippHeim(eigenerTipp.tipp_heim)
      setTippGast(eigenerTipp.tipp_gast)
      initialized.current = true
    }
  }, [eigenerTipp])

  const punkte = istVorbei && eigenerTipp && match.tore_heim != null && match.tore_gast != null
    ? berechnePunkte(eigenerTipp.tipp_heim, eigenerTipp.tipp_gast, match.tore_heim, match.tore_gast)
    : null

  const livePunkte = istLive && eigenerTipp && match.tore_heim != null && match.tore_gast != null
    ? berechnePunkte(eigenerTipp.tipp_heim, eigenerTipp.tipp_gast, match.tore_heim, match.tore_gast)
    : null

  const kannTippen = istUpcoming && tippsFreigeschaltet

  async function handleSpeichern(e: React.MouseEvent) {
    e.stopPropagation()
    if (isSaving || !isOnline) return
    setIsSaving(true)
    try {
      await tippSpeichern(match.id, tippHeim, tippGast, match.spieltag)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      console.error(err)
    }
    setIsSaving(false)
  }

  return (
    <motion.div 
      whileHover={{ y: -2, scale: 1.01 }}
      transition={{ type: 'spring', stiffness: 350, damping: 25 }}
      className={`glass-card p-3 transition-all duration-300 hover:border-white/15 hover:shadow-[0_8px_24px_rgba(0,0,0,0.4)] ${
        istVorbei && punkte !== null 
          ? randFarbe(punkte) 
          : istLive && livePunkte !== null 
            ? liveGlowKlasse(livePunkte) 
            : ''
      } ${className}`}
    >

      {/* Status-Leiste */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
          <span>{formatDatum(match.anpfiff)} · {formatUhrzeit(match.anpfiff)}</span>
          {match.tournament === 'Champions League' && (
            <span className="text-amber-400 bg-amber-400/10 px-1 py-0.5 rounded text-[9px] font-bold flex items-center gap-1" title="Champions League">
              <img src={`${import.meta.env.BASE_URL}logos/UEFA_Champions_League_logo.png`} alt="CL" className="w-5 h-5 object-contain drop-shadow-[0_0_6px_rgba(255,255,255,0.6)] brightness-110" />
              CL
            </span>
          )}
        </span>
        {istLive && (
          <span className="flex items-center gap-1.5 text-red-400 text-xs font-medium">
            <span className="live-dot" /> LIVE
            {livePunkte !== null && (
              <span className={`ml-1.5 px-2 py-0.5 rounded-full text-[9px] font-mono font-black border uppercase tracking-wider ${
                livePunkte === 4 ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                livePunkte === 3 ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                livePunkte === 2 ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                'bg-slate-500/20 text-slate-400 border-slate-500/20'
              }`}>
                Prognose: +{livePunkte}P
              </span>
            )}
          </span>
        )}
        {istVorbei && punkte !== null && (
          <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border transition-all animate-scale-in ${punkteFarbe(punkte)}`}>
            {punkte > 0 ? `+${punkte}P` : '0P'}
          </span>
        )}
      </div>

      {/* Teams + Ergebnis */}
      <div
        onClick={() => onNavigate?.()}
        className="flex items-center gap-2 mb-3 cursor-pointer group/score hover:bg-surface-container/40 rounded-lg -mx-1 px-1 py-1 transition-colors relative"
      >
        {/* Heim */}
        <div className="flex-1 flex items-center justify-end gap-2">
          <span className="text-sm font-medium text-white truncate">{match.heim_team}</span>
          <img src={getTeamLogo(match.heim_team)} alt={match.heim_team}
            className="w-11 h-11 object-contain opacity-90 transition-transform duration-300 group-hover/score:scale-110"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
        </div>

        {/* Ergebnis */}
        <div className="text-center min-w-[72px] relative">
          {(istVorbei || istLive) && match.tore_heim != null && match.tore_gast != null ? (
            <div className="font-mono text-xl font-bold text-white tracking-wider flex items-center justify-center gap-1">
              {match.tore_heim}:{match.tore_gast}
            </div>
          ) : (
            <div className="font-mono text-lg font-bold tracking-wider text-slate-500">
              - : -
            </div>
          )}
          {/* Anzeige gespeicherter Tipp unter dem Ergebnis (wenn Spiel läuft oder vorbei) */}
          {eigenerTipp && !istUpcoming && (
            <div className="text-[10px] text-slate-500 font-mono mt-0.5">
              {eigenerTipp.tipp_heim}:{eigenerTipp.tipp_gast}
            </div>
          )}
          <ChevronRight size={13} className="absolute -right-3 top-1/2 -translate-y-1/2 text-on-surface-variant/20 opacity-0 group-hover/score:opacity-100 transition-opacity" />
        </div>

        {/* Gast */}
        <div className="flex-1 flex items-center gap-2">
          <img src={getTeamLogo(match.gast_team)} alt={match.gast_team}
            className="w-11 h-11 object-contain opacity-90 transition-transform duration-300 group-hover/score:scale-110"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
          <span className="text-sm font-medium text-white truncate">{match.gast_team}</span>
        </div>
      </div>

      {/* Community Trend (Schwarmintelligenz) */}
      {trendStats && (trendStats.home > 0 || trendStats.draw > 0 || trendStats.away > 0) && (
        <div className="px-1 mb-3">
          <div className="flex w-full h-1.5 rounded-full overflow-hidden bg-surface-container-high relative">
            <div 
              className="h-full bg-blue-500/80 transition-all duration-500" 
              style={{ width: `${(trendStats.home / (trendStats.home + trendStats.draw + trendStats.away)) * 100}%` }}
            />
            <div 
              className="h-full bg-slate-400/80 transition-all duration-500" 
              style={{ width: `${(trendStats.draw / (trendStats.home + trendStats.draw + trendStats.away)) * 100}%` }}
            />
            <div 
              className="h-full bg-rose-500/80 transition-all duration-500" 
              style={{ width: `${(trendStats.away / (trendStats.home + trendStats.draw + trendStats.away)) * 100}%` }}
            />
          </div>
          <div className="flex justify-between mt-1 text-[9px] font-mono font-medium text-on-surface-variant/60 px-0.5">
            <span className="text-blue-400/80">{Math.round((trendStats.home / (trendStats.home + trendStats.draw + trendStats.away)) * 100)}%</span>
            <span className="text-slate-400/80">{Math.round((trendStats.draw / (trendStats.home + trendStats.draw + trendStats.away)) * 100)}%</span>
            <span className="text-rose-400/80">{Math.round((trendStats.away / (trendStats.home + trendStats.draw + trendStats.away)) * 100)}%</span>
          </div>
        </div>
      )}

      {/* ─── Tipp-Bereich ─── */}
      <div className="pt-2 border-t border-white/5">

        {/* FALL A: Tipps noch nicht freigeschaltet (Saisonstart abwarten) */}
        {istUpcoming && !tippsFreigeschaltet && (
          <div className="flex items-center justify-center gap-2 py-1.5">
            <Lock size={12} className="text-amber-400/50 flex-shrink-0" />
            <span className="text-[11px] text-amber-400/50 font-mono uppercase tracking-wider">
              Tippabgabe startet mit Spielplan
            </span>
          </div>
        )}

        {/* FALL B: Tipp-Input aktiv */}
        {kannTippen && (
          <div className="flex items-center justify-between gap-2 px-1">
            {/* Heim-Stepper */}
            <Stepper value={tippHeim} onChange={setTippHeim} disabled={isSaving || !isOnline} />

            {/* Speichern-Button */}
            <motion.button
              onClick={handleSpeichern}
              disabled={isSaving || !isOnline}
              whileTap={{ scale: 0.95 }}
              className={`flex-shrink-0 flex items-center justify-center gap-1.5 px-4 py-2 rounded-full text-[11px] font-mono font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                !isOnline
                  ? 'bg-red-500/10 border border-red-500/20 text-red-400'
                  : saved
                    ? 'bg-green-500/20 border border-green-500/40 text-green-400 shadow-[0_0_12px_rgba(34,197,94,0.2)]'
                    : 'bg-primary-container/15 border border-primary-container/30 text-primary-fixed-dim hover:bg-primary-container/25'
              } disabled:opacity-50`}
            >
              <AnimatePresence mode="wait">
                {!isOnline ? (
                  <motion.span key="offline" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-1.5"><WifiOff size={12} /> Offline</motion.span>
                ) : isSaving ? (
                  <motion.div key="saving" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-3.5 h-3.5 border-2 border-primary-fixed-dim border-t-transparent rounded-full animate-spin" />
                ) : saved ? (
                  <motion.span 
                    key="saved" 
                    initial={{ scale: 0.8, opacity: 0 }} 
                    animate={{ scale: 1, opacity: 1 }} 
                    exit={{ scale: 0.8, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                    className="flex items-center gap-1.5"
                  >
                    <Check size={12} className="stroke-[3]" /> Gespeichert
                  </motion.span>
                ) : (
                  <motion.span key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    {eigenerTipp ? 'Ändern' : 'Tippen'}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>

            {/* Gast-Stepper */}
            <Stepper value={tippGast} onChange={setTippGast} disabled={isSaving || !isOnline} />
          </div>
        )}

        {/* FALL C: Tipp gesperrt (nach Anpfiff) — zeigt gespeicherten Tipp */}
        {!istUpcoming && eigenerTipp && (
          <div className="flex items-center justify-center gap-2 py-0.5">
            <Lock size={11} className="text-on-surface-variant/30" />
            <span className="text-[10px] text-on-surface-variant/40 font-mono uppercase tracking-wider">
              Tipp: {eigenerTipp.tipp_heim}:{eigenerTipp.tipp_gast}
            </span>
          </div>
        )}

        {/* FALL D: Upcoming ohne Tipp, nach Anpfiff, kein Tipp abgegeben */}
        {!istUpcoming && !eigenerTipp && (
          <div className="flex items-center justify-center py-0.5">
            <span className="text-[10px] text-on-surface-variant/25 font-mono uppercase tracking-wider">
              Kein Tipp abgegeben
            </span>
          </div>
        )}
      </div>
    </motion.div>
  )
})

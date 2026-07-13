import { useState, useEffect, useRef, memo } from 'react'
import { useTipStore } from '../stores/tipStore'
import { getTeamLogo } from '../lib/teamLogos'
import { berechnePunkte } from '../lib/utils'
import { ChevronRight, Check, Minus, Plus, Lock, WifiOff, AlertTriangle, MapPin } from 'lucide-react'
import { useSettingsStore } from '../stores/settingsStore'
import { useNetworkStore } from '../stores/networkStore'
import { useTranslation } from '../utils/translations'
import { useMatchStore, type Match } from '../stores/matchStore'
import { useTournamentStore } from '../stores/tournamentStore'
import { motion, AnimatePresence } from 'framer-motion'
import { useSaveState } from './useSaveState'
import { MatchEventsToggle } from './MatchEvents'

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

function liveGlowKlasse(): string {
  return 'live-card-pulse bg-red-950/[0.03]'
}

function formatDatum(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' })
}

function formatUhrzeit(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
}

// ─── Stepper-Komponente (Touch-optimiert) ─────────────
function Stepper({ value, onChange, disabled, onValidate }: { value: number; onChange: (v: number) => void; disabled?: boolean; onValidate?: (v: number) => boolean }) {
  const tryChange = (newVal: number) => {
    if (onValidate && !onValidate(newVal)) return
    onChange(newVal)
  }
  return (
    <div className="flex items-center gap-2">
      <motion.button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => { 
          e.stopPropagation(); 
          if ('vibrate' in navigator) navigator.vibrate(10);
          tryChange(Math.max(0, value - 1));
        }}
        disabled={disabled || value === 0}
        whileTap={{ scale: 0.85 }}
        className="w-11 h-11 rounded-full bg-surface-container-highest border border-surface-container-high flex items-center justify-center text-on-surface-variant
          hover:border-primary-container/40 hover:text-on-surface active:scale-90
          disabled:opacity-30 transition-all duration-150 cursor-pointer lg:hidden"
      >
        <Minus size={15} />
      </motion.button>

      <div className="w-7 h-11 relative overflow-hidden flex items-center justify-center lg:hidden">
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

      {/* Desktop: input field statt animiertem Number */}
      <input
        type="number"
        min="0"
        max="20"
        value={value}
        onChange={(e) => {
          const v = parseInt(e.target.value, 10)
          if (!isNaN(v) && v >= 0 && v <= 20) onChange(v)
        }}
        onPointerDown={(e) => e.stopPropagation()}
        disabled={disabled}
        className="hidden lg:flex w-10 h-9 rounded bg-surface-container-highest border border-surface-container-high text-center font-mono text-sm font-bold text-on-surface
          focus:outline-none focus:border-primary-container/60
          disabled:opacity-30 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />

      <motion.button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => { 
          e.stopPropagation(); 
          if ('vibrate' in navigator) navigator.vibrate(10);
          tryChange(Math.min(20, value + 1));
        }}
        disabled={disabled || value === 20}
        whileTap={{ scale: 0.85 }}
        className="w-11 h-11 rounded-full bg-surface-container-highest border border-surface-container-high flex items-center justify-center text-on-surface-variant
          hover:border-primary-container/40 hover:text-on-surface active:scale-90
          disabled:opacity-30 transition-all duration-150 cursor-pointer lg:hidden"
      >
        <Plus size={15} />
      </motion.button>

      {/* Desktop +/- Buttons (schmaler) */}
      <div className="hidden lg:flex flex-col gap-px">
        <motion.button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); tryChange(Math.min(20, value + 1)); }}
          disabled={disabled || value === 20}
          whileTap={{ scale: 0.85 }}
          className="w-6 h-4 rounded-sm bg-surface-container-higher border border-surface-container-high flex items-center justify-center text-[8px] text-on-surface-variant
            hover:border-primary-container/40 hover:text-on-surface disabled:opacity-30 transition-all cursor-pointer"
        >
          ▲
        </motion.button>
        <motion.button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); tryChange(Math.max(0, value - 1)); }}
          disabled={disabled || value === 0}
          whileTap={{ scale: 0.85 }}
          className="w-6 h-4 rounded-sm bg-surface-container-higher border border-surface-container-high flex items-center justify-center text-[8px] text-on-surface-variant
            hover:border-primary-container/40 hover:text-on-surface disabled:opacity-30 transition-all cursor-pointer"
        >
          ▼
        </motion.button>
      </div>
    </div>
  )
}


interface MatchCardProps {
  match: Match
  onNavigate?: (matchId: string) => void
  className?: string
  trendStats?: { home: number; draw: number; away: number }
  readOnly?: boolean
}

export const MatchCard = memo(function MatchCard({ match, onNavigate, className = '', trendStats, readOnly = false }: MatchCardProps) {
  const eigenerTipp = useTipStore(s => s.meineTipps.find(t => t.match_id === match.id))
  const tippSpeichern = useTipStore(s => s.tippSpeichern)
  const tippsFreigeschaltet = useSettingsStore(s => s.tippsFreigeschaltet)
  const isOnline = useNetworkStore(s => s.isOnline)
  const { language } = useTranslation()
  const aktivePhase = useMatchStore(s => s.aktivePhase)

  const kickoffTime = new Date(match.anpfiff).getTime()
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    setNow(Date.now())
  }, [])
  const istVorbei  = match.status === 'finished'
  const istLive    = match.status === 'live' || (match.status === 'upcoming' && kickoffTime < now)
  const istUpcoming = match.status === 'upcoming' && kickoffTime >= now

  // Re-render bei Anpfiff — auch ohne Sync zeigt die Karte sofort LIVE
  const [, tick] = useState(0)
  // Separierte Flags: 'mounted' blockt erstes Render, 'tipLoaded' zeigt an ob Store-Tipp geladen wurde
  const mounted = useRef(false)
  const tipLoaded = useRef(false)
  useEffect(() => { mounted.current = true }, [])
  useEffect(() => {
    if (match.status !== 'upcoming') return
    const delay = kickoffTime - Date.now()
    if (delay <= 0) { tick(n => n + 1); return }
    const timer = setTimeout(() => tick(n => n + 1), delay + 500)
    return () => clearTimeout(timer)
  }, [kickoffTime, match.status])

  // Tipp-Input State
  const [tippHeim, setTippHeim] = useState(eigenerTipp?.tipp_heim ?? 0)
  const [tippGast, setTippGast] = useState(eigenerTipp?.tipp_gast ?? 0)
  const saveState = useSaveState()
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hasChanges = tippHeim !== (eigenerTipp?.tipp_heim ?? 0) || tippGast !== (eigenerTipp?.tipp_gast ?? 0)

  // Cleanup timer on unmount
  useEffect(() => {
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current) }
  }, [])

  // Reset save state when tip changes externally (e.g. store hydration)
  useEffect(() => {
    if (!hasChanges && saveState.status === 'dirty') saveState.reset()
  }, [hasChanges, saveState])

  const config = useTournamentStore(s => s.getTournament(match.tournament || 'Süper Lig'))
  const isKoMatch = config?.has_knockout && match.spieltag > (config.group_stage_matchdays || 38)

  // Auto-Save: debounce 1.5s nach letzter Änderung
  useEffect(() => {
    if (!mounted.current) return
    if (readOnly || !istUpcoming || !tippsFreigeschaltet || !isOnline) return
    if (!hasChanges) return
    if (isKoMatch && tippHeim === tippGast) { saveState.markKoDraw(); return }

    saveState.markDirty()
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(async () => {
      saveState.markSaveStart()
      try {
        await tippSpeichern(match.id, tippHeim, tippGast, match.spieltag)
        saveState.markSaveDone()
        setTimeout(() => saveState.reset(), 2000)
      } catch {
        saveState.markSaveError()
      }
    }, 1500)
  }, [tippHeim, tippGast])

  // Einmal initialisieren wenn Tipp aus Store geladen wird
  useEffect(() => {
    if (tipLoaded.current) return
    if (eigenerTipp) {
      setTippHeim(eigenerTipp.tipp_heim)
      setTippGast(eigenerTipp.tipp_gast)
    }
    tipLoaded.current = true
  }, [eigenerTipp])

  const punkte = istVorbei && eigenerTipp && match.tore_heim != null && match.tore_gast != null
    ? berechnePunkte(eigenerTipp.tipp_heim, eigenerTipp.tipp_gast, match.tore_heim, match.tore_gast)
    : null

  const livePunkte = istLive && eigenerTipp && match.tore_heim != null && match.tore_gast != null
    ? berechnePunkte(eigenerTipp.tipp_heim, eigenerTipp.tipp_gast, match.tore_heim, match.tore_gast)
    : null

  const isPlaceholder = (name: string) => /winner|loser|tba|tbd|placeholder/i.test(name)
  const teamsStehenFest = !isPlaceholder(match.heim_team) && !isPlaceholder(match.gast_team)
  
  const isFuturePhase = isKoMatch && (aktivePhase === null || match.spieltag > aktivePhase)

  const kannTippen = !readOnly && istUpcoming && tippsFreigeschaltet && teamsStehenFest && !isFuturePhase

  return (
    <motion.div 
      whileHover={{ y: -2, scale: 1.01 }}
      transition={{ type: 'spring', stiffness: 350, damping: 25 }}
      className={`glass-card p-3 lg:px-4 lg:py-2 transition-all duration-200 hover:border-white/15 ${
        istVorbei && punkte !== null 
          ? randFarbe(punkte) 
          : istLive
            ? liveGlowKlasse() 
            : ''
      } ${className}`}
    >
      {/* Punkte-Badge — mobile oben rechts, desktop inline */}
      {istVorbei && punkte !== null && (
        <span className={`lg:hidden absolute top-2 right-2 px-2 py-0.5 rounded-full text-[11px] font-bold border transition-all animate-scale-in ${punkteFarbe(punkte)}`}>
          {punkte > 0 ? `+${punkte}P` : '0P'}
        </span>
      )}

            {/* ───────── Desktop Horizontal-Layout (lg+) — alles in EINER Zeile ───────── */}
            <div className="hidden lg:flex flex-col w-full">
            <div className="flex items-center gap-3 w-full">
              {/* Datum Uhrzeit + Stadion */}
              <div className="flex flex-col items-start shrink-0 min-w-0 leading-tight">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-mono text-slate-300 font-semibold uppercase tracking-wider whitespace-nowrap">
                    {formatDatum(match.anpfiff)}
                  </span>
                  <span className="text-xs font-mono text-slate-400">{formatUhrzeit(match.anpfiff)}</span>
                  {istLive && (
                    <span className="flex items-center gap-1 text-red-400 text-xs font-medium whitespace-nowrap">
                      <span className="live-dot" /> LIVE{match.spielminute}
                    </span>
                  )}
                </div>
                {match.venue && (
                  <span className="text-[10px] font-mono text-slate-500/60 truncate max-w-[160px]" title={match.venue}>
                    {match.venue}
                  </span>
                )}
              </div>

              {/* Heim */}
              <div className="flex-1 flex items-center justify-end gap-2 min-w-0">
                <span className="text-sm font-medium text-white truncate text-right">{match.heim_team}</span>
                <img src={match.heim_logo || getTeamLogo(match.heim_team)} alt=""
                  className="w-7 h-7 object-contain opacity-90 shrink-0"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
              </div>

              {/* Ergebnis + Trend-Bar */}
              <div className="flex flex-col items-center gap-0.5 shrink-0">
                <div className="text-center min-w-[64px] cursor-pointer" onClick={() => onNavigate?.(match.id)}>
                  {(istVorbei || istLive) && match.tore_heim != null && match.tore_gast != null ? (
                    <div className="font-mono text-xl font-bold text-white tracking-wider">{match.tore_heim}:{match.tore_gast}</div>
                  ) : (
                    <div className="font-mono text-xl font-bold text-slate-500 tracking-wider">-:-</div>
                  )}
                  {eigenerTipp && !istUpcoming && (
                    <div className="text-[9px] text-slate-500 font-mono leading-none -mt-0.5">{eigenerTipp.tipp_heim}:{eigenerTipp.tipp_gast}</div>
                  )}
                </div>
                {/* Trend-Bar */}
                {trendStats && (trendStats.home > 0 || trendStats.draw > 0 || trendStats.away > 0) && (
                  <div className="flex items-center gap-1 w-full max-w-[90px]">
                    <div className="flex h-[3px] rounded-full overflow-hidden bg-surface-container-high flex-1">
                      <div className="h-full bg-blue-500/80" style={{ width: `${(trendStats.home / (trendStats.home + trendStats.draw + trendStats.away)) * 100}%` }} />
                      <div className="h-full bg-slate-400/80" style={{ width: `${(trendStats.draw / (trendStats.home + trendStats.draw + trendStats.away)) * 100}%` }} />
                      <div className="h-full bg-rose-500/80" style={{ width: `${(trendStats.away / (trendStats.home + trendStats.draw + trendStats.away)) * 100}%` }} />
                    </div>
                    <span className="text-[9px] font-mono text-slate-500/60 whitespace-nowrap">
                      {Math.round((trendStats.home / (trendStats.home + trendStats.draw + trendStats.away)) * 100)}%
                    </span>
                  </div>
                )}
              </div>

              {/* Gast */}
              <div className="flex-1 flex items-center gap-2 min-w-0">
                <img src={getTeamLogo(match.gast_team)} alt=""
                  className="w-7 h-7 object-contain opacity-90 shrink-0"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                <span className="text-sm font-medium text-white truncate text-left">{match.gast_team}</span>
              </div>

              {/* Tipp */}
              {kannTippen ? (
                <div className="flex items-center gap-1 shrink-0">
                  <Stepper value={tippHeim} onChange={setTippHeim} disabled={saveState.status === 'saving' || !isOnline} />
                  {/* Desktop Status-Indikator (Mini + animiert) */}
                  <div
                    className={`relative flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full transition-all duration-200 ${
                      !isOnline
                        ? 'bg-red-500/10 border border-red-500/20 text-red-400'
                        : saveState.status === 'saving'
                          ? 'bg-primary-container/10 border border-primary-container/20 text-primary-fixed-dim'
                          : saveState.status === 'saved'
                            ? 'bg-green-500/20 border border-green-500/40 text-green-400'
                            : saveState.status === 'kodraw'
                              ? 'bg-amber-500/10 border border-amber-500/40 text-amber-400'
                              : hasChanges
                                ? saveState.status === 'dirty'
                                  ? 'bg-amber-500/5 border border-amber-500/30 text-amber-400'
                                  : 'bg-primary-container/10 border border-primary-container/20 text-primary-fixed-dim'
                                : 'bg-green-500/10 border border-green-500/20 text-green-400/70'
                    }`}
                  >
                    {/* Fortschrittsring — füllt sich in 1.5s (Desktop Mini) */}
                    {hasChanges && saveState.status === 'dirty' && (
                      <svg key={saveState.tick} className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 32 32">
                        <circle
                          cx="16" cy="16" r="13"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeDasharray={2 * Math.PI * 11}
                          className="text-amber-400 animate-save-ring"
                        />
                      </svg>
                    )}

                    <AnimatePresence mode="wait">
                      {!isOnline ? (
                        <motion.span key="off" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} transition={{ duration: 0.15 }}>
                          <WifiOff size={11} />
                        </motion.span>
                      ) : saveState.status === 'saving' ? (
                        <motion.div key="saving" initial={{ opacity: 0, rotate: -90 }} animate={{ opacity: 1, rotate: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
                          className="w-3 h-3 border-2 border-primary-fixed-dim border-t-transparent rounded-full animate-spin" />
                      ) : saveState.status === 'saved' ? (
                        <motion.span key="saved" initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }} transition={{ type: 'spring', stiffness: 400, damping: 20 }}>
                          <Check size={13} className="stroke-[3]" />
                        </motion.span>
                      ) : saveState.status === 'kodraw' ? (
                        <motion.span key="kodraw" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} transition={{ duration: 0.15 }}>
                          <AlertTriangle size={11} className="stroke-[2.5]" />
                        </motion.span>
                      ) : (
                        <motion.span key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.1 }} className="opacity-60">
                          <Check size={11} className="stroke-[2.5]" />
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </div>
                  <Stepper value={tippGast} onChange={setTippGast} disabled={saveState.status === 'saving' || !isOnline} />
                </div>
              ) : (
                <div className="shrink-0 min-w-[100px] flex items-center justify-end">
                  {readOnly && eigenerTipp ? (
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-surface-container/30">
                      <Lock size={10} className="text-on-surface-variant/30" />
                      <span className="text-xs text-on-surface-variant/60 font-mono">{eigenerTipp.tipp_heim}:{eigenerTipp.tipp_gast}</span>
                      {istLive && livePunkte !== null && (
                        <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-mono font-black border ${
                          livePunkte === 4 ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' :
                          livePunkte === 3 ? 'text-amber-400 bg-amber-500/10 border-amber-500/30' :
                          'text-slate-400 bg-slate-500/10 border-slate-500/30'
                        }`}>
                          {livePunkte > 0 ? `+${livePunkte}` : livePunkte}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-[9px] text-on-surface-variant/40 font-mono">–</span>
                  )}
                </div>
              )}

              {/* Punkte-Badge inline statt absolut */}
              {istVorbei && punkte !== null && (
                <span className={`shrink-0 px-2.5 py-0.5 rounded-full text-xs font-bold border ${punkteFarbe(punkte)}`}>
                  {punkte > 0 ? `+${punkte}P` : '0P'}
                </span>
              )}
            </div>{/* end inner flex-row */}
            </div>{/* end outer flex-col */}

      {/* ───────── Mobile Layout (wie gehabt, gestapelt) ───────── */}
      <div className="lg:hidden">

      {/* Status-Leiste: Datum + Uhrzeit + Stadion */}
      <div className="mb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Datum + Uhrzeit */}
            <span className="text-[11px] lg:text-sm font-mono text-slate-300 font-semibold uppercase tracking-wider">
              {formatDatum(match.anpfiff)}
            </span>
            <span className="w-0.5 h-3 rounded-full bg-slate-700" />
            <span className="text-[11px] font-mono text-slate-400 tabular-nums">
              {formatUhrzeit(match.anpfiff)} Uhr
            </span>
          </div>
          {match.tournament === 'Champions League' && (
            <span className="text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded text-[9px] font-bold flex items-center gap-1" title="Champions League">
              <img src={`${import.meta.env.BASE_URL}logos/UEFA_Champions_League_logo.png`} alt="CL" className="w-4 h-4 object-contain drop-shadow-[0_0_6px_rgba(255,255,255,0.6)] brightness-110"  loading="lazy" />
              CL
            </span>
          )}
        </div>

        {/* Stadion — eigene Zeile, vollständig lesbar */}
        {match.venue && (
          <div className="text-[10px] lg:text-xs text-slate-400/70 mt-1 font-mono truncate flex items-center gap-1" title={match.venue}>
            <MapPin size={11} className="text-amber-500/70 flex-shrink-0" />
            <span className="truncate">{match.venue}</span>
          </div>
        )}

        {istLive && (
          <span className="flex items-center gap-1.5 text-red-400 text-xs font-medium">
            <span className="live-dot" /> LIVE
            {match.spielminute && (
              <span className="text-[10px] text-red-400/50 font-mono">{match.spielminute}</span>
            )}
          </span>
        )}
      </div>

      {/* Teams + Ergebnis */}
      <div
        onClick={() => onNavigate?.(match.id)}
        className="flex items-center gap-2 mb-3 cursor-pointer group/score hover:bg-surface-container/40 rounded-lg -mx-1 px-1 py-1 transition-colors relative"
      >
        {/* Heim */}
        <div className="flex-1 flex items-center justify-end gap-2">
          <span className="text-xs md:text-sm font-medium text-white line-clamp-2 break-words leading-tight text-right">{match.heim_team}</span>
          <img src={match.heim_logo || getTeamLogo(match.heim_team)} alt={match.heim_team}
            className="w-11 h-11 object-contain opacity-90 transition-transform duration-300 group-hover/score:scale-110"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
        </div>

        {/* Ergebnis */}
        <div className="text-center min-w-[72px] relative">
          {(istVorbei || istLive) && match.tore_heim != null && match.tore_gast != null ? (
            <div className="font-mono text-xl lg:text-2xl font-bold text-white tracking-wider flex items-center justify-center gap-1">
              {match.tore_heim}:{match.tore_gast}
            </div>
          ) : (
            <div className="font-mono text-2xl lg:text-3xl font-bold text-slate-500">
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
          <span className="text-xs md:text-sm font-medium text-white line-clamp-2 break-words leading-tight text-left">{match.gast_team}</span>
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

        {/* READONLY: Nur Anzeige, kein Tippen möglich */}
        {readOnly && (
          <>
            {eigenerTipp ? (
              <div className="flex items-center justify-center gap-2 py-0.5">
                <Lock size={11} className="text-on-surface-variant/30" />
                <span className="text-[10px] text-on-surface-variant/40 font-mono uppercase tracking-wider">
                  Tipp: {eigenerTipp.tipp_heim}:{eigenerTipp.tipp_gast}
                </span>
                {istLive && livePunkte !== null && (
                  <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-mono font-black border animate-pulse ${
                    livePunkte === 4 ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' :
                    livePunkte === 3 ? 'text-amber-400 bg-amber-500/10 border-amber-500/30' :
                    livePunkte === 2 ? 'text-blue-400 bg-blue-500/10 border-blue-500/30' :
                    livePunkte >= 1 ? 'text-purple-400 bg-purple-500/10 border-purple-500/30' :
                    'text-slate-400 bg-slate-500/10 border-slate-500/30'
                  }`}>
                    {livePunkte > 0 ? `+${livePunkte}` : livePunkte}
                  </span>
                )}
              </div>
            ) : istUpcoming && isFuturePhase ? (
              <div className="flex items-center justify-center gap-2 py-1.5 px-2 text-center">
                <Lock size={12} className="text-on-surface-variant/50 flex-shrink-0" />
                <span className="text-[10px] text-on-surface-variant/50 font-mono uppercase tracking-wider">
                  {language === 'tr' ? 'Önceki tur henüz bitmedi' : language === 'en' ? 'Previous round not finished' : 'Vorherige Runde läuft noch'}
                </span>
              </div>
            ) : istUpcoming && !teamsStehenFest ? (
              <div className="flex items-center justify-center gap-2 py-1.5 px-2 text-center">
                <Lock size={12} className="text-on-surface-variant/50 flex-shrink-0" />
                <span className="text-[10px] text-on-surface-variant/50 font-mono uppercase tracking-wider">
                  {language === 'tr' ? 'Takımlar henüz belli değil' : language === 'en' ? 'Teams not decided yet' : 'Teams stehen noch nicht fest'}
                </span>
              </div>
            ) : !istUpcoming && !eigenerTipp ? (
              <div className="flex items-center justify-center py-0.5">
                <span className="text-[10px] text-on-surface-variant/25 font-mono uppercase tracking-wider">
                  Kein Tipp abgegeben
                </span>
              </div>
            ) : null}
          </>
        )}

        {/* FALL A: Tipps noch nicht freigeschaltet (Saisonstart abwarten) */}
        {!readOnly && istUpcoming && !tippsFreigeschaltet && (
          <div className="flex items-center justify-center gap-2 py-1.5">
            <Lock size={12} className="text-amber-400/50 flex-shrink-0" />
            <span className="text-[11px] text-amber-400/50 font-mono uppercase tracking-wider">
              Tippabgabe startet mit Spielplan
            </span>
          </div>
        )}

        {/* FALL A2: Teams in KO-Phase stehen noch nicht fest oder Phase gesperrt */}
        {!readOnly && istUpcoming && tippsFreigeschaltet && (!teamsStehenFest || isFuturePhase) && (
          <div className="flex items-center justify-center gap-2 py-1.5 px-2 text-center">
            <Lock size={12} className="text-on-surface-variant/50 flex-shrink-0" />
            <span className="text-[10px] text-on-surface-variant/50 font-mono uppercase tracking-wider">
              {language === 'tr' 
                ? (isFuturePhase ? 'Önceki tur henüz bitmedi' : 'Takımlar henüz belli değil')
                : language === 'en' 
                  ? (isFuturePhase ? 'Previous round not finished' : 'Teams not decided yet')
                  : (isFuturePhase ? 'Vorherige Runde läuft noch' : 'Teams stehen noch nicht fest')}
            </span>
          </div>
        )}

        {/* KO-Spiel Warnung */}
        {kannTippen && isKoMatch && (
          <div className="flex items-center justify-center gap-1.5 pb-2 text-[9px] font-mono text-amber-400/80 uppercase tracking-wider text-center px-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400/80 shrink-0" />
            {language === 'tr' 
              ? 'Tüm sonucu tahmin et (penaltılar dahil)'
              : language === 'en'
                ? 'Tip entire result (incl. penalties)'
                : 'Gesamtes Ergebnis tippen (inkl. Elfmeterschießen)'}
          </div>
        )}

        {/* FALL B: Tipp-Input aktiv */}
        {kannTippen && (() => {
          const ringCircumference = 2 * Math.PI * 24
          const koDrawWarning = isKoMatch && hasChanges && tippHeim === tippGast

          return (
          <div className="flex items-center justify-between gap-2 px-1">
            {/* Heim-Stepper */}
            <Stepper value={tippHeim} onChange={setTippHeim} disabled={saveState.status === 'saving' || !isOnline} />

            {/* Status-Indikator (Auto-Save, kein Klick) */}
            <div
              className={`relative flex-shrink-0 w-[56px] h-[56px] flex items-center justify-center rounded-full transition-all duration-300 ${
                !isOnline
                  ? 'bg-red-500/10 border border-red-500/20 text-red-400'
                  : saveState.status === 'saving'
                    ? 'bg-primary-container/10 border border-primary-container/20 text-primary-fixed-dim'
                    : saveState.status === 'saved'
                      ? 'bg-green-500/20 border border-green-500/40 text-green-400 shadow-[0_0_12px_rgba(34,197,94,0.2)]'
                      : saveState.status === 'kodraw'
                        ? 'bg-amber-500/10 border border-amber-500/40 text-amber-400'
                        : hasChanges
                          ? saveState.status === 'dirty'
                            ? 'bg-amber-500/5 border border-amber-500/30 text-amber-400'
                            : 'bg-primary-container/10 border border-primary-container/20 text-primary-fixed-dim'
                          : 'bg-green-500/10 border border-green-500/20 text-green-400/70'
              }`}
            >
              {/* Fortschrittsring — füllt sich in 1.5s */}
              {hasChanges && saveState.status === 'dirty' && (
                <svg key={saveState.tick} className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 56 56">
                  <circle
                    cx="28" cy="28" r="24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeDasharray={ringCircumference}
                    className="text-amber-400 animate-save-ring"
                    style={{ '--ring-circumference': ringCircumference } as React.CSSProperties}
                  />
                </svg>
              )}

              <AnimatePresence mode="wait">
                {!isOnline ? (
                  <motion.span key="off" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} transition={{ duration: 0.2 }}>
                    <WifiOff size={16} />
                  </motion.span>
                ) : saveState.status === 'saving' ? (
                  <motion.div key="saving" initial={{ opacity: 0, rotate: -90 }} animate={{ opacity: 1, rotate: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
                    className="w-4 h-4 border-2 border-primary-fixed-dim border-t-transparent rounded-full animate-spin" />
                ) : saveState.status === 'saved' ? (
                  <motion.span key="saved" initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }} transition={{ type: 'spring', stiffness: 400, damping: 20 }}>
                    <Check size={22} className="stroke-[3]" />
                  </motion.span>
                ) : saveState.status === 'kodraw' ? (
                  <motion.span key="kodraw" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} transition={{ duration: 0.2 }}>
                    <AlertTriangle size={20} className="stroke-[2.5]" />
                  </motion.span>
                ) : (
                  <motion.span key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="opacity-60">
                    <Check size={18} className="stroke-[2.5]" />
                  </motion.span>
                )}
              </AnimatePresence>
            </div>

            {/* Gast-Stepper */}
            <Stepper value={tippGast} onChange={setTippGast} disabled={saveState.status === 'saving' || !isOnline} />
          </div>
          )
        })()}

        {/* FALL C: Tipp gesperrt (nach Anpfiff) — zeigt gespeicherten Tipp + Live-Punkte */}
        {!readOnly && !istUpcoming && eigenerTipp && (
          <div className="flex items-center justify-center gap-2 py-0.5">
            <Lock size={11} className="text-on-surface-variant/30" />
            <span className="text-[10px] text-on-surface-variant/40 font-mono uppercase tracking-wider">
              Tipp: {eigenerTipp.tipp_heim}:{eigenerTipp.tipp_gast}
            </span>
            {istLive && livePunkte !== null && (
              <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-mono font-black border animate-pulse ${
                livePunkte === 4 ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' :
                livePunkte === 3 ? 'text-amber-400 bg-amber-500/10 border-amber-500/30' :
                livePunkte === 2 ? 'text-blue-400 bg-blue-500/10 border-blue-500/30' :
                livePunkte >= 1 ? 'text-purple-400 bg-purple-500/10 border-purple-500/30' :
                'text-slate-400 bg-slate-500/10 border-slate-500/30'
              }`}>
                {livePunkte > 0 ? `+${livePunkte}` : livePunkte}
              </span>
            )}
          </div>
        )}

        {/* FALL D: Upcoming ohne Tipp, nach Anpfiff, kein Tipp abgegeben */}
        {!readOnly && !istUpcoming && !eigenerTipp && (
          <div className="flex items-center justify-center py-0.5">
            <span className="text-[10px] text-on-surface-variant/25 font-mono uppercase tracking-wider">
              Kein Tipp abgegeben
            </span>
          </div>
        )}
      </div>
      </div>{/* end lg:hidden */}

      {/* Match-Events (mobile only + bei live/finished mit ESPN-Daten) */}
      <div className="lg:hidden">
        {(istLive || istVorbei) && match.espn_id && (
          <MatchEventsToggle espnId={match.espn_id} tournament={match.tournament || 'Süper Lig'} />
        )}
      </div>
    </motion.div>
  )
})

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { RefreshCw, Check, X, AlertTriangle, Calendar, Users, Trophy } from 'lucide-react'

interface RolloverStatus {
  canRollover: boolean
  season: { id: number; name: string }
  stats: {
    totalMatches: number
    openMatches: number
    users: number
    totalPoints: number
    totalAchievements: number
  }
}

export function SaisonAdminPanel() {
  const [status, setStatus] = useState<RolloverStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [executing, setExecuting] = useState(false)
  const [confirmStep, setConfirmStep] = useState(0) // 0=keine, 1=erste, 2=final
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null)

  const loadStatus = async () => {
    setLoading(true)
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/trigger-saison-rollover`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (!res.ok) {
        const err = await res.json()
        setStatus(null)
        setResult({ ok: false, text: err.error || 'Fehler beim Laden' })
      } else {
        setStatus(await res.json())
        setResult(null)
      }
    } catch (e: any) {
      setResult({ ok: false, text: e.message })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadStatus() }, [])

  const executeRollover = async () => {
    setExecuting(true)
    setResult(null)
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/trigger-saison-rollover`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        }
      )
      const data = await res.json()
      if (!res.ok) {
        setResult({ ok: false, text: data.error || 'Fehler beim Rollover' })
      } else {
        setResult({
          ok: true,
          text: `✅ Saison ${data.previousSeason} archiviert! ${data.archived.users} User mit ${data.archived.totalPoints} Punkten archiviert. Neue Saison: ${data.newSeason?.name || '?'}`
        })
        setConfirmStep(0)
        loadStatus() // Refresh
      }
    } catch (e: any) {
      setResult({ ok: false, text: e.message })
    } finally {
      setExecuting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const isSaisonBeendet = status?.canRollover
  const stats = status?.stats

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <Calendar size={16} className="text-primary" />
        <h3 className="text-sm font-bold text-on-surface">Saison-Management</h3>
      </div>

      {/* Aktuelle Saison Info */}
      <div className="bg-surface-container/60 border border-surface-container-high rounded-xl p-3.5 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono text-on-surface-variant uppercase tracking-wider">Aktuelle Saison</span>
          <span className="text-xs font-mono font-bold text-primary-fixed-dim">{status?.season?.name || '—'}</span>
        </div>

        {stats && (
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-surface-container-high/50">
            <div className="flex items-center gap-1.5">
              <Trophy size={11} className="text-on-surface-variant/40" />
              <span className="text-[10px] text-on-surface-variant">{stats.totalMatches} Spiele</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Users size={11} className="text-on-surface-variant/40" />
              <span className="text-[10px] text-on-surface-variant">{stats.users} User</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Trophy size={11} className="text-amber-400/60" />
              <span className="text-[10px] text-on-surface-variant">{stats.totalPoints} Punkte vergeben</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Check size={11} className="text-on-surface-variant/40" />
              <span className="text-[10px] text-on-surface-variant">{stats.openMatches} offene Spiele</span>
            </div>
          </div>
        )}
      </div>

      {/* Status-Badge */}
      <div className={`flex items-center gap-2 p-3 rounded-xl border ${
        isSaisonBeendet
          ? 'bg-success-container/30 border-success/30 text-success'
          : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
      }`}>
        {isSaisonBeendet ? <Check size={16} /> : <AlertTriangle size={16} />}
        <div>
          <p className="text-xs font-bold">
            {isSaisonBeendet
              ? '✅ Saison beendet! Alle Spiele sind durch.'
              : '⏳ Saison läuft noch'
            }
          </p>
          <p className="text-[10px] mt-0.5 opacity-80">
            {isSaisonBeendet
              ? 'Jetzt ist der perfekte Zeitpunkt für den Saison-Rollover.'
              : `${stats?.openMatches || 0} ${stats?.openMatches === 1 ? 'Match ist' : 'Matches sind'} noch nicht beendet.`
            }
          </p>
        </div>
      </div>

      {/* Hinweis was passiert */}
      <div className="bg-surface-container-lowest border border-surface-container-high rounded-xl p-3 space-y-1.5">
        <p className="text-[10px] font-mono font-bold text-on-surface-variant uppercase tracking-wider">Beim Rollover</p>
        <ul className="space-y-1">
          <li className="flex items-center gap-1.5 text-[10px] text-on-surface-variant">
            <Check size={10} className="text-success shrink-0" /> EXP & Level bleiben erhalten
          </li>
          <li className="flex items-center gap-1.5 text-[10px] text-on-surface-variant">
            <Check size={10} className="text-success shrink-0" /> Punkte & Achievements werden archiviert
          </li>
          <li className="flex items-center gap-1.5 text-[10px] text-on-surface-variant">
            <Check size={10} className="text-success shrink-0" /> Alte Daten in Global-Seite einsehbar
          </li>
          <li className="flex items-center gap-1.5 text-[10px] text-on-surface-variant">
            <X size={10} className="text-error/60 shrink-0" /> Punkte & Achievements werden auf 0 gesetzt
          </li>
        </ul>
      </div>

      {/* Rollover Button */}
      <div className="space-y-3">
        {confirmStep === 0 && (
          <button
            onClick={() => setConfirmStep(1)}
            disabled={!isSaisonBeendet}
            className={`w-full py-3 rounded-xl font-mono text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
              isSaisonBeendet
                ? 'bg-amber-500/20 border border-amber-500/40 text-amber-400 hover:bg-amber-500/30 cursor-pointer'
                : 'bg-surface-container-low border border-surface-container-high text-on-surface-variant/40 cursor-not-allowed'
            }`}
          >
            <RefreshCw size={14} />
            Saison-Rollover auslösen
          </button>
        )}

        {confirmStep === 1 && (
          <div className="bg-error/10 border border-error/30 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-error shrink-0" />
              <p className="text-xs font-bold text-error">Bist du sicher?</p>
            </div>
            <p className="text-[10px] text-on-surface-variant leading-relaxed">
              Das setzt ALLE Punkte und Achievements aller User zurück. 
              Die Daten werden in der Historie gespeichert, aber die aktuelle Saison 
              startet bei Null. Diese Aktion kann nicht rückgängig gemacht werden.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmStep(0)}
                className="flex-1 py-2.5 rounded-lg bg-surface-container border border-surface-container-high text-on-surface text-xs font-bold hover:bg-surface-container-higher transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={() => setConfirmStep(2)}
                className="flex-1 py-2.5 rounded-lg bg-error border border-error/50 text-on-error text-xs font-bold hover:opacity-90 transition-opacity"
              >
                Ja, Rollover ausführen
              </button>
            </div>
          </div>
        )}

        {confirmStep === 2 && (
          <div className="bg-error/10 border border-error/30 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-error shrink-0" />
              <p className="text-xs font-bold text-error">WIRKLICH? Letzte Chance!</p>
            </div>
            <p className="text-[10px] text-on-surface-variant leading-relaxed">
              Dies ist die finale Bestätigung. Nach dem Rollover gibt es kein Zurück.
              {stats && ` ${stats.users} User, ${stats.totalPoints} Punkte und ${stats.totalAchievements} Achievements werden archiviert.`}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmStep(1)}
                className="flex-1 py-2.5 rounded-lg bg-surface-container border border-surface-container-high text-on-surface text-xs font-bold hover:bg-surface-container-higher transition-colors"
              >
                Zurück
              </button>
              <button
                onClick={executeRollover}
                disabled={executing}
                className="flex-1 py-2.5 rounded-lg bg-error text-on-error text-xs font-bold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {executing ? (
                  <><div className="w-3 h-3 border-2 border-white/60 border-t-transparent rounded-full animate-spin" /> Ausführen...</>
                ) : 'Ja, ausführen!'}
              </button>
            </div>
          </div>
        )}

        {/* Refresh */}
        <button
          onClick={loadStatus}
          className="w-full py-1.5 rounded-lg text-[9px] font-mono text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors flex items-center justify-center gap-1"
        >
          <RefreshCw size={10} />
          Status aktualisieren
        </button>
      </div>

      {/* Ergebnis */}
      {result && (
        <div className={`p-3 rounded-xl text-xs ${result.ok ? 'bg-success-container/30 text-success border border-success/30' : 'bg-error/10 text-error border border-error/20'}`}>
          {result.text}
        </div>
      )}
    </div>
  )
}

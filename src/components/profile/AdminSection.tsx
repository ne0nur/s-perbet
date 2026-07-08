import { useState, type ChangeEvent } from 'react'
import { Shield, Check, X, Copy, Settings, Megaphone, RefreshCw } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useTranslation } from '../../utils/translations'
import { useAuthStore } from '../../stores/authStore'
import { TippsFreigabeToggle } from './TippsFreigabeToggle'
import type { Match } from '../../stores/matchStore'

interface League {
  id: string
  name: string
}

export interface OnlineUser {
  id: string
  username: string
  avatar_url: string | null
  onlineAt: string
}

interface AdminSectionProps {
  allLeagues: League[]
  selectedLeagueId: string
  setSelectedLeagueId: (id: string) => void
  newUsername: string
  setNewUsername: (name: string) => void
  newPassword: string
  setNewPassword: (pass: string) => void
  creatingUser: boolean
  adminMsg: { type: 'success' | 'error'; text: string } | null
  setAdminMsg: (msg: { type: 'success' | 'error'; text: string } | null) => void
  createdUsersList: { username: string; password: string }[]
  adminTab: 'overview' | 'create' | 'manage_users' | 'manage_leagues' | 'manage_matches' | 'push_test'
  setAdminTab: (tab: 'overview' | 'create' | 'manage_users' | 'manage_leagues' | 'manage_matches' | 'push_test') => void
  adminCreateSubTab: 'manual' | 'auto'
  setAdminCreateSubTab: (tab: 'manual' | 'auto') => void
  copiedIndex: number | null
  handleCreateUser: () => Promise<void>
  handleQuickCreate: () => Promise<void>
  handleBatchCreate: () => Promise<void>
  handleAdminResetPassword: (user: string, pass: string) => Promise<void>
  handleAdminDeleteUser: (user: string) => Promise<void>
  handleAdminDeleteLeague: (id: string, name: string) => Promise<void>
  handleCopyUserCreds: (username: string, pass: string, index: number) => void
  batchCount: number
  setBatchCount: (count: number) => void
  totalUsers: number
  onlineUsers: Record<string, OnlineUser>
}

function AdminMatchRow({ m, handleUpdateMatch }: { m: Match, handleUpdateMatch: (id: string, h: number|null, g: number|null, s: 'upcoming'|'live'|'finished'|'postponed') => void }) {
  const [heim, setHeim] = useState<string>(m.tore_heim !== null ? String(m.tore_heim) : '')
  const [gast, setGast] = useState<string>(m.tore_gast !== null ? String(m.tore_gast) : '')
  const [status, setStatus] = useState<'upcoming'|'live'|'finished'|'postponed'>(m.status)
  const { t } = useTranslation()
  
  return (
    <div className="bg-surface-container-lowest border border-surface-container-high rounded-lg p-3 space-y-2">
      <div className="flex justify-between items-center text-[10px] text-on-surface-variant">
        <span>{new Date(m.anpfiff).toLocaleDateString()} - {t('spieltagShort')} {m.spieltag} - {m.tournament}</span>
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold text-on-surface truncate flex-1">{m.heim_team}</span>
        <input type="number" value={heim} onChange={e => setHeim(e.target.value)} className="w-10 h-8 bg-surface-container border border-surface-container-high rounded text-center text-xs" />
        <span>:</span>
        <input type="number" value={gast} onChange={e => setGast(e.target.value)} className="w-10 h-8 bg-surface-container border border-surface-container-high rounded text-center text-xs" />
        <span className="text-xs font-bold text-on-surface truncate flex-1 text-right">{m.gast_team}</span>
      </div>
      <div className="flex justify-between items-center mt-2 pt-2 border-t border-surface-container-high/50">
        <select value={status} onChange={(e: ChangeEvent<HTMLSelectElement>) => setStatus(e.target.value as 'upcoming'|'live'|'finished'|'postponed')} className="bg-surface-container border border-surface-container-high rounded px-1 py-1 text-[10px] outline-none">
          <option value="upcoming">{t('upcomingMatchUpper')}</option>
          <option value="live">{t('liveMatchUpper')}</option>
          <option value="finished">{t('finishedMatchUpper')}</option>
          <option value="postponed">{t('postponedMatchUpper')}</option>
        </select>
        <button 
          onClick={() => handleUpdateMatch(m.id, heim === '' ? null : parseInt(heim), gast === '' ? null : parseInt(gast), status)}
          className="bg-primary-container text-primary-fixed-dim px-3 py-1 rounded font-mono text-[9px] uppercase font-bold hover:opacity-90"
        >
          {t('save')}
        </button>
      </div>
    </div>
  )
}

function generateTemporaryPassword(): string {
  const randomDigits = Math.floor(1000 + Math.random() * 9000)
  return `SuperTip-${randomDigits}`
}

export function AdminSection({
  allLeagues,
  selectedLeagueId,
  setSelectedLeagueId,
  newUsername,
  setNewUsername,
  newPassword,
  setNewPassword,
  creatingUser,
  adminMsg,
  setAdminMsg,
  createdUsersList,
  adminTab,
  setAdminTab,
  adminCreateSubTab,
  setAdminCreateSubTab,
  copiedIndex,
  handleCreateUser,
  handleQuickCreate,
  handleBatchCreate,
  handleAdminResetPassword,
  handleAdminDeleteUser,
  handleAdminDeleteLeague,
  handleCopyUserCreds,
  batchCount,
  setBatchCount,
  totalUsers,
  onlineUsers
}: AdminSectionProps) {
  const [targetUsername, setTargetUsername] = useState('')
  const [resetPassword, setResetPassword] = useState('')
  const [adminMatches, setAdminMatches] = useState<Match[]>([])
  const [loadingMatches, setLoadingMatches] = useState(false)
  const { t, language } = useTranslation()

  // Reset Requests States
  const [pendingRequests, setPendingRequests] = useState<{ id: string; username: string; email_hint: string | null; created_at: string }[]>([])
  const [loadingRequests, setLoadingRequests] = useState(false)
  
  // Broadcast state
  const [broadcastMessage, setBroadcastMessage] = useState('')
  const [sendingBroadcast, setSendingBroadcast] = useState(false)
  const [broadcastResult, setBroadcastResult] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [syncingResults, setSyncingResults] = useState(false)
  const [syncResult, setSyncResult] = useState<{ type: 'success' | 'error'; text: string; details?: string[] } | null>(null)
  
  // Push Notification Test State
  const [pushTitle, setPushTitle] = useState('⚽ SuperBET Test')
  const [pushBody, setPushBody] = useState('Das ist ein manueller Test-Push vom Admin!')
  const [pushSending, setPushSending] = useState(false)
  const [pushResult, setPushResult] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  
  const user = useAuthStore(s => s.user)
  
  // Funktion um offene Reset-Anfragen zu laden
  const fetchPendingRequests = async () => {
    setLoadingRequests(true)
    try {
      const { data, error } = await supabase
        .from('password_reset_requests')
        .select('id, username, email_hint, created_at')
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
      if (!error && data) {
        setPendingRequests(data)
      }
    } catch (err) {
      console.error('Fehler beim Laden der Reset-Anfragen:', err)
    } finally {
      setLoadingRequests(false)
    }
  }

  // Freigabe einer Passwort-Anfrage
  const handleApproveRequest = async (requestId: string, username: string) => {
    const tempPassword = generateTemporaryPassword()
    
    setAdminMsg(null)
    try {
      // 1. RPC zum Passwort zurücksetzen aufrufen (aktualisiert auth.users und profiles.muss_passwort_aendern)
      const { error: rpcError } = await supabase.rpc('admin_reset_password', {
        target_username: username,
        new_password: tempPassword
      })
      
      if (rpcError) throw rpcError
      
      // 2. Den Status der Anfrage auf 'resolved' aktualisieren
      const { error: updateError } = await supabase
        .from('password_reset_requests')
        .update({
          status: 'resolved',
          temporary_password: tempPassword,
          resolved_at: new Date().toISOString()
        })
        .eq('id', requestId)
        
      if (updateError) throw updateError
      
      setAdminMsg({ type: 'success', text: `Passwort für ${username} wurde auf "${tempPassword}" gesetzt und freigegeben!` })
      fetchPendingRequests()
    } catch (err: unknown) {
      console.error(err)
      const msg = err instanceof Error ? err.message : 'Fehler beim Zurücksetzen des Passworts.'
      setAdminMsg({ type: 'error', text: msg })
    }
  }

  // Ablehnen einer Passwort-Anfrage
  const handleRejectRequest = async (requestId: string, username: string) => {
    setAdminMsg(null)
    try {
      const { error } = await supabase
        .from('password_reset_requests')
        .update({
          status: 'rejected',
          resolved_at: new Date().toISOString()
        })
        .eq('id', requestId)
        
      if (error) throw error
      
      setAdminMsg({ type: 'success', text: `Anfrage von ${username} wurde abgelehnt.` })
      fetchPendingRequests()
    } catch (err: unknown) {
      console.error(err)
      const msg = err instanceof Error ? err.message : 'Fehler beim Ablehnen der Anfrage.'
      setAdminMsg({ type: 'error', text: msg })
    }
  }
  
  // Funktion um Spiele für den Admin zu laden
  const fetchAdminMatches = async () => {
    setLoadingMatches(true)
    const { data } = await supabase
      .from('matches')
      .select('id, heim_team, gast_team, tore_heim, tore_gast, status, anpfiff, spieltag, tournament, season')
      .order('anpfiff', { ascending: false })
      .limit(30)
    if (data) setAdminMatches(data as Match[])
    setLoadingMatches(false)
  }

  // Handle Match Update
  const handleUpdateMatch = async (matchId: string, toreHeim: number | null, toreGast: number | null, setStatus: 'finished' | 'live' | 'upcoming' | 'postponed') => {
    const { error } = await supabase
      .from('matches')
      .update({ tore_heim: toreHeim, tore_gast: toreGast, status: setStatus })
      .eq('id', matchId)
      
    if (!error) {
      setAdminMsg({ type: 'success', text: t('adminMatchSaved') })
      fetchAdminMatches()
    } else {
      setAdminMsg({ type: 'error', text: t('adminMatchError') })
    }
  }

  // Broadcast handler
  const handleSendBroadcast = async () => {
    if (!broadcastMessage.trim()) return
    setSendingBroadcast(true)
    setBroadcastResult(null)
    try {
      const { error } = await supabase.from('admin_broadcasts').insert({
        message: broadcastMessage.trim(),
        created_by: user?.user_metadata?.username || 'admin'
      })
      if (error) throw error
      setBroadcastMessage('')
      setBroadcastResult({ type: 'success', text: t('broadcastSent') })
    } catch (err) {
      setBroadcastResult({ type: 'error', text: (err as Error).message })
    } finally {
      setSendingBroadcast(false)
    }
  }

  // Sync Match Results Handler
  const handleSyncResults = async () => {
    setSyncingResults(true)
    setSyncResult(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error('Keine gültige Session')

      const fnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-match-results`
      const response = await fetch(fnUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      })

      const result = await response.json()

      if (!response.ok || result.error) {
        setSyncResult({ type: 'error', text: result.error || `HTTP ${response.status}` })
        return
      }

      const details = result.details as string[] | undefined
      setSyncResult({
        type: 'success',
        text: result.message || `${result.updated} Spiele aktualisiert`,
        details: details?.slice(0, 10),
      })
    } catch (err) {
      setSyncResult({ type: 'error', text: (err as Error).message })
    } finally {
      setSyncingResults(false)
    }
  }

  return (
    <div className="bg-surface-container-low border border-primary-container/20 rounded-xl overflow-hidden shadow-sm stagger-in text-left">
      <div className="px-4 py-2.5 bg-surface-container border-b border-surface-container-high flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Shield size={14} className="text-primary" />
          <span className="font-mono text-[9px] text-on-surface-variant uppercase tracking-wider">{t('adminPanel')}</span>
        </div>
        <div className="flex bg-surface-container-lowest p-[2px] rounded-lg border border-surface-container-high overflow-x-auto hide-scrollbar">
          <button
            onClick={() => { setAdminTab('overview'); setAdminMsg(null); }}
            className={`px-2 py-1 text-[9px] font-mono uppercase tracking-wider rounded-md transition-all whitespace-nowrap ${
              adminTab === 'overview' ? 'bg-primary-container/20 text-primary border border-primary-container/30 font-bold' : 'text-on-surface-variant/60 hover:text-on-surface'
            }`}
          >
            {t('adminOverview')}
          </button>
          <button
            onClick={() => { setAdminTab('create'); setAdminMsg(null); }}
            className={`px-2 py-1 text-[9px] font-mono uppercase tracking-wider rounded-md transition-all whitespace-nowrap ${
              adminTab === 'create' ? 'bg-primary-container/20 text-primary border border-primary-container/30 font-bold' : 'text-on-surface-variant/60 hover:text-on-surface'
            }`}
          >
            {t('adminCreateUser')}
          </button>
          <button
            onClick={() => { setAdminTab('manage_users'); setAdminMsg(null); fetchPendingRequests(); }}
            className={`px-2 py-1 text-[9px] font-mono uppercase tracking-wider rounded-md transition-all whitespace-nowrap ${
              adminTab === 'manage_users' ? 'bg-primary-container/20 text-primary border border-primary-container/30 font-bold' : 'text-on-surface-variant/60 hover:text-on-surface'
            }`}
          >
            {t('adminManageUsers')}
          </button>
          <button
            onClick={() => { setAdminTab('manage_leagues'); setAdminMsg(null); }}
            className={`px-2 py-1 text-[9px] font-mono uppercase tracking-wider rounded-md transition-all whitespace-nowrap ${
              adminTab === 'manage_leagues' ? 'bg-primary-container/20 text-primary border border-primary-container/30 font-bold' : 'text-on-surface-variant/60 hover:text-on-surface'
            }`}
          >
            {t('adminManageLeagues')}
          </button>
          <button
            onClick={() => { setAdminTab('manage_matches'); setAdminMsg(null); fetchAdminMatches(); }}
            className={`px-2 py-1 text-[9px] font-mono uppercase tracking-wider rounded-md transition-all whitespace-nowrap ${
              adminTab === 'manage_matches' ? 'bg-primary-container/20 text-primary border border-primary-container/30 font-bold' : 'text-on-surface-variant/60 hover:text-on-surface'
            }`}
          >
            {t('adminManageMatches')}
          </button>
          <button
            onClick={() => { setAdminTab('push_test'); setAdminMsg(null); }}
            className={`px-2 py-1 text-[9px] font-mono uppercase tracking-wider rounded-md transition-all whitespace-nowrap ${
              adminTab === 'push_test' ? 'bg-primary-container/20 text-primary border border-primary-container/30 font-bold' : 'text-on-surface-variant/60 hover:text-on-surface'
            }`}
          >
            Push Test
          </button>
        </div>
      </div>
      
      <div className="p-4 space-y-3">
        {adminTab === 'overview' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-surface-container border border-surface-container-high p-3 rounded-lg text-center">
                <div className="text-2xl font-black text-primary">{totalUsers}</div>
                <div className="text-[10px] font-mono text-on-surface-variant uppercase mt-1">{t('adminPlayersTotal')}</div>
              </div>
              <div className="bg-surface-container border border-surface-container-high p-3 rounded-lg text-center relative overflow-hidden">
                <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-success animate-pulse" />
                <div className="text-2xl font-black text-success">{Object.keys(onlineUsers).length}</div>
                <div className="text-[10px] font-mono text-on-surface-variant uppercase mt-1">{t('adminLiveOnline')}</div>
              </div>
            </div>
            
            <div className="border-t border-surface-container-high pt-3">
              <p className="text-[10px] font-mono text-on-surface-variant uppercase tracking-wider mb-2">{t('adminActivePlayersLive')}</p>
              {Object.keys(onlineUsers).length === 0 ? (
                <p className="text-xs text-on-surface-variant text-center py-4">{t('adminNoOneOnline')}</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                  {Object.values(onlineUsers).map(u => (
                    <div key={u.id} className="flex items-center gap-2 bg-surface-container-lowest border border-surface-container-high rounded-lg p-2">
                      <div className="w-6 h-6 rounded-full bg-surface-container-high overflow-hidden shrink-0 border border-success/30">
                        {u.avatar_url ? (
                          <img src={u.avatar_url} className="w-full h-full object-cover"  loading="lazy" />
                        ) : (
                          <span className="w-full h-full flex items-center justify-center text-[10px] font-bold">{u.username?.[0]?.toUpperCase()}</span>
                        )}
                      </div>
                      <span className="text-xs font-medium text-on-surface truncate flex-1">{u.username}</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-success shadow-[0_0_8px_rgba(var(--success-rgb),0.4)]"></span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Globaler Tipp-Toggle */}
            <div className="border-t border-surface-container-high pt-3">
              <p className="text-[10px] font-mono text-on-surface-variant uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Settings size={12} className="text-primary-fixed-dim" />
                {t('adminTippRelease')}
              </p>
              <TippsFreigabeToggle />
            </div>

            {/* Broadcast an alle User */}
            <div className="border-t border-surface-container-high pt-3">
              <p className="text-[10px] font-mono text-on-surface-variant uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Megaphone size={12} className="text-primary-fixed-dim" />
                {t('adminSendBroadcast')}
              </p>
              <textarea
                value={broadcastMessage}
                onChange={e => setBroadcastMessage(e.target.value)}
                placeholder={t('adminBroadcastPlaceholder')}
                className="w-full bg-black/30 border border-outline-variant rounded-lg px-3 py-2.5 text-on-surface font-mono text-xs focus:border-error/50 focus:outline-none resize-none h-20 mb-3"
              />
              <button
                onClick={handleSendBroadcast}
                disabled={!broadcastMessage.trim() || sendingBroadcast}
                className="w-full bg-error-container hover:bg-error-container/80 border border-error/20 text-error py-2.5 rounded-lg font-mono text-xs font-bold uppercase tracking-wider transition-all active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              >
                {sendingBroadcast ? t('adminSending') : t('adminSendToAll')}
              </button>
              {broadcastResult && (
                <p className={`text-[10px] font-mono mt-2 ${broadcastResult.type === 'success' ? 'text-success' : 'text-error'}`}>
                  {broadcastResult.text}
                </p>
              )}
            </div>

            {/* Sync Match Results */}
            <div className="border-t border-surface-container-high pt-3">
              <p className="text-[10px] font-mono text-on-surface-variant uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <RefreshCw size={12} className="text-primary-fixed-dim" />
                {t('adminUpdateResults')}
              </p>
              <button
                onClick={handleSyncResults}
                disabled={syncingResults}
                className="w-full bg-success-container hover:bg-success-container/80 border border-success/20 text-success py-2.5 rounded-lg font-mono text-xs font-bold uppercase tracking-wider transition-all active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              >
                {syncingResults ? `🔄 ${t('adminUpdating')}` : `⚡ ${t('adminFetchAllResults')}`}
              </button>
              {syncResult && (
                <div className={`mt-2 p-2 rounded-lg border text-[10px] font-mono ${
                  syncResult.type === 'success'
                    ? 'bg-success-container border border-success/20 text-success'
                    : 'bg-error-container border border-error/20 text-error'
                }`}>
                  <p className="font-bold mb-1">{syncResult.text}</p>
                  {syncResult.details && syncResult.details.length > 0 && (
                    <ul className="space-y-0.5 text-[9px] opacity-80">
                      {syncResult.details.map((d, i) => (
                        <li key={i}>{d}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {adminTab === 'create' && (
          <>
            <div>
              <label className="block text-[10px] font-mono text-on-surface-variant uppercase tracking-wider mb-1">{t('adminAutoLeagueAssignment')}</label>
              <select
                value={selectedLeagueId}
                onChange={e => setSelectedLeagueId(e.target.value)}
                className="w-full bg-surface-container-lowest border border-surface-container-high rounded-lg px-3 py-2 text-xs text-on-surface focus:border-primary outline-none"
              >
                <option value="">{t('adminNoLeagueOption')}</option>
                {allLeagues.map(l => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>

            <div className="flex bg-surface-container p-[2px] rounded-lg mb-2">
              <button
                onClick={() => setAdminCreateSubTab('manual')}
                className={`flex-1 py-1 text-[10px] font-mono uppercase rounded-md transition-all ${adminCreateSubTab === 'manual' ? 'bg-surface-container-high text-on-surface' : 'text-on-surface-variant/60'}`}
              >
                {t('adminSubTabManual')}
              </button>
              <button
                onClick={() => setAdminCreateSubTab('auto')}
                className={`flex-1 py-1 text-[10px] font-mono uppercase rounded-md transition-all ${adminCreateSubTab === 'auto' ? 'bg-surface-container-high text-on-surface' : 'text-on-surface-variant/60'}`}
              >
                {t('adminSubTabAuto')}
              </button>
            </div>

            {adminCreateSubTab === 'manual' ? (
              <div className="space-y-3">
                <p className="text-xs text-on-surface font-medium">{t('adminCreateUserManually')}</p>
                <input type="text" value={newUsername} onChange={e => setNewUsername(e.target.value)} placeholder={t('adminPlaceholderUsername')} className="w-full bg-surface-container-lowest border border-surface-container-high rounded-lg px-3 py-2 text-sm text-on-surface focus:border-primary outline-none" />
                <input type="text" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder={t('adminPlaceholderPassword')} className="w-full bg-surface-container-lowest border border-surface-container-high rounded-lg px-3 py-2 text-sm text-on-surface focus:border-primary outline-none font-mono" />
                <button onClick={handleCreateUser} disabled={creatingUser || !newUsername.trim() || !newPassword.trim()} className="w-full bg-primary-container text-on-primary py-2.5 rounded-lg font-mono text-xs font-bold uppercase hover:opacity-90 disabled:opacity-30">{creatingUser ? t('adminCreating') : t('adminBtnCreateUser')}</button>
              </div>
            ) : (
              <div className="space-y-3">
                <button
                  onClick={handleQuickCreate}
                  disabled={creatingUser}
                  className="w-full bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 py-2.5 rounded-lg font-mono text-xs font-bold uppercase transition-all disabled:opacity-30"
                >
                  {t('adminBtnQuickCreate')}
                </button>
                <div className="border-t border-surface-container-high pt-3">
                  <p className="text-[10px] text-on-surface-variant uppercase tracking-wider mb-2">{t('adminBatchCreation')}</p>
                  <div className="flex gap-2">
                    <input
                      type="number" min="1" max="20" value={batchCount}
                      onChange={e => setBatchCount(Math.min(20, Math.max(1, parseInt(e.target.value) || 1)))}
                      className="w-20 bg-surface-container-lowest border border-surface-container-high rounded-lg px-3 py-2 text-sm text-center text-on-surface focus:border-primary outline-none font-mono"
                    />
                    <button
                      onClick={handleBatchCreate}
                      disabled={creatingUser}
                      className="flex-1 bg-primary-container text-on-primary py-2.5 rounded-lg font-mono text-xs font-bold uppercase hover:opacity-90 disabled:opacity-30"
                    >
                      {t('adminBtnBatchCreate')}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {adminTab === 'manage_users' && (
          <div className="space-y-4">
            {/* Offene Reset-Anfragen */}
            <div className="bg-surface-container border border-surface-container-high rounded-xl p-3.5 space-y-2">
              <p className="text-[10px] font-mono text-primary uppercase tracking-wider font-bold mb-1">
                {t('adminPendingRequests')}
              </p>
              {loadingRequests ? (
                <div className="flex justify-center py-2"><div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
              ) : pendingRequests.length === 0 ? (
                <p className="text-xs text-on-surface-variant/80 py-2 text-center">{t('adminNoPendingRequests')}</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                  {pendingRequests.map(req => (
                    <div key={req.id} className="flex flex-col gap-2 p-2.5 rounded bg-surface-container-lowest border border-surface-container-high text-xs text-left">
                      <div className="flex justify-between items-start font-mono">
                        <div>
                          <span className="text-on-surface font-bold">{req.username}</span>
                          {req.email_hint && (
                            <div className="text-[10px] text-on-surface-variant mt-0.5">
                              Hint: <span className="text-primary-fixed-dim">{req.email_hint}</span>
                            </div>
                          )}
                        </div>
                        <span className="text-[9px] text-on-surface-variant/60">{new Date(req.created_at).toLocaleDateString()}</span>
                      </div>
                      <div className="flex gap-2 mt-1">
                        <button
                          onClick={() => handleApproveRequest(req.id, req.username)}
                          className="flex-1 bg-success-container hover:bg-success-container/80 border border-success/20 text-success py-1.5 rounded font-mono text-[9px] uppercase font-bold tracking-wider transition-all cursor-pointer"
                        >
                          {t('adminApproveReset')}
                        </button>
                        <button
                          onClick={() => handleRejectRequest(req.id, req.username)}
                          className="bg-error-container hover:bg-error-container/80 border border-error/20 text-error px-3 py-1.5 rounded font-mono text-[9px] uppercase font-bold tracking-wider transition-all cursor-pointer"
                        >
                          {t('adminRejectReset')}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Manuelles Passwort Zurücksetzen */}
            <div className="space-y-2 pt-2 border-t border-surface-container-high">
              <p className="text-[10px] font-mono text-on-surface-variant uppercase tracking-wider mb-1">{t('adminResetPasswordTitle')}</p>
              <input type="text" value={targetUsername} onChange={e => setTargetUsername(e.target.value)} placeholder={t('adminPlaceholderUserToReset')} className="w-full bg-surface-container-lowest border border-surface-container-high rounded-lg px-3 py-2 text-sm text-on-surface focus:border-primary outline-none" />
              <input type="text" value={resetPassword} onChange={e => setResetPassword(e.target.value)} placeholder={t('adminPlaceholderNewPassword')} className="w-full bg-surface-container-lowest border border-surface-container-high rounded-lg px-3 py-2 text-sm text-on-surface focus:border-primary outline-none font-mono" />
              <button 
                onClick={() => handleAdminResetPassword(targetUsername, resetPassword)} 
                disabled={creatingUser || !targetUsername.trim() || !resetPassword.trim()} 
                className="w-full bg-primary-container text-on-primary py-2.5 rounded-lg font-mono text-xs font-bold uppercase hover:opacity-90 disabled:opacity-30 cursor-pointer"
              >
                {t('adminBtnOverwritePassword')}
              </button>
            </div>
            
            <div className="border-t border-surface-container-high pt-4 space-y-2">
              <p className="text-[10px] font-mono text-error uppercase tracking-wider mb-1">{t('adminDangerZone')}</p>
              <input type="text" value={targetUsername} onChange={e => setTargetUsername(e.target.value)} placeholder={t('adminPlaceholderUserToReset')} className="w-full bg-surface-container-lowest border border-error/30 rounded-lg px-3 py-2 text-sm text-on-surface focus:border-error outline-none" />
              <button 
                onClick={() => handleAdminDeleteUser(targetUsername)} 
                disabled={creatingUser || !targetUsername.trim()} 
                className="w-full bg-error-container text-error border border-error/20 py-2.5 rounded-lg font-mono text-xs font-bold uppercase hover:bg-error-container/80 disabled:opacity-30 cursor-pointer"
              >
                {t('adminBtnDeleteUser')}
              </button>
            </div>
          </div>
        )}

        {adminTab === 'manage_leagues' && (
          <div className="space-y-4">
            <p className="text-[10px] font-mono text-on-surface-variant uppercase tracking-wider mb-1">{t('adminManageDeleteLeagues')}</p>
            {allLeagues.length === 0 ? (
              <p className="text-xs text-on-surface-variant text-center py-4">{t('adminNoLeaguesYet')}</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                {allLeagues.map(l => (
                  <div key={l.id} className="flex items-center justify-between bg-surface-container-lowest border border-surface-container-high rounded-lg p-2">
                    <span className="text-xs font-medium text-on-surface truncate">{l.name}</span>
                    <button
                      onClick={() => handleAdminDeleteLeague(l.id, l.name)}
                      disabled={creatingUser}
                      className="p-1.5 text-error hover:bg-error-container/50 rounded transition-colors cursor-pointer"
                      title={t('close')}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {adminTab === 'manage_matches' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-1">
              <p className="text-[10px] font-mono text-on-surface-variant uppercase tracking-wider">{t('adminMatchCorrectionTitle')}</p>
              <button onClick={fetchAdminMatches} className="text-[9px] font-mono uppercase text-primary hover:opacity-80">{t('adminReload')}</button>
            </div>
            
            {loadingMatches ? (
              <div className="flex justify-center py-4"><div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
                {adminMatches.map(m => (
                  <AdminMatchRow key={m.id} m={m} handleUpdateMatch={handleUpdateMatch} />
                ))}
              </div>
            )}
          </div>
        )}

        {adminTab === 'push_test' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-on-surface mb-2">Globale Push-Nachricht senden</h3>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] uppercase font-mono text-on-surface-variant mb-1 block">Titel</label>
                <input
                  type="text"
                  value={pushTitle}
                  onChange={(e) => setPushTitle(e.target.value)}
                  className="w-full bg-surface-container border border-surface-container-high rounded-lg px-3 py-2 text-sm text-on-surface focus:border-primary outline-none"
                  placeholder="Push Titel"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase font-mono text-on-surface-variant mb-1 block">Nachricht</label>
                <textarea
                  value={pushBody}
                  onChange={(e) => setPushBody(e.target.value)}
                  className="w-full bg-surface-container border border-surface-container-high rounded-lg px-3 py-2 text-sm text-on-surface focus:border-primary outline-none"
                  placeholder="Push Nachricht..."
                  rows={3}
                />
              </div>
              <button
                onClick={async () => {
                  if (!pushTitle.trim() || !pushBody.trim()) return
                  setPushSending(true)
                  setPushResult(null)
                  try {
                    const { data: { session } } = await supabase.auth.getSession()
                    const token = session?.access_token
                    if (!token) throw new Error('No auth token')
                    
                    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-push`, {
                      method: 'POST',
                      headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                      },
                      body: JSON.stringify({
                        broadcast: true,
                        title: pushTitle,
                        body: pushBody,
                        url: '/'
                      })
                    })
                    const result = await res.json()
                    if (!res.ok) throw new Error(result.error || 'Fehler beim Senden')
                    
                    setPushResult({ type: 'success', text: `Push erfolgreich versendet (${result.results?.length || 0} Empfänger)!` })
                  } catch (err: any) {
                    setPushResult({ type: 'error', text: err.message })
                  } finally {
                    setPushSending(false)
                  }
                }}
                disabled={pushSending || !pushTitle.trim() || !pushBody.trim()}
                className="w-full bg-primary text-on-primary py-2.5 rounded-lg font-bold text-sm uppercase tracking-wider hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {pushSending ? 'Sende...' : 'Jetzt pushen'}
              </button>
              
              {pushResult && (
                <div className={`p-3 rounded-lg text-xs mt-4 ${pushResult.type === 'success' ? 'bg-success-container text-success border border-success/20' : 'bg-error/10 text-error border border-error/20'}`}>
                  {pushResult.text}
                </div>
              )}
            </div>
          </div>
        )}

        {adminMsg && (
          <div className={`flex items-start gap-2 p-2 rounded-lg text-[10px] font-mono leading-tight ${adminMsg.type === 'success' ? 'bg-success-container text-success' : 'bg-error/10 text-error'}`}>
            {adminMsg.type === 'success' ? <Check size={14} className="mt-0.5 flex-shrink-0" /> : <X size={14} className="mt-0.5 flex-shrink-0" />}
            <span>{adminMsg.text}</span>
          </div>
        )}

        {/* Liste neu erstellter Benutzer */}
        {createdUsersList.length > 0 && (
          <div className="mt-3 border-t border-surface-container-high pt-3 space-y-2">
            <p className="text-[10px] font-mono text-on-surface-variant uppercase tracking-wider">{t('adminCreatedUsersList', { count: createdUsersList.length })}</p>
            <div className="space-y-1.5 max-h-48 overflow-y-auto no-scrollbar">
              {createdUsersList.map((usr, index) => (
                <div key={index} className="flex items-center justify-between p-2 rounded bg-surface-container-lowest border border-surface-container-high text-xs">
                  <div className="font-mono min-w-0 flex-1 pr-2 text-left">
                    <div className="truncate text-on-surface"><span className="text-on-surface-variant">User:</span> {usr.username}</div>
                    <div className="truncate text-on-surface-variant mt-0.5"><span className="text-on-surface-variant">Pass:</span> <span className="text-primary font-bold">{usr.password}</span></div>
                  </div>
                  <button
                    onClick={() => handleCopyUserCreds(usr.username, usr.password, index)}
                    className="p-1.5 hover:bg-surface-container rounded text-on-surface-variant hover:text-primary transition-all flex-shrink-0 cursor-pointer"
                    title={t('copy')}
                  >
                    {copiedIndex === index ? <Check size={14} className="text-success" /> : <Copy size={14} />}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

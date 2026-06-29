import { useState, type ChangeEvent } from 'react'
import { Shield, Check, X, Copy } from 'lucide-react'
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
  adminTab: 'overview' | 'create' | 'manage_users' | 'manage_leagues' | 'manage_matches'
  setAdminTab: (tab: 'overview' | 'create' | 'manage_users' | 'manage_leagues' | 'manage_matches') => void
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
                <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <div className="text-2xl font-black text-green-400">{Object.keys(onlineUsers).length}</div>
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
                      <div className="w-6 h-6 rounded-full bg-surface-container-high overflow-hidden shrink-0 border border-green-500/30">
                        {u.avatar_url ? (
                          <img src={u.avatar_url} className="w-full h-full object-cover" />
                        ) : (
                          <span className="w-full h-full flex items-center justify-center text-[10px] font-bold">{u.username?.[0]?.toUpperCase()}</span>
                        )}
                      </div>
                      <span className="text-xs font-medium text-on-surface truncate flex-1">{u.username}</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]"></span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Globaler Tipp-Toggle */}
            <div className="border-t border-surface-container-high pt-3">
              <p className="text-[10px] font-mono text-on-surface-variant uppercase tracking-wider mb-2">⚙️ Tipp-Freigabe</p>
              <TippsFreigabeToggle />
            </div>

            {/* Broadcast an alle User */}
            <div className="border-t border-surface-container-high pt-3">
              <p className="text-[10px] font-mono text-on-surface-variant uppercase tracking-wider mb-2">📢 {language === 'tr' ? 'Duyuru Gönder' : language === 'en' ? 'Send Broadcast' : 'Broadcast senden'}</p>
              <textarea
                value={broadcastMessage}
                onChange={e => setBroadcastMessage(e.target.value)}
                placeholder={language === 'tr' ? 'Tüm kullanıcılara mesaj...' : language === 'en' ? 'Message to all users...' : 'Nachricht an alle User...'}
                className="w-full bg-black/30 border border-outline-variant rounded-lg px-3 py-2.5 text-on-surface font-mono text-xs focus:border-red-500/50 focus:outline-none resize-none h-20 mb-3"
              />
              <button
                onClick={handleSendBroadcast}
                disabled={!broadcastMessage.trim() || sendingBroadcast}
                className="w-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 py-2.5 rounded-lg font-mono text-xs font-bold uppercase tracking-wider transition-all active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {sendingBroadcast
                  ? (language === 'tr' ? 'Gönderiliyor...' : language === 'en' ? 'Sending...' : 'Sende...')
                  : (language === 'tr' ? 'Herkese Gönder' : language === 'en' ? 'Send to All' : 'An Alle senden')}
              </button>
              {broadcastResult && (
                <p className={`text-[10px] font-mono mt-2 ${broadcastResult.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                  {broadcastResult.text}
                </p>
              )}
            </div>

            {/* Sync Match Results */}
            <div className="border-t border-surface-container-high pt-3">
              <p className="text-[10px] font-mono text-on-surface-variant uppercase tracking-wider mb-2">
                🔄 {language === 'tr' ? 'Sonuçları Güncelle' : language === 'en' ? 'Update Results' : 'Ergebnisse aktualisieren'}
              </p>
              <button
                onClick={handleSyncResults}
                disabled={syncingResults}
                className="w-full bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 text-green-400 py-2.5 rounded-lg font-mono text-xs font-bold uppercase tracking-wider transition-all active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {syncingResults
                  ? (language === 'tr' ? '🔄 Güncelleniyor...' : language === 'en' ? '🔄 Updating...' : '🔄 Aktualisiere...')
                  : (language === 'tr' ? '⚡ Tüm Sonuçları Getir' : language === 'en' ? '⚡ Fetch All Results' : '⚡ Alle Ergebnisse abrufen')}
              </button>
              {syncResult && (
                <div className={`mt-2 p-2 rounded-lg border text-[10px] font-mono ${
                  syncResult.type === 'success'
                    ? 'bg-green-500/5 border-green-500/20 text-green-400'
                    : 'bg-red-500/5 border-red-500/20 text-red-400'
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
                          className="flex-1 bg-green-500/10 hover:bg-green-500/15 border border-green-500/20 text-green-400 py-1.5 rounded font-mono text-[9px] uppercase font-bold tracking-wider transition-all cursor-pointer"
                        >
                          {t('adminApproveReset')}
                        </button>
                        <button
                          onClick={() => handleRejectRequest(req.id, req.username)}
                          className="bg-red-500/10 hover:bg-red-500/15 border border-red-500/20 text-red-400 px-3 py-1.5 rounded font-mono text-[9px] uppercase font-bold tracking-wider transition-all cursor-pointer"
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
              <p className="text-[10px] font-mono text-red-400 uppercase tracking-wider mb-1">{t('adminDangerZone')}</p>
              <input type="text" value={targetUsername} onChange={e => setTargetUsername(e.target.value)} placeholder={t('adminPlaceholderUserToReset')} className="w-full bg-surface-container-lowest border border-red-500/30 rounded-lg px-3 py-2 text-sm text-on-surface focus:border-red-500 outline-none" />
              <button 
                onClick={() => handleAdminDeleteUser(targetUsername)} 
                disabled={creatingUser || !targetUsername.trim()} 
                className="w-full bg-red-500/10 text-red-400 border border-red-500/20 py-2.5 rounded-lg font-mono text-xs font-bold uppercase hover:bg-red-500/20 disabled:opacity-30 cursor-pointer"
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
                      className="p-1.5 text-red-400 hover:bg-red-500/10 rounded transition-colors"
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

        {adminMsg && (
          <div className={`flex items-start gap-2 p-2 rounded-lg text-[10px] font-mono leading-tight ${adminMsg.type === 'success' ? 'bg-green-500/10 text-green-400' : 'bg-error/10 text-error'}`}>
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
                    className="p-1.5 hover:bg-surface-container rounded text-on-surface-variant hover:text-primary transition-all flex-shrink-0"
                    title={t('copy')}
                  >
                    {copiedIndex === index ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
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

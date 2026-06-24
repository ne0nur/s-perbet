import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { supabase } from '../lib/supabase'
import { useToastStore } from '../stores/toastStore'
import { Trophy, User, Lock, ArrowRight, Eye, EyeOff, ChevronLeft, Sparkles, ShieldAlert } from 'lucide-react'
import { useLanguageStore } from '../stores/languageStore'
import { useTranslation } from '../utils/translations'
import { HeaderLogo } from '../components/HeaderLogo'

type AuthView = 'login' | 'invite' | 'ask-account' | 'onboarding'

export function LoginPage() {
  const { t, language } = useTranslation()
  const { setLanguage } = useLanguageStore()
  const [view, setView] = useState<AuthView>('login')
  
  // Login states
  const [username, setUsername] = useState('')
  const [passwort, setPasswort] = useState('')
  const [zeigePasswort, setZeigePasswort] = useState(false)
  const [shake, setShake] = useState(false)
  
  // Invite flow states
  const [inviteCode, setInviteCode] = useState('')
  const [inviteLeague, setInviteLeague] = useState<{ id: string; name: string } | null>(null)
  const [pendingLeagueId, setPendingLeagueId] = useState<string | null>(null)
  const [validatingCode, setValidatingCode] = useState(false)
  
  // Registration states
  const [regUsername, setRegUsername] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regPasswordConfirm, setRegPasswordConfirm] = useState('')
  const [zeigeRegPassword, setZeigeRegPassword] = useState(false)
  const [localFehler, setLocalFehler] = useState<string | null>(null)
  
  const { login, fehler, isLaden, isEingeloggt } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (isEingeloggt) navigate('/dashboard')
  }, [isEingeloggt, navigate])

  // Shake-Animation bei Login-Fehlern
  useEffect(() => {
    if (fehler) {
      setShake(true)
      const t = setTimeout(() => setShake(false), 500)
      return () => clearTimeout(t)
    }
  }, [fehler])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username || !passwort) return
    try {
      await login(username, passwort)
      
      // Falls eine ausstehende Liga vorhanden ist, treten wir ihr nach dem Login bei
      if (pendingLeagueId) {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          // Prüfen ob bereits Mitglied
          const { data: member } = await supabase
            .from('league_members')
            .select('*')
            .eq('league_id', pendingLeagueId)
            .eq('user_id', user.id)
            .single()

          if (!member) {
            await supabase.from('league_members').insert({
              league_id: pendingLeagueId,
              user_id: user.id
            })
            useToastStore.getState().toast(t('leagueJoinedSuccess'))
          }
        }
      }
    } catch { /* Silently ignore invite check errors */ }
  }

  // Einladungscode prüfen
  const handleValidateCode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteCode.trim()) return
    setValidatingCode(true)
    setLocalFehler(null)
    
    try {
      const cleanCode = inviteCode.trim().toUpperCase()

      // Try the secure RPC endpoint first (bypasses RLS for unauthenticated users safely)
      const { data: rpcData, error: rpcError } = await supabase
        .rpc('check_invite_code', { p_invite_code: cleanCode })

      if (!rpcError && rpcData && rpcData.length > 0) {
        setInviteLeague({ id: rpcData[0].league_id, name: rpcData[0].league_name })
        localStorage.setItem('superbet_pending_league_id', rpcData[0].league_id)
        setView('ask-account')
        return
      }
      
      // Fallback to direct select query if RPC does not exist
      const { data: league, error } = await supabase
        .from('leagues')
        .select('id, name')
        .eq('invite_code', cleanCode)
        .single()

      if (error || !league) {
        setLocalFehler(t('invalidCode'))
        return
      }

      setInviteLeague(league)
      localStorage.setItem('superbet_pending_league_id', league.id)
      setView('ask-account')
    } catch {
      setLocalFehler(t('invalidCode'))
    } finally {
      setValidatingCode(false)
    }
  }

  // Registrierung und Ligabeitritt
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalFehler(null)
    
    const cleanUser = regUsername.trim().toLowerCase()
    if (!cleanUser) {
      setLocalFehler(t('usernameEmpty'))
      return
    }
    if (cleanUser.length < 3) {
      setLocalFehler(t('usernameMin'))
      return
    }
    if (regPassword.length < 6) {
      setLocalFehler(t('passwordMin'))
      return
    }
    if (regPassword !== regPasswordConfirm) {
      setLocalFehler(t('passwordsMismatch'))
      return
    }

    try {
      // 1. Prüfen ob Benutzername existiert
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', cleanUser)
        .limit(1)

      if (existing && existing.length > 0) {
        setLocalFehler(t('usernameTaken'))
        return
      }

      // 2. Auth SignUp ausführen
      const email = `${cleanUser}@gmail.com`
      const { data: authResult, error: signupError } = await supabase.auth.signUp({
        email,
        password: regPassword,
        options: {
          data: { username: cleanUser }
        }
      })

      if (signupError || !authResult.user) {
        throw new Error(signupError?.message || (language === 'tr' ? 'Kayıt başarısız.' : language === 'en' ? 'Registration failed.' : 'Registrierung fehlgeschlagen.'))
      }

      // 3. Dem User das Profil aktualisieren (Trigger hat bereits gearbeitet, wir setzen Profil up)
      await supabase.from('profiles').update({
        username: cleanUser,
        muss_passwort_aendern: false
      }).eq('id', authResult.user.id)

      // 4. Der Liga beitreten
      if (inviteLeague) {
        await supabase.from('league_members').insert({
          league_id: inviteLeague.id,
          user_id: authResult.user.id
        })
        useToastStore.getState().toast(t('registerAndJoinSuccess', { name: inviteLeague.name }))
      } else {
        useToastStore.getState().toast(t('registerSuccess'))
      }

      // Da supabase.auth.signUp bei korrekter Konfiguration sofort einloggt,
      // lauscht authStore per onAuthStateChange darauf und leitet weiter.
      // Falls nicht, forcen wir den Login
      await login(cleanUser, regPassword)
    } catch (err: unknown) {
      setLocalFehler(err instanceof Error ? err.message : 'Fehler bei der Registrierung.')
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 animate-page-enter relative">
      {/* Floating Language Switcher */}
      <div className="absolute top-4 right-4 flex items-center gap-1 bg-surface-container-high/45 border border-white/5 rounded-full p-1 backdrop-blur-md z-50">
        {(['de', 'en', 'tr'] as const).map((lang) => (
          <button
            key={lang}
            type="button"
            onClick={() => setLanguage(lang)}
            className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase transition-all ${
              language === lang
                ? 'bg-primary-container text-on-primary-container shadow-[0_0_8px_rgba(251,191,36,0.25)]'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {lang}
          </button>
        ))}
      </div>

      {/* Logo-Sektion */}
      <div className="mb-8 text-center select-none">
        <div className="w-16 h-16 rounded-full bg-primary-container/10 flex items-center justify-center mx-auto mb-4 shadow-[0_0_30px_rgba(251,191,36,0.08)]">
          <Trophy size={28} className="text-primary-fixed-dim" />
        </div>
        <div className="superbet-header-logo mb-1 scale-125 origin-center">
          <HeaderLogo />
        </div>
        <p className="text-on-surface-variant/50 text-[9px] mt-1 font-mono tracking-[0.25em] uppercase">
          {t('saisonPredictionLeagueSubtitle')}
        </p>
      </div>

      <div className="w-full max-w-sm">
        {/* LOGIN-ANSICHT */}
        {view === 'login' && (
          <form
            onSubmit={handleLogin}
            className={`glass-panel rounded-2xl p-6 space-y-4 text-left ${shake ? 'animate-shake' : ''}`}
          >
            <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
              <h2 className="text-sm font-bold text-on-surface uppercase font-mono tracking-wider">{t('loginTitle')}</h2>
              {pendingLeagueId && (
                <div className="text-[9px] font-mono bg-primary-container/15 text-primary border border-primary-container/30 px-2 py-0.5 rounded">
                  {t('pendingLeagueJoin')}
                </div>
              )}
            </div>

            <div>
              <label className="block text-[10px] font-mono text-on-surface-variant mb-1.5 uppercase tracking-wider">
                {t('username')}
              </label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/70" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="dein_username"
                  className="w-full bg-black/30 border border-outline-variant rounded-md px-10 py-2.5 text-on-surface
                             font-mono text-sm focus:border-primary-container focus:outline-none focus:shadow-[0_0_10px_rgba(251,191,36,0.2)]
                             transition-all duration-200"
                  required autoFocus autoComplete="username"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-mono text-on-surface-variant mb-1.5 uppercase tracking-wider">
                {t('password')}
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/70" />
                <input
                  type={zeigePasswort ? 'text' : 'password'}
                  value={passwort}
                  onChange={(e) => setPasswort(e.target.value)}
                  placeholder="••••••"
                  className="w-full bg-black/30 border border-outline-variant rounded-md px-10 py-2.5 text-on-surface
                             font-mono text-sm focus:border-primary-container focus:outline-none focus:shadow-[0_0_10px_rgba(251,191,36,0.2)]
                             transition-all duration-200"
                  required autoComplete="current-password"
                />
                <button type="button" onClick={() => setZeigePasswort(!zeigePasswort)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors">
                  {zeigePasswort ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {fehler && (
              <p className="text-error text-[10px] font-mono bg-error-container/10 rounded-md px-3 py-2 border border-error/20 flex items-start gap-1.5">
                <ShieldAlert size={14} className="mt-0.5 shrink-0" />
                <span>{fehler}</span>
              </p>
            )}

            <button type="submit" disabled={!username || !passwort || isLaden}
              className="w-full bg-primary-container text-on-primary font-bold text-xs py-3 rounded-md uppercase tracking-wider
                         shadow-[0_0_15px_rgba(251,191,36,0.15)] active:scale-95 transition-all duration-150
                         disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              {isLaden ? (
                <div className="w-4 h-4 border-2 border-on-primary border-t-transparent rounded-full animate-spin" />
              ) : (
                <>{t('loginTitle')} <ArrowRight size={14} /></>
              )}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => { setView('invite'); setLocalFehler(null); }}
                className="text-[10px] text-primary-fixed-dim hover:underline font-mono uppercase tracking-wider"
              >
                {t('inviteFlowBtn')}
              </button>
            </div>
          </form>
        )}

        {/* EINLADUNGSCODE-VALIDIERUNG */}
        {view === 'invite' && (
          <form
            onSubmit={handleValidateCode}
            className="glass-panel rounded-2xl p-6 space-y-4 text-left animate-page-enter"
          >
            <div className="flex items-center gap-2 border-b border-white/5 pb-2.5">
              <button
                type="button"
                onClick={() => setView('login')}
                className="p-1 hover:bg-white/5 rounded text-on-surface-variant hover:text-on-surface transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <h2 className="text-sm font-bold text-on-surface uppercase font-mono tracking-wider">{t('inviteCode')}</h2>
            </div>

            <p className="text-[11px] text-on-surface-variant font-mono leading-relaxed">
              {t('inviteCodeDesc')}
            </p>

            <div>
              <label className="block text-[10px] font-mono text-on-surface-variant mb-1.5 uppercase tracking-wider">
                {t('enterCodeLabel')}
              </label>
              <input
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                placeholder="LIG-XXXXXX"
                className="w-full bg-black/30 border border-outline-variant rounded-md px-4 py-2.5 text-on-surface
                           font-mono text-sm uppercase text-center focus:border-primary-container focus:outline-none focus:shadow-[0_0_10px_rgba(251,191,36,0.2)]
                           transition-all duration-200"
                required autoFocus
              />
            </div>

            {localFehler && (
              <p className="text-error text-[10px] font-mono bg-error-container/10 rounded-md px-3 py-2 border border-error/20 flex items-start gap-1.5">
                <ShieldAlert size={14} className="mt-0.5 shrink-0" />
                <span>{localFehler}</span>
              </p>
            )}

            <button type="submit" disabled={!inviteCode.trim() || validatingCode}
              className="w-full bg-primary-container text-on-primary font-bold text-xs py-3 rounded-md uppercase tracking-wider
                         shadow-[0_0_15px_rgba(251,191,36,0.15)] active:scale-95 transition-all duration-150
                         disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              {validatingCode ? (
                <div className="w-4 h-4 border-2 border-on-primary border-t-transparent rounded-full animate-spin" />
              ) : (
                <>{t('validateCode')} <ArrowRight size={14} /></>
              )}
            </button>
          </form>
        )}

        {/* FRAGE: ACCOUNT BEREITS VORHANDEN? */}
        {view === 'ask-account' && inviteLeague && (
          <div className="glass-panel rounded-2xl p-6 space-y-4 text-left animate-page-enter">
            <div className="flex items-center gap-2 border-b border-white/5 pb-2.5">
              <button
                type="button"
                onClick={() => setView('invite')}
                className="p-1 hover:bg-white/5 rounded text-on-surface-variant hover:text-on-surface transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <h2 className="text-sm font-bold text-on-surface uppercase font-mono tracking-wider">{t('joinLeagueTitle')}</h2>
            </div>

            <div className="p-3 bg-primary-container/10 border border-primary-container/20 rounded-xl flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary-container/15 flex items-center justify-center text-lg shrink-0">⚽</div>
              <div className="min-w-0">
                <p className="text-[10px] font-mono uppercase tracking-wider text-primary">{t('leagueFound')}</p>
                <p className="text-xs font-bold text-on-surface truncate">{inviteLeague.name}</p>
              </div>
            </div>

            <p className="text-[11px] text-on-surface-variant font-mono leading-relaxed">
              {t('haveAccount')}
            </p>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setPendingLeagueId(inviteLeague.id)
                  if (inviteLeague) {
                    localStorage.setItem('superbet_pending_league_id', inviteLeague.id)
                  }
                  setView('login')
                  useToastStore.getState().toast(t('loginToJoin', { name: inviteLeague.name }))
                }}
                className="w-full bg-surface-container-high border border-white/10 hover:border-white/20 text-on-surface font-bold text-xs py-3 rounded-md uppercase tracking-wider active:scale-95 transition-all text-center"
              >
                {t('loginAndJoin')}
              </button>
              
              <button
                type="button"
                onClick={() => setView('onboarding')}
                className="w-full bg-primary-container text-on-primary font-bold text-xs py-3 rounded-md uppercase tracking-wider shadow-[0_0_15px_rgba(251,191,36,0.1)] active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                {t('noAccount')} <Sparkles size={14} />
              </button>
            </div>
          </div>
        )}

        {/* ONBOARDING REGISTRIERUNG */}
        {view === 'onboarding' && inviteLeague && (
          <form
            onSubmit={handleRegister}
            className="glass-panel rounded-2xl p-6 space-y-4 text-left animate-page-enter"
          >
            <div className="flex items-center gap-2 border-b border-white/5 pb-2.5">
              <button
                type="button"
                onClick={() => setView('ask-account')}
                className="p-1 hover:bg-white/5 rounded text-on-surface-variant hover:text-on-surface transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <h2 className="text-sm font-bold text-on-surface uppercase font-mono tracking-wider">{t('registerTitle')}</h2>
            </div>

            <p className="text-[10px] font-mono text-on-surface-variant/80">
              {t('joinAsMemberOf')} <span className="text-primary font-bold">{inviteLeague.name}</span>
            </p>

            <div>
              <label className="block text-[10px] font-mono text-on-surface-variant mb-1.5 uppercase tracking-wider">
                {t('chooseUsername')}
              </label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/70" />
                <input
                  type="text"
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                  placeholder="ali_tippt"
                  className="w-full bg-black/30 border border-outline-variant rounded-md px-10 py-2.5 text-on-surface
                             font-mono text-sm focus:border-primary-container focus:outline-none focus:shadow-[0_0_10px_rgba(251,191,36,0.2)]
                             transition-all duration-200"
                  required autoFocus
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-mono text-on-surface-variant mb-1.5 uppercase tracking-wider">
                {t('setPassword')}
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/70" />
                <input
                  type={zeigeRegPassword ? 'text' : 'password'}
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="••••••"
                  className="w-full bg-black/30 border border-outline-variant rounded-md px-10 py-2.5 text-on-surface
                             font-mono text-sm focus:border-primary-container focus:outline-none focus:shadow-[0_0_10px_rgba(251,191,36,0.2)]
                             transition-all duration-200"
                  required
                />
                <button type="button" onClick={() => setZeigeRegPassword(!zeigeRegPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors">
                  {zeigeRegPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-mono text-on-surface-variant mb-1.5 uppercase tracking-wider">
                {t('confirmPassword')}
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/70" />
                <input
                  type={zeigeRegPassword ? 'text' : 'password'}
                  value={regPasswordConfirm}
                  onChange={(e) => setRegPasswordConfirm(e.target.value)}
                  placeholder="••••••"
                  className="w-full bg-black/30 border border-outline-variant rounded-md px-10 py-2.5 text-on-surface
                             font-mono text-sm focus:border-primary-container focus:outline-none focus:shadow-[0_0_10px_rgba(251,191,36,0.2)]
                             transition-all duration-200"
                  required
                />
              </div>
            </div>

            {localFehler && (
              <p className="text-error text-[10px] font-mono bg-error-container/10 rounded-md px-3 py-2 border border-error/20 flex items-start gap-1.5">
                <ShieldAlert size={14} className="mt-0.5 shrink-0" />
                <span>{localFehler}</span>
              </p>
            )}

            <button type="submit" disabled={isLaden}
              className="w-full bg-primary-container text-on-primary font-bold text-xs py-3 rounded-md uppercase tracking-wider
                         shadow-[0_0_15px_rgba(251,191,36,0.15)] active:scale-95 transition-all duration-150
                         disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              {isLaden ? (
                <div className="w-4 h-4 border-2 border-on-primary border-t-transparent rounded-full animate-spin" />
              ) : (
                <>{t('registerAndJoin')} <ArrowRight size={14} /></>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

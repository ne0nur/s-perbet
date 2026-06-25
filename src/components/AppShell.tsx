import { useState, useEffect } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { BottomNav } from './BottomNav'
import { ToastContainer } from './ToastContainer'
import { useAuthStore } from '../stores/authStore'
import { usePresenceStore } from '../stores/presenceStore'
import { supabase } from '../lib/supabase'
import { calculateLevelDetails, getLevelBadgeStyle } from '../lib/utils'
import { evaluateAchievements, type TipDetails } from '../utils/achievementEvaluator'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Trophy, Target, Sparkles, Award, Table2, BarChart2, Users, User, Gift, Rocket, Download, Share2 } from 'lucide-react'
import { usePwaStore } from '../stores/pwaStore'
import { useTranslation } from '../utils/translations'
import { HeaderLogo } from './HeaderLogo'
import { NetworkIndicator } from './NetworkIndicator'

/** Nur der Page-Content animiert — AppShell & BottomNav bleiben stabil */
function AnimatedOutlet() {
  const location = useLocation()
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        className="flex-1 flex flex-col"
      >
        <Outlet />
      </motion.div>
    </AnimatePresence>
  )
}

export function AppShell() {
  const { t, language } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const { user, avatarUrl } = useAuthStore()
  const [punkte, setPunkte] = useState(0)
  const { isInstallable, triggerInstall } = usePwaStore()
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [onboardingSlide, setOnboardingSlide] = useState(0)

  const [achievementsCount, setAchievementsCount] = useState(() => {
    return parseInt(localStorage.getItem('superbet_achievements_count') || '0', 10)
  })

  // Listener für Achievement-Updates
  useEffect(() => {
    const handleAchUpdate = () => {
      setAchievementsCount(parseInt(localStorage.getItem('superbet_achievements_count') || '0', 10))
    }
    window.addEventListener('achievements_updated', handleAchUpdate)
    return () => window.removeEventListener('achievements_updated', handleAchUpdate)
  }, [])

  const { level, xpCurrent, xpRequired, xpPct } = calculateLevelDetails(punkte, achievementsCount)
  const { initPresence, cleanupPresence } = usePresenceStore()

  useEffect(() => {
    if (user) {
      const completed = localStorage.getItem(`superbet_onboarding_completed_${user.id}`)
      if (!completed) {
        setShowOnboarding(true)
      }
      initPresence()

      // Auto-join pending league if set in localStorage
      const pendingLeagueId = localStorage.getItem('superbet_pending_league_id')
      if (pendingLeagueId) {
        localStorage.removeItem('superbet_pending_league_id')
        
        // Check if already a member first
        supabase
          .from('league_members')
          .select('league_id')
          .eq('league_id', pendingLeagueId)
          .eq('user_id', user.id)
          .maybeSingle()
          .then(({ data: member }) => {
            if (!member) {
              supabase
                .from('league_members')
                .insert({
                  league_id: pendingLeagueId,
                  user_id: user.id
                })
                .then(({ error: joinError }) => {
                  if (joinError) {
                    console.error('Auto-join league failed:', joinError)
                  } else {
                    // Fetch league name for custom toast message
                    supabase
                      .from('leagues')
                      .select('name')
                      .eq('id', pendingLeagueId)
                      .single()
                      .then(({ data: lg }) => {
                        window.dispatchEvent(new CustomEvent('show-toast', {
                          detail: {
                            message: t('leagueAutoJoinSuccess', { name: lg?.name || 'Tipprunde' }),
                            type: 'success'
                          }
                        }))
                      })
                  }
                })
            }
          })
      }
    } else {
      setShowOnboarding(false)
      cleanupPresence()
    }
  }, [user, initPresence, cleanupPresence, t])

  useEffect(() => {
    const handleTrigger = () => {
      setOnboardingSlide(0)
      setShowOnboarding(true)
    }
    window.addEventListener('trigger-onboarding', handleTrigger)
    return () => window.removeEventListener('trigger-onboarding', handleTrigger)
  }, [])

  const finishOnboarding = (redirectToBonus = false) => {
    if (user) {
      localStorage.setItem(`superbet_onboarding_completed_${user.id}`, 'true')
    }
    setShowOnboarding(false)
    if (redirectToBonus) {
      localStorage.setItem('superbet_open_bonus', 'true')
      navigate('/profile')
    }
  }

  const handleShare = async () => {
    const shareData = {
      title: 'SüperBET — Die private Fußball-Tipprunde',
      text: '🔥 Tippe mit uns die Süper Lig! Komm in die Tipprunde.',
      url: 'https://ne0nur.github.io/s-perbet/',
    }
    if (navigator.share) {
      try { await navigator.share(shareData) } catch {}
    } else {
      try { await navigator.clipboard.writeText(shareData.url) } catch {}
    }
  }

  useEffect(() => {
    if (!user) return
    supabase.from('profiles').select('gesamt_punkte').eq('id', user.id).single()
      .then(({ data }) => {
        if (data) {
          setPunkte(data.gesamt_punkte || 0)
        }
      })

    // Background Check for New Achievements
    const checkNewAchievements = async () => {
      try {
        const { data: profile } = await supabase.from('profiles').select('gesamt_punkte, exakte_treffer, is_admin, avatar_url, username').eq('id', user.id).single()
        if (!profile) return

        const { data: allTips } = await supabase.from('tips')
          .select('*, matches(spieltag, status, tournament, heim_team, gast_team, tore_heim, tore_gast, anpfiff)')
          .eq('user_id', user.id)

        if (allTips) {
          // Format for evaluator
          const formattedTips: TipDetails[] = allTips.map((t) => ({
            id: t.id,
            tipp_heim: t.tipp_heim,
            tipp_gast: t.tipp_gast,
            punkte: t.punkte || 0,
            created_at: t.created_at,
            updated_at: t.updated_at || t.created_at,
            match: {
              id: t.match_id,
              spieltag: t.matches?.spieltag || 1,
              status: t.matches?.status || 'upcoming',
              heim_team: t.matches?.heim_team || '',
              gast_team: t.matches?.gast_team || '',
              anpfiff: t.matches?.anpfiff || '',
              tore_heim: t.matches?.tore_heim ?? null,
              tore_gast: t.matches?.tore_gast ?? null
            }
          }))

          const unlockedSet = evaluateAchievements(formattedTips, {
            gesamt_punkte: profile.gesamt_punkte || 0,
            exakte_treffer: profile.exakte_treffer || 0,
            is_admin: profile.is_admin || false,
            rang: null,
            league_count: 0
          }, profile.avatar_url, profile.username || user.email || '')
          
          const unlockedKey = `superbet_unlocked_achievements_${user.id}`
          const savedStr = localStorage.getItem(unlockedKey)
          
          if (savedStr === null) {
            // First time tracking for this user on this device. Just save the set and do not toast.
            localStorage.setItem(unlockedKey, JSON.stringify(Array.from(unlockedSet)))
            localStorage.setItem('superbet_achievements_count', unlockedSet.size.toString())
            setAchievementsCount(unlockedSet.size)
          } else {
            const savedArray = JSON.parse(savedStr) || []
            const savedSet = new Set(savedArray)
            
            // Find newly unlocked achievements
            const newlyUnlocked = Array.from(unlockedSet).filter(id => !savedSet.has(id))
            
            if (newlyUnlocked.length > 0) {
              const diff = newlyUnlocked.length
              window.dispatchEvent(new CustomEvent('show-toast', { 
                detail: { 
                  message: t('achievementsUnlockedToast', { count: diff }), 
                  type: 'success' 
                }
              }))
              
              // Save union to storage
              const union = new Set([...savedSet, ...newlyUnlocked])
              localStorage.setItem(unlockedKey, JSON.stringify(Array.from(union)))
              localStorage.setItem('superbet_achievements_count', union.size.toString())
              setAchievementsCount(union.size)
              window.dispatchEvent(new Event('achievements_updated'))
            } else {
              // Sync count & union just in case
              const union = new Set([...savedSet, ...unlockedSet])
              if (union.size > savedSet.size) {
                localStorage.setItem(unlockedKey, JSON.stringify(Array.from(union)))
              }
              localStorage.setItem('superbet_achievements_count', union.size.toString())
              setAchievementsCount(union.size)
            }
          }
        }
      } catch (err) {
        console.error("Fehler beim Achievement-Check", err)
      }
    }

    setTimeout(checkNewAchievements, 3000)

  }, [user, location.pathname, t])

  const mainTabPaths = ['/dashboard', '/tabelle', '/global', '/league', '/profile']
  const isMainTab = mainTabPaths.includes(location.pathname)

  // Map path to tab display name
  const tabNames: Record<string, string> = {
    '/dashboard': t('games'),
    '/tabelle': t('table'),
    '/global': t('global'),
    '/league': t('league'),
    '/profile': t('profile'),
  }
  const tabName = tabNames[location.pathname] || ''

  const sidebarTabs = [
    { to: '/dashboard', icon: Trophy, label: t('games') },
    { to: '/tabelle', icon: Table2, label: t('table') },
    { to: '/global', icon: BarChart2, label: t('global') },
    { to: '/league', icon: Users, label: t('league') },
    { to: '/profile', icon: User, label: t('profile') },
  ]

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      <NetworkIndicator />
      {/* Desktop Sidebar Navigation */}
      <aside className="hidden md:flex md:flex-col w-64 border-r border-white/5 bg-surface/30 backdrop-blur-xl shrink-0 p-5 justify-between sticky top-0 h-screen">
        {/* Top: Logo + Nav Links */}
        <div className="space-y-8">
          <HeaderLogo />
          
          <nav className="space-y-1">
            {sidebarTabs.map(({ to, icon: Icon, label }) => {
              const isActive = location.pathname === to
              return (
                <button
                  key={to}
                  onClick={() => navigate(to)}
                  className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all duration-200 border ${
                    isActive
                      ? 'bg-primary-container/15 text-primary-fixed-dim border-primary-container/20 shadow-[0_0_15px_rgba(251,191,36,0.05)]'
                      : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container/40 border-transparent'
                  }`}
                >
                  <Icon size={16} strokeWidth={isActive ? 2.5 : 1.5} className={isActive ? 'text-primary-fixed-dim' : 'text-on-surface-variant/75'} />
                  {label}
                </button>
              )
            })}
          </nav>
        </div>

        {/* PWA Install Promo in Sidebar */}
        {isInstallable && (
          <div className="px-2 mt-2">
            <button
              onClick={async () => {
                const success = await triggerInstall()
                if (success) {
                  window.dispatchEvent(new CustomEvent('show-toast', { 
                    detail: { message: language === 'tr' ? '🎉 Uygulama başarıyla yüklendi!' : language === 'en' ? '🎉 App installed successfully!' : '🎉 App wurde erfolgreich installiert!', type: 'success' } 
                  }))
                }
              }}
              className="w-full bg-primary/5 hover:bg-primary/10 border border-primary/20 hover:border-primary/30 text-primary-fixed-dim p-3 rounded-xl flex items-center gap-2.5 transition-all text-left group cursor-pointer"
            >
              <Download size={14} className="shrink-0 group-hover:translate-y-0.5 transition-transform" />
              <div className="min-w-0">
                <p className="text-[10px] font-mono font-bold uppercase tracking-wider leading-none">{t('pwaInstallBtn')}</p>
                <p className="text-[8px] text-on-surface-variant/80 font-mono mt-0.5 truncate leading-none">{t('pwaInstallSubtitle')}</p>
              </div>
            </button>
          </div>
        )}

        {/* Share Button (Desktop) */}
        <div className="px-2 mt-2">
          <button
            onClick={handleShare}
            className="w-full flex items-center gap-2.5 px-3.5 py-3 rounded-xl text-xs font-mono font-bold uppercase tracking-wider text-on-surface-variant hover:text-on-surface hover:bg-surface-container/40 transition-all border border-transparent hover:border-white/10"
          >
            <Share2 size={14} />
            {language === 'tr' ? 'Paylaş' : language === 'en' ? 'Share' : 'Teilen'}
          </button>
        </div>

        {/* Bottom User Section */}
        <div className="border-t border-white/5 pt-4">
          <button
            onClick={() => navigate('/profile')}
            className={`w-full flex items-center gap-3 p-2.5 rounded-xl border border-transparent hover:bg-surface-container/30 transition-all ${
              location.pathname === '/profile' ? 'bg-surface-container/20 border-white/5' : ''
            }`}
          >
            <div className="relative shrink-0">
              <div className="w-9 h-9 rounded-full bg-surface-container-high border border-white/10 overflow-hidden flex items-center justify-center">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-on-surface-variant text-xs font-mono font-bold">
                    {user?.user_metadata?.username?.[0]?.toUpperCase() || '?'}
                  </span>
                )}
              </div>
              <div className={`absolute -bottom-1 -right-1 z-10 text-[8px] h-3.5 w-3.5 rounded-full flex items-center justify-center shadow shadow-black/80 select-none level-digit ${getLevelBadgeStyle(level)}`}>
                {level}
              </div>
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-xs font-bold text-on-surface truncate">{user?.user_metadata?.username || t('myProfile')}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[8px] text-on-surface-variant font-mono uppercase shrink-0">Lvl {level}</span>
                <div className="flex-1 h-2 bg-black/50 border border-white/20 rounded-full overflow-hidden p-[1px] relative">
                  <div 
                    className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full transition-all duration-1000 ease-out shadow-[0_0_8px_rgba(251,191,36,0.4)]"
                    style={{ width: `${xpPct}%` }}
                  />
                </div>
              </div>
            </div>
          </button>
        </div>
      </aside>

      {/* Main Page Area */}
      <div className="flex-1 flex flex-col min-w-0 md:h-screen overflow-hidden">
        {/* Mobile Header (hidden on desktop) */}
        {isMainTab && (
          <header className="md:hidden sticky top-0 z-40 bg-surface/60 backdrop-blur-xl border-b border-white/5 shrink-0">
            <div className="flex items-center justify-between px-4 h-16 max-w-lg mx-auto w-full">
              {/* Logo + Tab Name */}
              <div className="flex items-center gap-2.5">
              <HeaderLogo size="sm" />
                <span className="h-4 w-px bg-white/10" />
                <span className="text-[10px] font-mono font-bold text-on-surface-variant uppercase tracking-widest">{tabName}</span>
              </div>

              {/* Profile Avatar Button + EXP Bar + Level Badge */}
              <div className="flex items-center gap-2.5">
                {/* Dünner horizontaler EXP-Fortschrittsbalken */}
                <div className="flex flex-col items-end justify-center">
                  <span className="text-[7px] font-mono text-on-surface-variant/80 uppercase leading-none mb-1">XP: {xpCurrent} / {xpRequired}</span>
                  <div className="w-24 h-2 bg-black/50 border border-white/20 rounded-full overflow-hidden p-[1px] relative">
                    <div 
                      className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(251,191,36,0.5)]"
                      style={{ width: `${xpPct}%` }}
                    />
                  </div>
                </div>

                <div className="relative shrink-0">
                  <button
                    onClick={() => navigate('/profile')}
                    className={`w-8 h-8 rounded-full border bg-surface-container-high flex items-center justify-center transition-all ${
                      location.pathname === '/profile'
                        ? 'border-primary shadow-[0_0_10px_rgba(251,191,36,0.3)] scale-105'
                        : 'border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-on-surface-variant text-xs font-mono font-bold">
                          {user?.user_metadata?.username?.[0]?.toUpperCase() || '?'}
                        </span>
                      )}
                    </div>
                  </button>
                  <div className={`absolute -bottom-1 -right-1 z-10 text-[9px] h-4.5 w-4.5 rounded-full flex items-center justify-center shadow shadow-black/80 select-none level-digit ${getLevelBadgeStyle(level)}`}>
                    {level}
                  </div>
                </div>
              </div>
            </div>
          </header>
        )}

        {/* Main Page Content */}
        <main className="flex-1 min-h-0 flex flex-col md:p-5 md:pb-5 overflow-hidden">
          <div className="flex-1 flex flex-col min-h-0 md:bg-surface-container-low/20 md:border md:border-white/5 md:rounded-2xl md:shadow-2xl overflow-y-auto">
            <AnimatedOutlet />
          </div>
        </main>
      </div>

      <BottomNav />
      <ToastContainer />

      {/* Fullscreen Onboarding Carousel Overlay */}
      {showOnboarding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md animate-fade-in" />
          
          <div className="relative glass-panel border border-primary-container/30 rounded-2xl p-6 text-center max-w-sm w-full shadow-[0_0_50px_rgba(251,191,36,0.15)] flex flex-col min-h-[440px] justify-between animate-scale-in">
            {/* Backdrop glowing gradient */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-primary-container/5 to-transparent pointer-events-none" />

            {/* Carousel Content */}
            <div className="flex-1 flex flex-col justify-center py-4">
              {onboardingSlide === 0 && (
                <div className="animate-fade-in space-y-4">
                  <div className="w-16 h-16 rounded-full bg-primary-container/15 border border-primary-container/30 flex items-center justify-center mx-auto mb-2 animate-bounce">
                    <Sparkles size={32} className="text-primary-fixed-dim" />
                  </div>
                  <h2 className="text-xl font-black text-on-surface" dangerouslySetInnerHTML={{
                    __html: t('onboardingWelcomeTitle', { username: user?.user_metadata?.username || (language === 'de' ? 'Bruder' : language === 'tr' ? 'Kardeşim' : 'Brother') })
                      .replace('SÜPERBET', '<span class="text-primary-fixed-dim">SÜPERBET</span>')
                  }} />
                  <p className="text-xs text-on-surface-variant leading-relaxed font-mono">
                    {t('onboardingWelcomeDesc')}
                  </p>
                  <p className="text-[11px] text-primary-fixed-dim bg-primary-container/10 border border-primary-container/20 rounded-lg p-2.5 leading-normal">
                    {t('onboardingWelcomeAlert')}
                  </p>
                </div>
              )}

              {/* === SLIDES 1-7: Punktestufen (je eine eigene Seite) === */}
              {onboardingSlide >= 1 && onboardingSlide <= 7 && (() => {
                const tiers = [
                  { pts: '+4', color: 'emerald', icon: '🎯', tip: '2:1', res: '2:1',
                    de: 'Exakter Treffer', en: 'Exact Hit', tr: 'Tam İsabet' },
                  { pts: '+3', color: 'amber',   icon: '🔥', tip: '4:1', res: '3:1',
                    de: 'Sehr nah dran', en: 'Very Close', tr: 'Çok Yakın' },
                  { pts: '+2', color: 'blue',    icon: '👍', tip: '2:0', res: '3:1',
                    de: 'Gute Tendenz', en: 'Good Tendency', tr: 'İyi Eğilim' },
                  { pts: '+1', color: 'purple',  icon: '🤏', tip: '1:0', res: '4:1',
                    de: 'Weit vorbei', en: 'Far Off', tr: 'Uzak Sapma' },
                  { pts: '0',  color: 'slate',   icon: '😬', tip: '1:1', res: '2:1',
                    de: 'Knapp daneben', en: 'Close Miss', tr: 'Kıl Payı' },
                  { pts: '−1', color: 'red',     icon: '😅', tip: '1:2', res: '2:1',
                    de: 'Falscher Sieger', en: 'Wrong Winner', tr: 'Yanlış Kazanan' },
                  { pts: '−2', color: 'red',     icon: '💀', tip: '0:3', res: '2:1',
                    de: 'Komplett daneben', en: 'Complete Miss', tr: 'Tamamen Karavana' },
                ]
                const t = tiers[onboardingSlide - 1]
                const cMap: Record<string, string> = { emerald: 'border-emerald-500/25 bg-emerald-500/5 text-emerald-400', amber: 'border-amber-500/25 bg-amber-500/5 text-amber-400', blue: 'border-blue-500/25 bg-blue-500/5 text-blue-400', purple: 'border-purple-500/25 bg-purple-500/5 text-purple-400', slate: 'border-slate-500/20 bg-slate-500/5 text-slate-400', red: 'border-red-500/20 bg-red-500/5 text-red-400/80' }
                const c = cMap[t.color] || cMap.slate
                const [cBorder, cBg, cText] = c.split(' ')
                const title = language === 'tr' ? t.tr : language === 'en' ? t.en : t.de

                return (
                  <div className="animate-fade-in space-y-4">
                    <div className="text-4xl mb-1">{t.icon}</div>
                    <div className={`inline-flex items-center gap-1 mx-auto px-4 py-1.5 rounded-full border ${cBorder} ${cBg}`}>
                      <span className={`text-3xl font-black font-mono ${cText}`}>{t.pts}</span>
                      <span className={`text-xs font-mono font-bold ${cText}`}>{language === 'tr' ? 'Puan' : language === 'en' ? 'PTS' : 'P'}</span>
                    </div>
                    <h2 className={`text-lg font-black ${cText}`}>{title}</h2>

                    {/* Match Card */}
                    <div className={`glass-panel rounded-xl p-3 border ${cBorder} ${cBg} max-w-[220px] mx-auto`}>
                      <div className="flex items-center justify-center gap-4">
                        <div className="text-center">
                          <span className="text-[8px] text-on-surface-variant/50 font-mono uppercase block mb-0.5">{language === 'tr' ? 'Tahmin' : language === 'en' ? 'Tip' : 'Tipp'}</span>
                          <span className="font-mono text-xl font-black text-on-surface">{t.tip}</span>
                        </div>
                        <span className="text-on-surface-variant/20 text-sm font-mono">VS</span>
                        <div className="text-center">
                          <span className="text-[8px] text-on-surface-variant/50 font-mono uppercase block mb-0.5">{language === 'tr' ? 'Sonuç' : language === 'en' ? 'Result' : 'Ergebnis'}</span>
                          <span className="font-mono text-xl font-black text-on-surface">{t.res}</span>
                        </div>
                      </div>
                    </div>

                    <p className="text-[9px] text-on-surface-variant/40 font-mono">{onboardingSlide} / 7</p>
                  </div>
                )
              })()}

              {onboardingSlide === 8 && (
                <div className="animate-fade-in space-y-4">
                  <div className="w-12 h-12 rounded-full bg-purple-500/10 border border-purple-500/30 flex items-center justify-center mx-auto mb-1">
                    <Trophy size={24} className="text-purple-400" />
                  </div>
                  <h2 className="text-lg font-black text-on-surface">
                    {t('onboardingLevelTitle')}
                  </h2>
                  <p className="text-xs text-on-surface-variant leading-relaxed font-mono">
                    {t('onboardingLevelDesc')}
                  </p>
                  
                  <div className="grid grid-cols-4 gap-2 pt-2 max-w-[280px] mx-auto">
                    <div className="flex flex-col items-center gap-1">
                      <div className={`h-8 w-8 rounded-lg flex flex-col items-center justify-center shadow border text-[8px] leading-none ${getLevelBadgeStyle(1)}`}>
                        <span className="text-[5px] font-mono font-bold leading-none">LVL</span>
                        <span className="text-xs font-black font-mono leading-none mt-0.5">1</span>
                      </div>
                      <span className="text-[7px] font-mono text-on-surface-variant truncate w-full text-center">Alman</span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <div className={`h-8 w-8 rounded-lg flex flex-col items-center justify-center shadow border text-[8px] leading-none ${getLevelBadgeStyle(5)}`}>
                        <span className="text-[5px] font-mono font-bold leading-none">LVL</span>
                        <span className="text-xs font-black font-mono leading-none mt-0.5">5</span>
                      </div>
                      <span className="text-[7px] font-mono text-on-surface-variant truncate w-full text-center">
                        {language === 'tr' ? 'Efsane' : language === 'en' ? 'Legend' : 'Legende'}
                      </span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <div className={`h-8 w-8 rounded-lg flex flex-col items-center justify-center shadow border text-[8px] leading-none ${getLevelBadgeStyle(10)}`}>
                        <span className="text-[5px] font-mono font-bold leading-none">LVL</span>
                        <span className="text-xs font-black font-mono leading-none mt-0.5">10</span>
                      </div>
                      <span className="text-[7px] font-mono text-on-surface-variant truncate w-full text-center">Baba</span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <div className={`h-8 w-8 rounded-lg flex flex-col items-center justify-center shadow border text-[8px] leading-none ${getLevelBadgeStyle(13)}`}>
                        <span className="text-[5px] font-mono font-bold leading-none">LVL</span>
                        <span className="text-xs font-black font-mono leading-none mt-0.5">13</span>
                      </div>
                      <span className="text-[7px] font-mono text-on-surface-variant truncate w-full text-center">Boss</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-on-surface-variant/60 font-mono italic">
                    {t('onboardingLevelSub')}
                  </p>
                </div>
              )}

              {onboardingSlide === 9 && (
                <div className="animate-fade-in space-y-4">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto mb-1">
                    <Award size={24} className="text-emerald-400" />
                  </div>
                  <h2 className="text-lg font-black text-on-surface">
                    {t('onboardingAchTitle')}
                  </h2>
                  <p className="text-xs text-on-surface-variant leading-relaxed font-mono" dangerouslySetInnerHTML={{
                    __html: t('onboardingAchDesc')
                      .replace('Erfolge (Badges)', '<span class="text-emerald-400 font-bold">' + (language === 'tr' ? 'Başarılar (Rozetler)' : language === 'en' ? 'Achievements (Badges)' : 'Erfolge (Badges)') + '</span>')
                      .replace('achievements (badges)', '<span class="text-emerald-400 font-bold">achievements (badges)</span>')
                      .replace('başarının (rozeti)', '<span class="text-emerald-400 font-bold">başarının (rozeti)</span>')
                  }} />
                  <p className="text-[10px] text-on-surface-variant/70 leading-relaxed font-mono bg-surface-container/30 border border-surface-container-highest p-2.5 rounded-lg text-left" dangerouslySetInnerHTML={{
                    __html: t('onboardingAchAlert')
                      .replace('massiven EXP-Boost', '<span class="text-primary-fixed-dim font-bold">massiven EXP-Boost</span>')
                      .replace('massive EXP boost', '<span class="text-primary-fixed-dim font-bold">massive EXP boost</span>')
                      .replace('devasa bir EXP desteği', '<span class="text-primary-fixed-dim font-bold">devasa bir EXP desteği</span>')
                  }} />
                </div>
              )}

              {onboardingSlide === 10 && (
                <div className="animate-fade-in space-y-4">
                  <div className="w-12 h-12 rounded-full bg-orange-500/10 border border-orange-500/30 flex items-center justify-center mx-auto mb-1">
                    <Gift size={24} className="text-orange-400" />
                  </div>
                  <h2 className="text-lg font-black text-on-surface">
                    {t('onboardingBonusTitle')}
                  </h2>
                  <p className="text-xs text-on-surface-variant leading-relaxed font-mono" dangerouslySetInnerHTML={{
                    __html: t('onboardingBonusDesc')
                      .replace('Saison-Wetten', '<span class="text-orange-400 font-bold">Saison-Wetten</span>')
                      .replace('season bets', '<span class="text-orange-400 font-bold">season bets</span>')
                      .replace('sezon tahminlerini', '<span class="text-orange-400 font-bold">sezon tahminlerini</span>')
                  }} />
                  <p className="text-[10px] text-on-surface-variant/70 leading-relaxed font-mono bg-surface-container/30 border border-surface-container-highest p-2.5 rounded-lg text-left" dangerouslySetInnerHTML={{
                    __html: t('onboardingBonusAlert')
                      .replace('fetten Zusatzpunkte & mächtig EXP', '<span class="text-primary-fixed-dim font-bold">fetten Zusatzpunkte & mächtig EXP</span>')
                      .replace('fat extra points & huge EXP', '<span class="text-primary-fixed-dim font-bold">fat extra points & huge EXP</span>')
                      .replace('bol ekstra puan & büyük EXP', '<span class="text-primary-fixed-dim font-bold">bol ekstra puan & büyük EXP</span>')
                  }} />
                </div>
              )}

              {onboardingSlide === 11 && (
                <div className="animate-fade-in space-y-4">
                  <div className="w-16 h-16 rounded-full bg-primary-container/15 border border-primary-container/30 flex items-center justify-center mx-auto mb-2">
                    <Rocket size={32} className="text-primary-fixed-dim" />
                  </div>
                  <h2 className="text-xl font-black text-on-surface">
                    {t('onboardingReadyTitle')}
                  </h2>
                  <p className="text-xs text-on-surface-variant leading-relaxed font-mono">
                    {t('onboardingReadyDesc')}
                  </p>
                  <p className="text-[10px] text-on-surface-variant/40 font-mono">
                    {t('onboardingReadyAlert')}
                  </p>
                </div>
              )}
            </div>

            {/* Navigation Controls */}
            <div className="mt-6 space-y-4">
              {/* Dot Indicators */}
              <div className="flex justify-center gap-1.5">
                {Array.from({ length: 12 }, (_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setOnboardingSlide(idx)}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      onboardingSlide === idx ? 'w-5 bg-primary' : 'w-1.5 bg-surface-container-highest'
                    }`}
                  />
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                {onboardingSlide > 0 ? (
                  <button
                    onClick={() => setOnboardingSlide(onboardingSlide - 1)}
                    className="p-3 bg-surface-container-high border border-surface-container-highest rounded-lg text-on-surface-variant hover:text-on-surface transition-colors"
                  >
                    <ChevronLeft size={16} />
                  </button>
                ) : (
                  <div className="w-[42px] shrink-0" />
                )}

                {onboardingSlide < 11 ? (
                  <button
                    onClick={() => setOnboardingSlide(onboardingSlide + 1)}
                    className="flex-1 bg-primary-container text-on-primary-container py-3 rounded-lg font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 hover:opacity-90 active:scale-95 transition-all shadow-[0_0_15px_rgba(251,191,36,0.1)]"
                  >
                    {t('onboardingNext')} <ChevronRight size={14} />
                  </button>
                ) : (
                  <div className="flex-1 flex flex-col gap-2">
                    <button
                      onClick={() => finishOnboarding(true)}
                      className="w-full bg-orange-500/10 text-orange-400 border border-orange-500/20 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-orange-500/20 transition-colors"
                    >
                      {t('onboardingBonusTipsBtn')}
                    </button>
                    <button
                      onClick={() => finishOnboarding(false)}
                      className="w-full bg-primary-container text-on-primary text-xs font-black py-3 rounded-lg uppercase tracking-wider flex items-center justify-center gap-1.5 hover:opacity-90 active:scale-[0.97] transition-all shadow-[0_0_20px_rgba(251,191,36,0.25)]"
                    >
                      {t('onboardingStartBtn')}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

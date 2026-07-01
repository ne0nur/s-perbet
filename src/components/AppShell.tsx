import { useState, useEffect } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import GooeyNav, { type GooeyNavItem } from './ui/GooeyNav'
import Plasma from './ui/Plasma'
import { ToastContainer } from './ToastContainer'
import { useAuthStore } from '../stores/authStore'
import { usePresenceStore } from '../stores/presenceStore'
import { supabase } from '../lib/supabase'
import { calculateLevelDetails, getLevelBadgeStyle } from '../lib/utils'
import { LevelBadge } from './ui/LevelBadge'
import { evaluateAchievements, type TipDetails } from '../utils/achievementEvaluator'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Sparkles, Award, Gift, Rocket, Share2, Table2 } from 'lucide-react'
import { usePwaStore } from '../stores/pwaStore'
import { useTranslation } from '../utils/translations'
import { HeaderLogo } from './HeaderLogo'
import { NetworkIndicator } from './NetworkIndicator'
import {
  HoverTrophyIcon, HoverChartBarIcon, HoverUsersIcon, HoverUserIcon,
  HoverGlobeIcon, HoverDownloadIcon
} from './icons/HoverIcons'

/** Nur der Page-Content animiert — AppShell & Nav bleiben stabil */
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
  const [bonusTippsCount, setBonusTippsCount] = useState(0)
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

  const { level, xpCurrent, xpRequired, xpPct } = calculateLevelDetails(punkte, achievementsCount, bonusTippsCount)
  const { initPresence, cleanupPresence } = usePresenceStore()

  // Real-time Active Presence Tracking based on page visibility and user activity
  useEffect(() => {
    if (!user) {
      cleanupPresence()
      return
    }

    let idleTimer: ReturnType<typeof setTimeout> | null = null
    let isIdle = false

    const markActive = () => {
      if (idleTimer) clearTimeout(idleTimer)

      if (isIdle && document.visibilityState === 'visible') {
        isIdle = false
        initPresence()
      }

      // Reset idle timer for 2 minutes
      idleTimer = setTimeout(() => {
        isIdle = true
        cleanupPresence()
      }, 120000) // 2 minutes idle timeout
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        isIdle = false
        initPresence()
        markActive()
      } else {
        if (idleTimer) clearTimeout(idleTimer)
        cleanupPresence()
      }
    }

    // Initialize if visible
    if (document.visibilityState === 'visible') {
      initPresence()
      markActive()
    }

    // Event listeners for user activity
    const activityEvents = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart']
    const registerActivityListeners = () => {
      activityEvents.forEach(event => {
        window.addEventListener(event, markActive, { passive: true })
      })
    }
    
    const removeActivityListeners = () => {
      activityEvents.forEach(event => {
        window.removeEventListener(event, markActive)
      })
    }

    registerActivityListeners()
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      if (idleTimer) clearTimeout(idleTimer)
      removeActivityListeners()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      cleanupPresence()
    }
  }, [user, initPresence, cleanupPresence])

  useEffect(() => {
    if (user) {
      const completed = localStorage.getItem(`superbet_onboarding_completed_${user.id}`)
      if (!completed) {
        setShowOnboarding(true)
      }

      // Auto-join pending league if set in localStorage
      const pendingCode = localStorage.getItem('superbet_pending_invite_code')
      if (pendingCode) {
        localStorage.removeItem('superbet_pending_invite_code')
        localStorage.removeItem('superbet_pending_league_id') // clean up both
        
        supabase.rpc('join_league_by_code', { p_invite_code: pendingCode.trim().toUpperCase() })
          .then(({ data: joinedId, error: joinError }) => {
            if (joinError || !joinedId) {
              console.error('Auto-join league failed:', joinError)
            } else {
              // Fetch league name for custom toast message
              supabase
                .from('leagues')
                .select('name')
                .eq('id', joinedId)
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
    } else {
      setShowOnboarding(false)
    }
  }, [user, t])

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
      text: '🔥 Tippe mit uns die Süper Lig! Komm in die Tipprunde.\n\nhttps://ne0nur.github.io/s-perbet/',
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
      
    supabase.from('bonus_tipps').select('*', { count: 'exact', head: true }).eq('user_id', user.id)
      .then(({ count }) => {
        setBonusTippsCount(count || 0)
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
              window.dispatchEvent(new Event('achievements_updated'))
            }
            
            // Set storage strictly to current unlocked set (no double counting on resets)
            localStorage.setItem(unlockedKey, JSON.stringify(Array.from(unlockedSet)))
            localStorage.setItem('superbet_achievements_count', unlockedSet.size.toString())
            setAchievementsCount(unlockedSet.size)
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
    { to: '/dashboard', icon: HoverTrophyIcon,  label: t('games') },
    { to: '/tabelle',   icon: Table2,           label: t('table') },
    { to: '/global',    icon: HoverChartBarIcon, label: t('global') },
    { to: '/league',    icon: HoverUsersIcon,   label: t('league') },
    { to: '/profile',   icon: HoverUserIcon,    label: t('profile') },
  ]

  const gooeyNavItems: GooeyNavItem[] = [
    { to: '/dashboard', label: t('games') },
    { to: '/tabelle',   label: t('table') },
    { to: '/global',    label: t('global') },
    { to: '/league',    label: t('league') },
    { to: '/profile',   label: t('profile') },
  ]

  return (
    <div className="h-[100dvh] w-full bg-background flex flex-col md:flex-row overflow-hidden select-none">
      <Plasma color="#f9bd22" speed={0.5} opacity={0.10} scale={1.3} />
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
                      ? 'bg-primary-container/15 text-primary-fixed-dim border-primary-container/20 shadow-[0_0_15px_rgba(var(--primary-rgb),0.05)]'
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
              <HoverDownloadIcon size={14} className="shrink-0 group-hover:translate-y-0.5 transition-transform" />
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
              <LevelBadge level={level} className="absolute -bottom-1 -right-1 z-10 text-[8px] h-3.5 w-3.5 rounded-full shadow shadow-black/80 select-none level-digit">
                {level}
              </LevelBadge>
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-xs font-bold text-on-surface truncate">{user?.user_metadata?.username || t('myProfile')}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[8px] text-on-surface-variant font-mono uppercase shrink-0">Lvl {level}</span>
                <div className="flex-1 h-2 bg-black/50 border border-white/20 rounded-full overflow-hidden p-[1px] relative">
                  <div 
                    className="h-full bg-primary rounded-full transition-all duration-1000 ease-out shadow-[0_0_8px_rgba(var(--primary-rgb),0.5)]"
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
              {/* Logo */}
              <div className="flex items-center">
                <HeaderLogo size="md" />
              </div>

              {/* Profile Avatar Button + EXP Bar + Level Badge */}
              <AnimatePresence>
                {location.pathname !== '/profile' && (
                  <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="flex items-center gap-3"
                  >
                    {/* Dünner horizontaler EXP-Fortschrittsbalken */}
                    <motion.div layoutId="header-exp" className="flex flex-col items-end justify-center">
                      <span className="text-[8px] font-mono text-on-surface-variant/80 uppercase leading-none mb-1.5">XP: {xpCurrent} / {xpRequired}</span>
                      <div className="w-28 h-2.5 bg-black/50 border border-white/20 rounded-full overflow-hidden p-[1px] relative">
                        <div 
                          className="h-full bg-primary rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(var(--primary-rgb),0.5)]"
                          style={{ width: `${xpPct}%` }}
                        />
                      </div>
                    </motion.div>

                    <div className="relative shrink-0">
                      <motion.button
                        layoutId="header-avatar"
                        onClick={() => navigate('/profile')}
                        className={`w-10 h-10 rounded-full border bg-surface-container-high flex items-center justify-center transition-all border-white/10 hover:border-white/20`}
                      >
                        <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center">
                          {avatarUrl ? (
                            <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-on-surface-variant text-sm font-mono font-bold">
                              {user?.user_metadata?.username?.[0]?.toUpperCase() || '?'}
                            </span>
                          )}
                        </div>
                      </motion.button>
                      <motion.div layoutId="header-level" className="absolute -bottom-1.5 -right-1.5 z-10">
                        <LevelBadge level={level} className="text-[10px] h-5 w-5 rounded-full shadow shadow-black/80 select-none level-digit">
                          {level}
                        </LevelBadge>
                      </motion.div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </header>
        )}

        {/* Main Page Content */}
        <main className="flex-1 min-h-0 flex flex-col md:p-5 md:pb-5 overflow-hidden">
          <div className="flex-1 flex flex-col min-h-0 md:bg-surface-container-low/20 md:border md:border-white/5 md:rounded-2xl md:shadow-2xl native-scroll pb-28 md:pb-5">
            <AnimatedOutlet />
          </div>
        </main>
      </div>

      {/* Gooey Nav — mobile bottom navigation, freistehend */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 pb-2 pt-1 pointer-events-none">
        <div className="pointer-events-auto flex justify-center">
          <GooeyNav
            items={gooeyNavItems}
            animationTime={600}
            particleCount={12}
            particleDistances={[80, 8]}
            colors={[1, 2, 3, 1, 2, 3, 1, 4]}
          />
        </div>
      </div>
      <ToastContainer />

      {/* Fullscreen Onboarding Carousel Overlay */}
      {showOnboarding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/95 backdrop-blur-md animate-fade-in" />
          
          <div className="relative border border-white/10 rounded-3xl p-8 text-center max-w-md w-full shadow-[0_20px_50px_rgba(0,0,0,0.8),_0_0_40px_rgba(var(--primary-rgb),0.15)] flex flex-col min-h-[480px] justify-between animate-scale-in bg-gradient-to-br from-surface-container-high/70 via-surface-container-low/95 to-surface-container-lowest/80 backdrop-blur-xl">
            {/* Backdrop glowing gradient */}
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-b from-primary-container/10 via-transparent to-transparent pointer-events-none" />

            {/* Carousel Content */}
            <div className="flex-1 flex flex-col justify-center py-4">
              {onboardingSlide === 0 && (
                <div className="animate-fade-in space-y-5">
                  <div className="relative w-20 h-20 mx-auto mb-4">
                    <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
                    <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-primary-container/20 to-primary/10 border border-primary/30 flex items-center justify-center shadow-lg">
                      <Sparkles size={36} className="text-primary animate-glow-pulse" />
                    </div>
                  </div>
                  <h2 className="text-2xl font-black text-on-surface tracking-tight" dangerouslySetInnerHTML={{
                    __html: t('onboardingWelcomeTitle', { username: user?.user_metadata?.username || (language === 'de' ? 'Bruder' : language === 'tr' ? 'Kardeşim' : 'Brother') })
                      .replace('SÜPERBET', '<span class="text-primary-fixed-dim bg-primary-container/20 px-2 py-0.5 rounded-lg border border-primary-container/30">SÜPERBET</span>')
                  }} />
                  <p className="text-xs md:text-sm text-on-surface-variant leading-relaxed font-mono px-2">
                    {t('onboardingWelcomeDesc')}
                  </p>
                  <p className="text-[11px] md:text-xs text-primary-fixed-dim bg-primary-container/8 border border-primary-container/15 rounded-xl p-3.5 leading-relaxed font-mono shadow-sm">
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
                const tier = tiers[onboardingSlide - 1]
                const cMap: Record<string, string> = { 
                  emerald: 'border-emerald-500/25 bg-emerald-500/5 text-emerald-400', 
                  amber: 'border-amber-500/25 bg-amber-500/5 text-amber-400', 
                  blue: 'border-blue-500/25 bg-blue-500/5 text-blue-400', 
                  purple: 'border-purple-500/25 bg-purple-500/5 text-purple-400', 
                  slate: 'border-slate-500/20 bg-slate-500/5 text-slate-400', 
                  red: 'border-red-500/20 bg-red-500/5 text-red-400/80' 
                }
                const c = cMap[tier.color] || cMap.slate
                const [cBorder, cBg, cText] = c.split(' ')
                const title = language === 'tr' ? tier.tr : language === 'en' ? tier.en : tier.de

                return (
                  <div className="animate-fade-in space-y-5">
                    <div className="text-5xl drop-shadow-md mb-2">{tier.icon}</div>
                    <div className={`inline-flex items-center gap-1.5 mx-auto px-5 py-2 rounded-full border shadow-sm ${cBorder} ${cBg}`}>
                      <span className={`text-3xl font-black font-mono leading-none ${cText}`}>{tier.pts}</span>
                      <span className={`text-xs font-mono font-bold leading-none ${cText}`}>{language === 'tr' ? 'Puan' : language === 'en' ? 'PTS' : 'P'}</span>
                    </div>
                    <h2 className={`text-lg font-black tracking-wide ${cText}`}>{title}</h2>

                    {/* Match Card */}
                    <div className={`relative overflow-hidden rounded-2xl p-4 border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),_0_8px_20px_rgba(0,0,0,0.4)] max-w-[240px] mx-auto bg-gradient-to-br from-white/[0.04] to-white/[0.01]`}>
                      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
                      <div className="flex items-center justify-between gap-4 relative z-10">
                        <div className="text-left">
                          <span className="text-[9px] text-on-surface-variant/40 font-mono uppercase tracking-wider block mb-1">{language === 'tr' ? 'Tahmin' : language === 'en' ? 'Tip' : 'Tipp'}</span>
                          <span className="font-mono text-2xl font-black text-on-surface tracking-wider">{tier.tip}</span>
                        </div>
                        <div className="h-8 w-px bg-white/10" />
                        <div className="text-right">
                          <span className="text-[9px] text-on-surface-variant/40 font-mono uppercase tracking-wider block mb-1">{language === 'tr' ? 'Sonuç' : language === 'en' ? 'Result' : 'Ergebnis'}</span>
                          <span className="font-mono text-2xl font-black text-on-surface tracking-wider">{tier.res}</span>
                        </div>
                      </div>
                    </div>

                    {/* Visual Breakdown of Distance */}
                    {(() => {
                      const [th, tg] = tier.tip.split(':').map(Number)
                      const [rh, rg] = tier.res.split(':').map(Number)
                      const diffH = Math.abs(th - rh)
                      const diffG = Math.abs(tg - rg)
                      const totalDiff = diffH + diffG
                      return (
                        <div className="mt-4 bg-black/20 rounded-xl p-3 max-w-[240px] mx-auto text-left flex flex-col gap-2 border border-white/5">
                          <div className="flex justify-between items-center text-[10px] font-mono text-on-surface-variant/80">
                            <span>{language === 'tr' ? 'Ev sahibi hata' : language === 'en' ? 'Home team error' : 'Abweichung Heim'}</span>
                            <span className="font-bold text-on-surface">{diffH} {language === 'tr' ? 'Gol' : language === 'en' ? 'Goals' : 'Tore'}</span>
                          </div>
                          <div className="flex justify-between items-center text-[10px] font-mono text-on-surface-variant/80">
                            <span>{language === 'tr' ? 'Deplasman hata' : language === 'en' ? 'Away team error' : 'Abweichung Gast'}</span>
                            <span className="font-bold text-on-surface">{diffG} {language === 'tr' ? 'Gol' : language === 'en' ? 'Goals' : 'Tore'}</span>
                          </div>
                          <div className="h-px bg-white/10 my-0.5" />
                          <div className="flex justify-between items-center text-[11px] font-mono font-bold">
                            <span className={cText}>{language === 'tr' ? 'Toplam Sapma' : language === 'en' ? 'Total Distance' : 'Gesamtabweichung'}</span>
                            <span className={cText}>{totalDiff} {language === 'tr' ? 'Gol' : language === 'en' ? 'Goals' : 'Tore'}</span>
                          </div>
                        </div>
                      )
                    })()}

                    <p className="text-[9px] text-on-surface-variant/30 font-mono tracking-widest uppercase">{onboardingSlide} / 7</p>
                  </div>
                )
              })()}

              {onboardingSlide === 8 && (
                <div className="animate-fade-in space-y-5">
                  <div className="relative w-14 h-14 mx-auto mb-1">
                    <div className="absolute inset-0 bg-purple-500/20 rounded-full blur-lg animate-pulse" />
                    <div className="relative w-14 h-14 rounded-full bg-purple-500/10 border border-purple-500/30 flex items-center justify-center shadow-md">
                      <HoverTrophyIcon size={24} className="text-purple-400" />
                    </div>
                  </div>
                  <h2 className="text-xl font-black text-on-surface tracking-tight">
                    {t('onboardingLevelTitle')}
                  </h2>
                  <p className="text-xs text-on-surface-variant leading-relaxed font-mono px-3">
                    {t('onboardingLevelDesc')}
                  </p>
                  
                  <div className="grid grid-cols-4 gap-3 pt-2 max-w-[320px] mx-auto">
                    <div className="flex flex-col items-center gap-1.5 p-2 bg-white/[0.02] border border-white/5 rounded-xl hover:border-white/10 transition-colors">
                      <LevelBadge level={1} className="h-9 w-9 rounded-lg shadow-md border text-[9px] leading-none">
                        <span className="opacity-70 text-[6px] block">LVL</span>1
                      </LevelBadge>
                      <span className="text-[8px] font-mono font-bold text-on-surface-variant truncate w-full text-center">Alman</span>
                    </div>
                    <div className="flex flex-col items-center gap-1.5 p-2 bg-white/[0.02] border border-white/5 rounded-xl hover:border-white/10 transition-colors">
                      <LevelBadge level={5} className="h-9 w-9 rounded-lg shadow-md border text-[9px] leading-none">
                        <span className="opacity-70 text-[6px] block">LVL</span>5
                      </LevelBadge>
                      <span className="text-[8px] font-mono font-bold text-on-surface-variant truncate w-full text-center">
                        {language === 'tr' ? 'Efsane' : language === 'en' ? 'Legend' : 'Legende'}
                      </span>
                    </div>
                    <div className="flex flex-col items-center gap-1.5 p-2 bg-white/[0.02] border border-white/5 rounded-xl hover:border-white/10 transition-colors">
                      <LevelBadge level={10} className="h-9 w-9 rounded-lg shadow-md border text-[9px] leading-none">
                        <span className="opacity-70 text-[6px] block">LVL</span>10
                      </LevelBadge>
                      <span className="text-[8px] font-mono font-bold text-on-surface-variant truncate w-full text-center">Baba</span>
                    </div>
                    <div className="flex flex-col items-center gap-1.5 p-2 bg-white/[0.02] border border-white/5 rounded-xl hover:border-white/10 transition-colors">
                      <LevelBadge level={13} className="h-9 w-9 rounded-lg shadow-md border text-[9px] leading-none">
                        <span className="opacity-70 text-[6px] block">LVL</span>13
                      </LevelBadge>
                      <span className="text-[8px] font-mono font-bold text-on-surface-variant truncate w-full text-center">Boss</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-on-surface-variant/50 font-mono italic">
                    {t('onboardingLevelSub')}
                  </p>
                </div>
              )}

              {onboardingSlide === 9 && (
                <div className="animate-fade-in space-y-5">
                  <div className="relative w-14 h-14 mx-auto mb-1">
                    <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-lg animate-pulse" />
                    <div className="relative w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shadow-md">
                      <Award size={24} className="text-emerald-400" />
                    </div>
                  </div>
                  <h2 className="text-xl font-black text-on-surface tracking-tight">
                    {t('onboardingAchTitle')}
                  </h2>
                  <p className="text-xs text-on-surface-variant leading-relaxed font-mono px-2" dangerouslySetInnerHTML={{
                    __html: t('onboardingAchDesc')
                      .replace('Erfolge (Badges)', '<span class="text-emerald-400 font-bold">' + (language === 'tr' ? 'Başarılar (Rozetler)' : language === 'en' ? 'Achievements (Badges)' : 'Erfolge (Badges)') + '</span>')
                      .replace('achievements (badges)', '<span class="text-emerald-400 font-bold">achievements (badges)</span>')
                      .replace('başarının (rozeti)', '<span class="text-emerald-400 font-bold">başarının (rozeti)</span>')
                  }} />
                  <p className="text-[10px] md:text-xs text-on-surface-variant/70 leading-relaxed font-mono bg-white/[0.02] border border-white/5 p-3 rounded-2xl text-left" dangerouslySetInnerHTML={{
                    __html: t('onboardingAchAlert')
                      .replace('massiven EXP-Boost', '<span class="text-primary-fixed-dim font-bold">massiven EXP-Boost</span>')
                      .replace('massive EXP boost', '<span class="text-primary-fixed-dim font-bold">massive EXP boost</span>')
                      .replace('devasa bir EXP desteği', '<span class="text-primary-fixed-dim font-bold">devasa bir EXP desteği</span>')
                  }} />
                </div>
              )}

              {onboardingSlide === 10 && (
                <div className="animate-fade-in space-y-5">
                  <div className="relative w-14 h-14 mx-auto mb-1">
                    <div className="absolute inset-0 bg-orange-500/20 rounded-full blur-lg animate-pulse" />
                    <div className="relative w-14 h-14 rounded-full bg-orange-500/10 border border-orange-500/30 flex items-center justify-center shadow-md">
                      <Gift size={24} className="text-orange-400" />
                    </div>
                  </div>
                  <h2 className="text-xl font-black text-on-surface tracking-tight">
                    {t('onboardingBonusTitle')}
                  </h2>
                  <p className="text-xs text-on-surface-variant leading-relaxed font-mono px-2" dangerouslySetInnerHTML={{
                    __html: t('onboardingBonusDesc')
                      .replace('Saison-Wetten', '<span class="text-orange-400 font-bold">Saison-Wetten</span>')
                      .replace('season bets', '<span class="text-orange-400 font-bold">season bets</span>')
                      .replace('sezon tahminlerini', '<span class="text-orange-400 font-bold">sezon tahminlerini</span>')
                  }} />
                  <p className="text-[10px] md:text-xs text-on-surface-variant/70 leading-relaxed font-mono bg-white/[0.02] border border-white/5 p-3 rounded-2xl text-left" dangerouslySetInnerHTML={{
                    __html: t('onboardingBonusAlert')
                      .replace('fetten Zusatzpunkte & mächtig EXP', '<span class="text-primary-fixed-dim font-bold">fetten Zusatzpunkte & mächtig EXP</span>')
                      .replace('fat extra points & huge EXP', '<span class="text-primary-fixed-dim font-bold">fat extra points & huge EXP</span>')
                      .replace('bol ekstra puan & büyük EXP', '<span class="text-primary-fixed-dim font-bold">bol ekstra puan & büyük EXP</span>')
                  }} />
                </div>
              )}

              {onboardingSlide === 11 && (
                <div className="animate-fade-in space-y-5">
                  <div className="relative w-20 h-20 mx-auto mb-4 animate-pulse">
                    <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl" />
                    <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-primary-container/20 to-primary/10 border border-primary/30 flex items-center justify-center shadow-lg">
                      <Rocket size={36} className="text-primary animate-bounce" />
                    </div>
                  </div>
                  <h2 className="text-2xl font-black text-on-surface tracking-tight">
                    {t('onboardingReadyTitle')}
                  </h2>
                  <p className="text-xs md:text-sm text-on-surface-variant leading-relaxed font-mono px-3">
                    {t('onboardingReadyDesc')}
                  </p>
                  <p className="text-[10px] md:text-xs text-primary-fixed-dim bg-primary-container/5 border border-primary-container/10 rounded-xl p-3 leading-normal font-mono">
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
                    className="flex-1 bg-primary-container text-on-primary-container py-3 rounded-lg font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 hover:opacity-90 active:scale-95 transition-all shadow-[0_0_15px_rgba(var(--primary-rgb),0.1)]"
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
                      className="w-full bg-primary-container text-on-primary text-xs font-black py-3 rounded-lg uppercase tracking-wider flex items-center justify-center gap-1.5 hover:opacity-90 active:scale-[0.97] transition-all shadow-[0_0_20px_rgba(var(--primary-rgb),0.25)]"
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

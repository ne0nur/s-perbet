import { useState, useEffect, useMemo } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { BottomNav } from './BottomNav'
import ColorBends from './ui/ColorBends'
import Dock, { type DockItemData } from './ui/Dock'
import ShinyText from './ui/ShinyText'
import { ToastContainer } from './ToastContainer'
import { useAuthStore } from '../stores/authStore'
import { usePresenceStore } from '../stores/presenceStore'
import { useThemeStore } from '../stores/themeStore'
import { THEME_PRIMARY, THEME_CONTAINER } from '../lib/themeColors'
import type { AppTheme } from '../stores/themeStore'
import { supabase } from '../lib/supabase'
import { calculateLevelDetails, getLevelBadgeStyle } from '../lib/utils'
import { LevelBadge } from './ui/LevelBadge'
import { evaluateAchievements, type TipDetails } from '../utils/achievementEvaluator'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Sparkles, Award, Gift, Rocket, Share2, Table2, Target, Flame, ThumbsUp, Smile, AlertCircle, Skull } from 'lucide-react'
import { usePwaStore } from '../stores/pwaStore'
import { useTranslation } from '../utils/translations'
import { HeaderLogo } from './HeaderLogo'
import { NetworkIndicator } from './NetworkIndicator'
import {
  HoverTrophyIcon, HoverChartBarIcon, HoverUsersIcon, HoverUserIcon,
  HoverGlobeIcon, HoverDownloadIcon
} from './icons/HoverIcons'

/** Simple hex darken — reduces lightness for background depth */
function darkenHex(hex: string, amount: number = 30): string {
  const h = hex.replace('#', '')
  const r = Math.max(0, parseInt(h.slice(0, 2), 16) - amount)
  const g = Math.max(0, parseInt(h.slice(2, 4), 16) - amount)
  const b = Math.max(0, parseInt(h.slice(4, 6), 16) - amount)
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

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

  const { level: dbLevel, xpCurrent: dbXpCurrent, xpRequired: dbXpRequired, xpPct: dbXpPct } = calculateLevelDetails(punkte, achievementsCount, bonusTippsCount)
  // DB-Wert hat Vorrang, client-seitige Berechnung als Fallback
  const [serverLevel, setServerLevel] = useState<number | null>(null)
  const level = serverLevel ?? dbLevel
  const xpCurrent = serverLevel !== null ? (dbXpCurrent) : dbXpCurrent
  const xpRequired = dbXpRequired
  const xpPct = dbXpPct
  const { initPresence, cleanupPresence } = usePresenceStore()

  // ColorBends background — theme-aware color palette
  const theme = useThemeStore(s => s.theme)
  const colorBendsColors = useMemo(() => {
    const primary = THEME_PRIMARY[theme]
    const container = THEME_CONTAINER[theme]
    // Generate a 3-color gradient: primary, darker shade, darker container
    return [primary, container, darkenHex(primary)]
  }, [theme])

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
    supabase.from('profiles').select('gesamt_punkte,level').eq('id', user.id).single()
      .then(({ data }) => {
        if (data) {
          setPunkte(data.gesamt_punkte || 0)
          if (data.level) setServerLevel(data.level)
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

  const dockItems: DockItemData[] = [
    { icon: <HoverTrophyIcon size={22} />,   label: t('games'),   onClick: () => navigate('/dashboard'), active: location.pathname === '/dashboard' },
    { icon: <Table2 size={22} />,            label: t('table'),   onClick: () => navigate('/tabelle'),   active: location.pathname === '/tabelle' },
    { icon: <HoverGlobeIcon size={22} />,    label: t('global'),  onClick: () => navigate('/global'),    active: location.pathname === '/global' },
    { icon: <HoverUsersIcon size={22} />,    label: t('league'),  onClick: () => navigate('/league'),    active: location.pathname === '/league' },
    { icon: <HoverUserIcon size={22} />,     label: t('profile'), onClick: () => navigate('/profile'),   active: location.pathname === '/profile' },
  ]

  return (
    <div className="h-[100dvh] w-full bg-background flex flex-col overflow-hidden select-none" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      <ColorBends colors={colorBendsColors} speed={0.12} scale={0.85} intensity={0.9} />
      <NetworkIndicator />
      
      {/* Desktop Top Bar (hidden on mobile) */}
      <header className="hidden md:flex items-center justify-between px-8 h-16 shrink-0 relative z-20 border-b border-white/[0.03] backdrop-blur-sm">
        <div className="flex items-center gap-3">
          {/* Brand Logo — premium shimmer & animated entry */}
          <HeaderLogo size="md" />
          <span className="text-sm font-black tracking-tight leading-none uppercase">
            <ShinyText text="SÜPERBET" speed={3.5} className="font-extrabold" />
          </span>
          <span className="text-[7px] font-mono font-bold text-on-surface-variant/35 uppercase tracking-[0.3em] leading-none ml-1 mt-px">
            PRIVATE TIPPRUNDE
          </span>
        </div>
        <div className="flex items-center gap-4">
          {/* PWA Install */}
          {isInstallable && (
            <button
              onClick={async () => {
                const success = await triggerInstall()
                if (success) {
                  window.dispatchEvent(new CustomEvent('show-toast', { 
                    detail: { message: t('pwaInstalledToast'), type: 'success' } 
                  }))
                }
              }}
              className="text-[10px] font-mono font-bold uppercase tracking-wider text-on-surface-variant/60 hover:text-primary-fixed-dim transition-colors px-3 py-1.5 rounded-lg hover:bg-white/[0.03]"
            >
              {t('pwaInstallBtn')}
            </button>
          )}
          {/* Share */}
          <button
            onClick={handleShare}
            className="text-[10px] font-mono font-bold uppercase tracking-wider text-on-surface-variant/60 hover:text-on-surface transition-colors px-3 py-1.5 rounded-lg hover:bg-white/[0.03]"
          >
            <Share2 size={14} />
          </button>
          {/* Profile */}
          <button
            onClick={() => navigate('/profile')}
            className={`relative flex items-center gap-2.5 px-3 py-1.5 rounded-xl transition-all ${
              location.pathname === '/profile' ? 'bg-primary-container/10 border border-primary-container/20' : 'hover:bg-white/[0.03] border border-transparent'
            }`}
          >
            <div className="relative shrink-0">
              <div className="w-8 h-8 rounded-full bg-surface-container-high border border-white/10 overflow-hidden flex items-center justify-center">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="w-full h-full object-cover"  loading="lazy" />
                ) : (
                  <span className="text-on-surface-variant text-xs font-mono font-bold">
                    {user?.user_metadata?.username?.[0]?.toUpperCase() || '?'}
                  </span>
                )}
              </div>
              <LevelBadge level={level} className="absolute -bottom-1 -right-1 z-10 text-[7px] h-3 w-3 rounded-full shadow shadow-black/80 select-none level-digit">
                {level}
              </LevelBadge>
            </div>
            <span className="text-xs font-bold text-on-surface hidden lg:block">{user?.user_metadata?.username || t('myProfile')}</span>
          </button>
        </div>
      </header>

      {/* Main Page Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10">
        {/* Mobile Header */}
        {isMainTab && (
          <header className="md:hidden sticky top-0 z-40 bg-surface/60 backdrop-blur-xl border-b border-white/5 shrink-0">
            <div className="flex items-center justify-between px-4 h-14 max-w-lg mx-auto w-full">
              <div className="flex items-center">
                <HeaderLogo size="md" />
              </div>
              <AnimatePresence>
                {location.pathname !== '/profile' && (
                  <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="flex items-center gap-2.5"
                  >
                    <motion.div layoutId="header-exp" className="flex flex-col items-end justify-center">
                      <span className="text-[7px] font-mono text-on-surface-variant/80 uppercase leading-none mb-1">XP: {xpCurrent} / {xpRequired}</span>
                      <div className="w-20 h-1.5 bg-black/50 border border-white/20 rounded-full overflow-hidden p-[0.5px] relative">
                        <div 
                          className="h-full bg-primary rounded-full transition-all duration-1000 ease-out shadow-[0_0_8px_rgba(var(--primary-rgb),0.5)]"
                          style={{ width: `${xpPct}%` }}
                        />
                      </div>
                    </motion.div>
                    <div className="relative shrink-0">
                      <motion.button
                        layoutId="header-avatar"
                        onClick={() => navigate('/profile')}
                        className="w-8 h-8 rounded-full border bg-surface-container-high flex items-center justify-center transition-all border-white/10 hover:border-white/20"
                      >
                        <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center">
                          {avatarUrl ? (
                            <img src={avatarUrl} alt="" className="w-full h-full object-cover"  loading="lazy" />
                          ) : (
                            <span className="text-on-surface-variant text-xs font-mono font-bold">
                              {user?.user_metadata?.username?.[0]?.toUpperCase() || '?'}
                            </span>
                          )}
                        </div>
                      </motion.button>
                      <motion.div layoutId="header-level" className="absolute -bottom-1 -right-1 z-10">
                        <LevelBadge level={level} className="text-[8px] h-4.5 w-4.5 rounded-full shadow shadow-black/80 select-none level-digit">
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

        {/* Content */}
        <main className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <div className="flex-1 flex flex-col min-h-0 md:max-w-[1600px] md:mx-auto md:w-full md:px-6 native-scroll pb-28 md:pb-28">
            <AnimatedOutlet />
          </div>
        </main>
      </div>

      {/* Desktop Floating Dock (hidden on mobile) */}
      <div className="hidden md:block fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <Dock
          items={dockItems}
          magnification={68}
          distance={180}
          baseItemSize={48}
        />
      </div>

      <BottomNav />
      <ToastContainer />

      {showOnboarding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 pt-[calc(1rem+env(safe-area-inset-top,0px))] pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
          <div className="fixed inset-0 bg-black/95 backdrop-blur-md animate-fade-in" />
          
          <div className="relative border border-white/10 rounded-3xl p-8 text-center max-w-md w-full shadow-[0_20px_50px_rgba(0,0,0,0.8),_0_0_40px_rgba(var(--primary-rgb),0.15)] flex flex-col min-h-[490px] justify-between bg-gradient-to-br from-surface-container-high/70 via-surface-container-low/95 to-surface-container-lowest/80 backdrop-blur-xl animate-scale-in">
            {/* Backdrop glowing gradient */}
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-b from-primary-container/10 via-transparent to-transparent pointer-events-none" />

            {/* Carousel Content */}
            <div className="flex-1 flex flex-col justify-center py-2 relative overflow-hidden min-h-[320px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={onboardingSlide}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="w-full flex flex-col justify-center"
                >
                  {onboardingSlide === 0 && (
                    <div className="space-y-5">
                      <div className="relative w-20 h-20 mx-auto mb-4 animate-glow-pulse">
                        <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl" />
                        <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-primary-container/20 to-primary/10 border border-primary/30 flex items-center justify-center shadow-lg">
                          <Sparkles size={36} className="text-primary" />
                        </div>
                      </div>
                      <h2 className="text-2xl font-black text-on-surface tracking-tight" dangerouslySetInnerHTML={{
                        __html: t('onboardingWelcomeTitle', { username: user?.user_metadata?.username || t('onboardingFallbackUsername') })
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

                  {/* === SLIDES 1-7: Punktestufen === */}
                  {onboardingSlide >= 1 && onboardingSlide <= 7 && (() => {
                    const tiers = [
                      { pts: '+4', color: 'emerald', icon: Target, iconColor: 'text-success', tip: '2:1', res: '2:1',
                        de: 'Exakter Treffer', en: 'Exact Hit', tr: 'Tam İsabet' },
                      { pts: '+3', color: 'amber',   icon: Flame, iconColor: 'text-warning', tip: '4:1', res: '3:1',
                        de: 'Sehr nah dran', en: 'Very Close', tr: 'Çok Yakın' },
                      { pts: '+2', color: 'blue',    icon: ThumbsUp, iconColor: 'text-info', tip: '2:0', res: '3:1',
                        de: 'Gute Tendenz', en: 'Good Tendency', tr: 'İyi Eğilim' },
                      { pts: '+1', color: 'purple',  icon: Sparkles, iconColor: 'text-tertiary', tip: '1:0', res: '4:1',
                        de: 'Weit vorbei', en: 'Far Off', tr: 'Uzak Sapma' },
                      { pts: '0',  color: 'slate',   icon: Smile, iconColor: 'text-on-surface-variant/50', tip: '1:1', res: '2:1',
                        de: 'Knapp daneben', en: 'Close Miss', tr: 'Kıl Payı' },
                      { pts: '−1', color: 'red',     icon: AlertCircle, iconColor: 'text-error', tip: '1:2', res: '2:1',
                        de: 'Falscher Sieger', en: 'Wrong Winner', tr: 'Yanlış Kazanan' },
                      { pts: '−2', color: 'red',     icon: Skull, iconColor: 'text-error/80', tip: '0:3', res: '2:1',
                        de: 'Komplett daneben', en: 'Complete Miss', tr: 'Tamamen Karavana' },
                    ]
                    const tier = tiers[onboardingSlide - 1]
                    const cMap: Record<string, string> = { 
                      emerald: 'border-success/35 bg-success-container text-success', 
                      amber: 'border-warning/35 bg-warning-container text-warning', 
                      blue: 'border-info/35 bg-info-container text-info', 
                      purple: 'border-purple-500/25 bg-purple-500/5 text-purple-400', 
                      slate: 'border-slate-500/20 bg-slate-500/5 text-slate-400', 
                      red: 'border-error/25 bg-error-container text-error' 
                    }
                    const c = cMap[tier.color] || cMap.slate
                    const [cBorder, cBg, cText] = c.split(' ')
                    const title = language === 'tr' ? tier.tr : language === 'en' ? tier.en : tier.de
                    const IconComponent = tier.icon

                    return (
                      <div className="space-y-4">
                        <div className="flex justify-center mb-1 drop-shadow-md">
                          <IconComponent size={44} className={tier.iconColor} />
                        </div>
                        <div className={`inline-flex items-center gap-1.5 mx-auto px-5 py-2 rounded-full border shadow-sm ${cBorder} ${cBg}`}>
                          <span className={`text-3xl font-black font-mono leading-none ${cText}`}>{tier.pts}</span>
                          <span className={`text-xs font-mono font-bold leading-none ${cText}`}>{t('onboardingPointsLabel')}</span>
                        </div>
                        <h2 className={`text-lg font-black tracking-wide ${cText}`}>{title}</h2>

                        {/* Match Card */}
                        <div className="relative overflow-hidden rounded-2xl p-4 border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),_0_8px_20px_rgba(0,0,0,0.4)] max-w-[240px] mx-auto bg-gradient-to-br from-white/[0.04] to-white/[0.01]">
                          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
                          <div className="flex items-center justify-between gap-4 relative z-10">
                            <div className="text-left">
                              <span className="text-[9px] text-on-surface-variant/40 font-mono uppercase tracking-wider block mb-1">{t('tipShort')}</span>
                              <span className="font-mono text-2xl font-black text-on-surface tracking-wider">{tier.tip}</span>
                            </div>
                            <div className="h-8 w-px bg-white/10" />
                            <div className="text-right">
                              <span className="text-[9px] text-on-surface-variant/40 font-mono uppercase tracking-wider block mb-1">{t('resultLabel')}</span>
                              <span className="font-mono text-2xl font-black text-on-surface tracking-wider">{tier.res}</span>
                            </div>
                          </div>
                        </div>

                        {/* Visual Breakdown of Distance Equation */}
                        {(() => {
                          const [th, tg] = tier.tip.split(':').map(Number)
                          const [rh, rg] = tier.res.split(':').map(Number)
                          const diffH = Math.abs(th - rh)
                          const diffG = Math.abs(tg - rg)
                          const totalDiff = diffH + diffG
                          return (
                            <div className="mt-4 bg-black/20 border border-white/5 rounded-2xl p-3.5 max-w-[260px] mx-auto text-center space-y-2">
                              <div className="flex justify-between items-center text-[10px] font-mono text-on-surface-variant/60 uppercase tracking-wider">
                                <span>{t('calculationLabel')}</span>
                                <span>|Tipp - Ergebnis|</span>
                              </div>
                              
                              <div className="flex flex-col gap-1.5 pt-0.5">
                                {/* Home */}
                                <div className="flex items-center justify-between text-[11px] font-mono">
                                  <span className="text-on-surface-variant/70">{t('homeLabel')}</span>
                                  <div className="flex items-center gap-1 font-bold">
                                    <span className="bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-[9px]">{th}</span>
                                    <span className="opacity-40">-</span>
                                    <span className="bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-[9px]">{rh}</span>
                                    <span className="opacity-40">=</span>
                                    <span className={cText}>{diffH}</span>
                                  </div>
                                </div>
                                {/* Away */}
                                <div className="flex items-center justify-between text-[11px] font-mono">
                                  <span className="text-on-surface-variant/70">{t('awayLabel')}</span>
                                  <div className="flex items-center gap-1 font-bold">
                                    <span className="bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-[9px]">{tg}</span>
                                    <span className="opacity-40">-</span>
                                    <span className="bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-[9px]">{rg}</span>
                                    <span className="opacity-40">=</span>
                                    <span className={cText}>{diffG}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="h-px bg-white/10" />

                              {/* Total distance / points sum */}
                              <div className="flex justify-between items-center text-[11px] font-mono font-bold">
                                <span className="text-on-surface/90">{t('ruleTotalDistance')}</span>
                                <span className={`px-2 py-0.5 rounded border ${cBorder} ${cBg} ${cText}`}>{totalDiff} {t('goalsLabel')}</span>
                              </div>
                            </div>
                          )
                        })()}

                        <p className="text-[9px] text-on-surface-variant/30 font-mono tracking-widest uppercase">{onboardingSlide} / 7</p>
                      </div>
                    )
                  })()}

                  {onboardingSlide === 8 && (
                    <div className="space-y-5">
                      <div className="relative w-14 h-14 mx-auto mb-1 animate-glow-pulse">
                        <div className="absolute inset-0 bg-purple-500/20 rounded-full blur-lg" />
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
                            {t('onboardingLegend')}
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
                    <div className="space-y-5">
                      <div className="relative w-14 h-14 mx-auto mb-1 animate-glow-pulse">
                        <div className="absolute inset-0 bg-success/20 rounded-full blur-lg" />
                        <div className="relative w-14 h-14 rounded-full bg-success-container border border-success/30 flex items-center justify-center shadow-md">
                          <Award size={24} className="text-success" />
                        </div>
                      </div>
                      <h2 className="text-xl font-black text-on-surface tracking-tight">
                        {t('onboardingAchTitle')}
                      </h2>
                      <p className="text-xs text-on-surface-variant leading-relaxed font-mono px-2" dangerouslySetInnerHTML={{
                        __html: t('onboardingAchDesc')
                          .replace('Erfolge (Badges)', '<span class="text-success font-bold">' + t('onboardingAchievements') + '</span>')
                          .replace('achievements (badges)', '<span class="text-success font-bold">' + t('onboardingAchievements').toLowerCase() + '</span>')
                          .replace('başarının (rozeti)', '<span class="text-success font-bold">' + t('onboardingAchievements') + '</span>')
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
                    <div className="space-y-5">
                      <div className="relative w-14 h-14 mx-auto mb-1 animate-glow-pulse">
                        <div className="absolute inset-0 bg-warning/20 rounded-full blur-lg" />
                        <div className="relative w-14 h-14 rounded-full bg-warning-container border border-warning/30 flex items-center justify-center shadow-md">
                          <Gift size={24} className="text-warning" />
                        </div>
                      </div>
                      <h2 className="text-xl font-black text-on-surface tracking-tight">
                        {t('onboardingBonusTitle')}
                      </h2>
                      <p className="text-xs text-on-surface-variant leading-relaxed font-mono px-2" dangerouslySetInnerHTML={{
                        __html: t('onboardingBonusDesc')
                          .replace('Saison-Wetten', '<span class="text-warning font-bold">Saison-Wetten</span>')
                          .replace('season bets', '<span class="text-warning font-bold">season bets</span>')
                          .replace('sezon tahminlerini', '<span class="text-warning font-bold">sezon tahminlerini</span>')
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
                    <div className="space-y-5">
                      <div className="relative w-20 h-20 mx-auto mb-4 animate-glow-pulse">
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
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Navigation Controls */}
            <div className="mt-4 space-y-4">
              {/* Dot Indicators */}
              <div className="flex justify-center items-center gap-2 h-3 select-none">
                {Array.from({ length: 12 }, (_, idx) => {
                  const isActive = onboardingSlide === idx
                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        if ('vibrate' in navigator) navigator.vibrate(10);
                        setOnboardingSlide(idx);
                      }}
                      className="relative h-1.5 flex items-center cursor-pointer focus:outline-none"
                    >
                      {isActive ? (
                        <motion.div
                          layoutId="onboarding-dot"
                          className="h-1.5 w-6 bg-primary rounded-full shadow-[0_0_10px_rgba(var(--primary-rgb),0.5)]"
                          transition={{ type: "spring", stiffness: 350, damping: 25 }}
                        />
                      ) : (
                        <div className="h-1.5 w-1.5 bg-surface-container-highest rounded-full hover:bg-surface-container-highest/80 transition-colors" />
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                {onboardingSlide > 0 ? (
                  <button
                    onClick={() => {
                      if ('vibrate' in navigator) navigator.vibrate(10);
                      setOnboardingSlide(onboardingSlide - 1);
                    }}
                    className="p-3 bg-surface-container-high border border-surface-container-highest rounded-lg text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer active:scale-95 transition-all"
                  >
                    <ChevronLeft size={16} />
                  </button>
                ) : (
                  <div className="w-[42px] shrink-0" />
                )}

                {onboardingSlide < 11 ? (
                  <button
                    onClick={() => {
                      if ('vibrate' in navigator) navigator.vibrate(10);
                      setOnboardingSlide(onboardingSlide + 1);
                    }}
                    className="flex-1 bg-primary-container text-on-primary-container py-3 rounded-lg font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 hover:opacity-90 active:scale-95 transition-all shadow-[0_0_15px_rgba(var(--primary-rgb),0.1)] cursor-pointer"
                  >
                    {t('onboardingNext')} <ChevronRight size={14} />
                  </button>
                ) : (
                  <div className="flex-1 flex flex-col gap-2">
                    <button
                      onClick={() => {
                        if ('vibrate' in navigator) navigator.vibrate(15);
                        finishOnboarding(true);
                      }}
                      className="w-full bg-warning-container text-warning border border-warning/20 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-warning-container/20 transition-all cursor-pointer"
                    >
                      {t('onboardingBonusTipsBtn')}
                    </button>
                    <button
                      onClick={() => {
                        if ('vibrate' in navigator) navigator.vibrate(20);
                        finishOnboarding(false);
                      }}
                      className="w-full bg-primary-container text-on-primary text-xs font-black py-3 rounded-lg uppercase tracking-wider flex items-center justify-center gap-1.5 hover:opacity-90 active:scale-[0.97] transition-all shadow-[0_0_20px_rgba(var(--primary-rgb),0.25)] cursor-pointer"
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

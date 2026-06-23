import { useState, useEffect } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { BottomNav } from './BottomNav'
import { ToastContainer } from './ToastContainer'
import { useAuthStore } from '../stores/authStore'
import { usePresenceStore } from '../stores/presenceStore'
import { supabase } from '../lib/supabase'
import { calculateLevelDetails, getLevelBadgeStyle } from '../lib/utils'
import { evaluateAchievements } from '../utils/achievementEvaluator'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Trophy, Target, Sparkles, Award, Table2, BarChart2, Users, User, Gift, Rocket, Download } from 'lucide-react'
import { usePwaStore } from '../stores/pwaStore'

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
    } else {
      setShowOnboarding(false)
      cleanupPresence()
    }
  }, [user])

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
          .select('*, matches(spieltag, status, tournament, heim_team, gast_team)')
          .eq('user_id', user.id)

        if (allTips) {
          // Format for evaluator
          const formattedTips = allTips.map(t => ({
            score_team1: t.score_team1,
            score_team2: t.score_team2,
            points: t.points,
            created_at: t.created_at,
            match: {
              spieltag: t.matches?.spieltag,
              status: t.matches?.status,
              home_team_name: t.matches?.heim_team,
              away_team_name: t.matches?.gast_team,
              tournament: t.matches?.tournament
            }
          }))

          const unlockedSet = evaluateAchievements(formattedTips as any, {
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
                  message: `🏆 Du hast ${diff} neue${diff > 1 ? '' : 'n'} Erfolg${diff > 1 ? 'e' : ''} freigeschaltet! Schau in dein Profil.`, 
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

  }, [user, location.pathname])

  const mainTabPaths = ['/dashboard', '/tabelle', '/global', '/league', '/profile']
  const isMainTab = mainTabPaths.includes(location.pathname)

  // Map path to tab display name
  const tabNames: Record<string, string> = {
    '/dashboard': 'Spiele',
    '/tabelle': 'Tabelle',
    '/global': 'Global',
    '/league': 'Liga',
    '/profile': 'Profil',
  }
  const tabName = tabNames[location.pathname] || ''

  const sidebarTabs = [
    { to: '/dashboard', icon: Trophy, label: 'Spiele' },
    { to: '/tabelle', icon: Table2, label: 'Tabelle' },
    { to: '/global', icon: BarChart2, label: 'Global' },
    { to: '/league', icon: Users, label: 'Liga' },
    { to: '/profile', icon: User, label: 'Profil' },
  ]

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Desktop Sidebar Navigation */}
      <aside className="hidden md:flex md:flex-col w-64 border-r border-white/5 bg-surface/30 backdrop-blur-xl shrink-0 p-5 justify-between sticky top-0 h-screen">
        {/* Top: Logo + Nav Links */}
        <div className="space-y-8">
          <span className="superbet-logo-container select-none px-2 block">
            <span className="superbet-text-super text-2xl">SÜPER</span>
            <span className="superbet-badge-bet text-sm ml-1">BET</span>
          </span>
          
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
                    detail: { message: '🎉 App wurde erfolgreich installiert!', type: 'success' } 
                  }))
                }
              }}
              className="w-full bg-primary/5 hover:bg-primary/10 border border-primary/20 hover:border-primary/30 text-primary-fixed-dim p-3 rounded-xl flex items-center gap-2.5 transition-all text-left group cursor-pointer"
            >
              <Download size={14} className="shrink-0 group-hover:translate-y-0.5 transition-transform" />
              <div className="min-w-0">
                <p className="text-[10px] font-mono font-bold uppercase tracking-wider leading-none">App installieren</p>
                <p className="text-[8px] text-on-surface-variant/80 font-mono mt-0.5 truncate leading-none">Direkt vom Desktop starten</p>
              </div>
            </button>
          </div>
        )}

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
              <div className={`absolute -bottom-1 -right-1 z-10 text-[8px] h-3.5 w-3.5 rounded-full flex items-center justify-center shadow shadow-black/80 select-none animate-level-glow ${getLevelBadgeStyle(level)}`}>
                {level}
              </div>
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-xs font-bold text-on-surface truncate">{user?.user_metadata?.username || 'Mein Profil'}</p>
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
                <span className="superbet-logo-container select-none">
                  <span className="superbet-text-super text-xl">SÜPER</span>
                  <span className="superbet-badge-bet text-[11px] ml-0.5">BET</span>
                </span>
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
                  <div className={`absolute -bottom-1 -right-1 z-10 text-[9px] h-4.5 w-4.5 rounded-full flex items-center justify-center shadow shadow-black/80 select-none animate-level-glow ${getLevelBadgeStyle(level)}`}>
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
                  <h2 className="text-xl font-black text-on-surface">
                    {user?.user_metadata?.username ? user.user_metadata.username : 'Bruder'}, willkommen bei <span className="text-primary-fixed-dim">SÜPERBET</span>! 🚀
                  </h2>
                  <p className="text-xs text-on-surface-variant leading-relaxed font-mono">
                    Hier tippst du die Süper Lig mit deinen Cousengs. Keine billigen Emojis, sondern echtes Premium-Feeling!
                  </p>
                  <p className="text-[11px] text-primary-fixed-dim bg-primary-container/10 border border-primary-container/20 rounded-lg p-2.5 leading-normal">
                    Gib deine Tipps ab, sammle XP, steig im Level auf und rasiere die Rangliste auf entspannt.
                  </p>
                </div>
              )}

              {onboardingSlide === 1 && (
                <div className="animate-fade-in space-y-3">
                  <div className="w-12 h-12 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center mx-auto mb-1">
                    <Target size={24} className="text-blue-400" />
                  </div>
                  <h2 className="text-lg font-black text-on-surface">
                    Der Ehren-Punkteschlüssel 🎯
                  </h2>
                  <p className="text-[10px] text-on-surface-variant/80 font-mono mb-2">
                    Jedes getippte Spiel bringt dir Punkte je nach Ergebnis:
                  </p>
                  <div className="space-y-1.5 text-left max-w-[260px] mx-auto text-xs font-mono">
                    <div className="flex items-center gap-2 p-1.5 bg-green-500/5 border border-green-500/20 rounded-md">
                      <span className="w-2.5 h-2.5 rounded-full bg-green-500 shrink-0" />
                      <span className="text-[11px] text-on-surface leading-none"><b>4 Punkte</b>: Exaktes Ergebnis (z.B. Tipp 2:1, Spiel 2:1)</span>
                    </div>
                    <div className="flex items-center gap-2 p-1.5 bg-amber-500/5 border border-amber-500/20 rounded-md">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                      <span className="text-[11px] text-on-surface leading-none"><b>3 Punkte</b>: Differenz (z.B. Tipp 2:1, Spiel 3:2)</span>
                    </div>
                    <div className="flex items-center gap-2 p-1.5 bg-blue-500/5 border border-blue-500/20 rounded-md">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
                      <span className="text-[11px] text-on-surface leading-none"><b>2 Punkte</b>: Tendenz (Hauptsache Sieger stimmt)</span>
                    </div>
                    <div className="flex items-center gap-2 p-1.5 bg-slate-650/5 border border-slate-600/20 rounded-md">
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-500 shrink-0" />
                      <span className="text-[11px] text-on-surface-variant leading-none"><b>0 Punkte</b>: Falscher Tipp. Such dir neues Hobby.</span>
                    </div>
                  </div>
                </div>
              )}

              {onboardingSlide === 2 && (
                <div className="animate-fade-in space-y-4">
                  <div className="w-12 h-12 rounded-full bg-purple-500/10 border border-purple-500/30 flex items-center justify-center mx-auto mb-1">
                    <Trophy size={24} className="text-purple-400" />
                  </div>
                  <h2 className="text-lg font-black text-on-surface">
                    Level Up & Status 🏆
                  </h2>
                  <p className="text-xs text-on-surface-variant leading-relaxed font-mono">
                    Für jeden Punkt erhältst du 1 XP. Je höher dein Level, desto farbiger und glühender wird dein Stufen-Badge:
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
                      <span className="text-[7px] font-mono text-on-surface-variant truncate w-full text-center">Legende</span>
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
                    Die Ränge kannst du jederzeit in deinem Profil einsehen!
                  </p>
                </div>
              )}

              {onboardingSlide === 3 && (
                <div className="animate-fade-in space-y-4">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto mb-1">
                    <Award size={24} className="text-emerald-400" />
                  </div>
                  <h2 className="text-lg font-black text-on-surface">
                    Missionen & Erfolge 🎖️
                  </h2>
                  <p className="text-xs text-on-surface-variant leading-relaxed font-mono">
                    Neben Punkten kannst du auch über 30 exklusive <span className="text-emerald-400 font-bold">Erfolge (Badges)</span> freischalten.
                  </p>
                  <p className="text-[10px] text-on-surface-variant/70 leading-relaxed font-mono bg-surface-container/30 border border-surface-container-highest p-2.5 rounded-lg text-left">
                    Jedes freigeschaltete Badge verleiht deinem Profil nicht nur mehr Glanz, sondern bringt dir direkt einen <span className="text-primary-fixed-dim font-bold">massiven EXP-Boost</span> für dein Level!
                  </p>
                </div>
              )}

              {onboardingSlide === 4 && (
                <div className="animate-fade-in space-y-4">
                  <div className="w-12 h-12 rounded-full bg-orange-500/10 border border-orange-500/30 flex items-center justify-center mx-auto mb-1">
                    <Gift size={24} className="text-orange-400" />
                  </div>
                  <h2 className="text-lg font-black text-on-surface">
                    Vergiss die Bonus-Tipps nicht! 🎁
                  </h2>
                  <p className="text-xs text-on-surface-variant leading-relaxed font-mono">
                    Solange der 2. Spieltag noch nicht angepfiffen wurde, kannst du noch <span className="text-orange-400 font-bold">Saison-Wetten</span> abgeben.
                  </p>
                  <p className="text-[10px] text-on-surface-variant/70 leading-relaxed font-mono bg-surface-container/30 border border-surface-container-highest p-2.5 rounded-lg text-left">
                    Wer wird Meister? Wer schießt die meisten Tore? Sichere dir jetzt die <span className="text-primary-fixed-dim font-bold">fetten Zusatzpunkte & mächtig EXP</span> am Ende der Saison!
                  </p>
                </div>
              )}

              {onboardingSlide === 5 && (
                <div className="animate-fade-in space-y-4">
                  <div className="w-16 h-16 rounded-full bg-primary-container/15 border border-primary-container/30 flex items-center justify-center mx-auto mb-2">
                    <Rocket size={32} className="text-primary-fixed-dim" />
                  </div>
                  <h2 className="text-xl font-black text-on-surface">
                    Bist du bereit, Bruder? 🔥
                  </h2>
                  <p className="text-xs text-on-surface-variant leading-relaxed font-mono">
                    Die Ligen sind heiß, die Tipps geladen. Zeig den Cousengs, wer der wahre Boss-Macher ist und hol dir den Thron!
                  </p>
                  <p className="text-[10px] text-on-surface-variant/40 font-mono">
                    Tippe vor dem Anpfiff. Nachträgliche Tipps sind technisch gesperrt, also verpeil es nicht!
                  </p>
                </div>
              )}
            </div>

            {/* Navigation Controls */}
            <div className="mt-6 space-y-4">
              {/* Dot Indicators */}
              <div className="flex justify-center gap-1.5">
                {[0, 1, 2, 3, 4, 5].map((idx) => (
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

                {onboardingSlide < 5 ? (
                  <button
                    onClick={() => setOnboardingSlide(onboardingSlide + 1)}
                    className="flex-1 bg-primary-container text-on-primary-container py-3 rounded-lg font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 hover:opacity-90 active:scale-95 transition-all shadow-[0_0_15px_rgba(251,191,36,0.1)]"
                  >
                    Weiter <ChevronRight size={14} />
                  </button>
                ) : (
                  <div className="flex-1 flex flex-col gap-2">
                    <button
                      onClick={() => finishOnboarding(true)}
                      className="w-full bg-orange-500/10 text-orange-400 border border-orange-500/20 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-orange-500/20 transition-colors"
                    >
                      Zu den Bonus-Tipps 🎁
                    </button>
                    <button
                      onClick={() => finishOnboarding(false)}
                      className="w-full bg-primary-container text-on-primary text-xs font-black py-3 rounded-lg uppercase tracking-wider flex items-center justify-center gap-1.5 hover:opacity-90 active:scale-[0.97] transition-all shadow-[0_0_20px_rgba(251,191,36,0.25)]"
                    >
                      Bruder, let's go! 🚀
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

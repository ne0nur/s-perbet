import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { HoverTrophyIcon, HoverGlobeIcon, HoverUserIcon, HoverUsersIcon, HoverChartBarIcon } from './icons/HoverIcons'
import { useTranslation } from '../utils/translations'

export function BottomNav() {
  const location = useLocation()
  const { t } = useTranslation()
  const [clickTrigger, setClickTrigger] = useState<Record<string, number>>({})

  const tabs = [
    { to: '/dashboard', icon: HoverTrophyIcon,   label: t('games') },
    { to: '/tabelle',   icon: HoverChartBarIcon, label: t('table') },
    { to: '/global',    icon: HoverGlobeIcon,    label: t('global') },
    { to: '/league',    icon: HoverUsersIcon,    label: t('league') },
    { to: '/profile',   icon: HoverUserIcon,     label: t('profile') },
  ]

  const activeIndex = tabs.findIndex(tab => location.pathname === tab.to)

  const handleTabClick = (to: string) => {
    setClickTrigger(prev => ({
      ...prev,
      [to]: (prev[to] || 0) + 1
    }))
  }

  return (
    <nav className="fixed bottom-[calc(0.75rem+env(safe-area-inset-bottom,0px))] left-0 right-0 z-50 md:hidden select-none px-4 flex justify-center">
      <div className="w-full max-w-md bg-[#0e131f]/75 border border-white/[0.08] backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.6),_0_0_25px_rgba(var(--primary-rgb),0.03)] rounded-2xl">
        <div className="flex justify-center items-center h-[54px] px-1 relative">
          {tabs.map(({ to, icon: Icon, label }, index) => {
            const isActive = activeIndex === index

            return (
              <NavLink
                key={to}
                to={to}
                onClick={() => {
                  if ('vibrate' in navigator) navigator.vibrate(10);
                  handleTabClick(to);
                }}
                className="flex-1 relative cursor-pointer h-full z-10"
              >
                <motion.div
                  whileTap={{ scale: 0.93 }}
                  className="w-full h-full flex flex-col items-center justify-center py-1.5 relative transition-transform duration-100"
                >
                  {/* Premium Sliding Active Pill with Neon Glow Dot */}
                  {isActive && (
                    <motion.div
                      layoutId="bottom-nav-active-glow"
                      className="absolute inset-0 m-auto w-[90%] h-[90%] bg-gradient-to-b from-primary/12 to-primary/4 border border-primary/20 rounded-xl shadow-[0_0_20px_rgba(var(--primary-rgb),0.12)] z-0 flex flex-col justify-end"
                      transition={{
                        type: "spring",
                        stiffness: 380,
                        damping: 28,
                        mass: 0.8
                      }}
                    >
                      {/* Subtles Neon-Licht am Fuß des aktiven Elements */}
                      <div className="h-[2px] w-6 bg-primary mx-auto mb-1 rounded-full shadow-[0_0_8px_rgba(var(--primary-rgb),0.8)]" />
                    </motion.div>
                  )}

                  {/* Icon */}
                  <motion.span 
                    animate={{ 
                      scale: isActive ? 1.06 : 0.95,
                      y: isActive ? -2 : 0 
                    }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    className={`relative z-10 transition-colors duration-300 ease-out ${
                      isActive
                        ? 'text-primary-fixed-dim drop-shadow-[0_0_10px_rgba(var(--primary-rgb),0.5)]'
                        : 'text-on-surface-variant/50'
                    }`}
                  >
                    <Icon
                      size={20}
                      strokeWidth={isActive ? 2.5 : 1.5}
                      trigger={isActive ? (clickTrigger[to] || 0) + 1 : 0}
                    />
                  </motion.span>

                  {/* Label — animated entry, only when active */}
                  <AnimatePresence mode="wait">
                    {isActive && (
                      <motion.span 
                        initial={{ opacity: 0, y: 3, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 3, scale: 0.95 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className="relative z-10 text-[8px] font-mono font-bold tracking-wider uppercase text-primary-fixed-dim mt-0.5"
                      >
                        {label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.div>
              </NavLink>
            )
          })}
        </div>
      </div>
    </nav>
  )
}

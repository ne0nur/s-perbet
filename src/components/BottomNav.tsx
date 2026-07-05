import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { HoverTrophyIcon, HoverGlobeIcon, HoverUserIcon, HoverUsersIcon, HoverChartBarIcon } from './icons/HoverIcons'
import { useTranslation } from '../utils/translations'
import GlassSurface from './ui/GlassSurface'

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
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden select-none pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] pt-1 px-2">
      <GlassSurface blur={40} opacity={0.65} saturation={2.6} className="rounded-2xl">
        <div className="flex justify-center items-center h-[52px] px-1 relative">
          {tabs.map(({ to, icon: Icon, label }, index) => {
            const isActive = activeIndex === index

            return (
              <NavLink
                key={to}
                to={to}
                onClick={() => handleTabClick(to)}
                className="flex-1 flex flex-col items-center justify-center py-1.5 relative active:scale-95 transition-transform duration-150 z-10 cursor-pointer h-full"
              >
                {/* Premium Animated Sliding Pill (Background) */}
                {isActive && (
                  <motion.div
                    layoutId="bottom-nav-indicator"
                    className="absolute inset-0 m-auto w-[85%] h-[85%] bg-primary-container/15 border border-primary-container/20 rounded-xl shadow-[0_0_15px_rgba(var(--primary-rgb),0.15)] z-0"
                    transition={{
                      type: "spring",
                      stiffness: 400,
                      damping: 30,
                      mass: 0.8
                    }}
                  />
                )}

                {/* Icon */}
                <motion.span 
                  animate={{ 
                    scale: isActive ? 1.05 : 0.95,
                    y: isActive ? -4 : 0 
                  }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  className={`relative z-10 transition-colors duration-300 ease-out ${
                    isActive
                      ? 'text-primary-fixed-dim drop-shadow-[0_0_10px_rgba(var(--primary-rgb),0.6)]'
                      : 'text-on-surface-variant/50'
                  }`}
                >
                  <Icon
                    size={22}
                    strokeWidth={isActive ? 2.5 : 1.5}
                    trigger={isActive ? (clickTrigger[to] || 0) + 1 : 0}
                  />
                </motion.span>

                {/* Label — animated entry, only when active to avoid overflows */}
                <AnimatePresence mode="wait">
                  {isActive && (
                    <motion.span 
                      initial={{ opacity: 0, y: 4, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 4, scale: 0.95 }}
                      transition={{ duration: 0.15, ease: "easeOut" }}
                      className="relative z-10 text-[8px] font-mono font-bold tracking-wider uppercase text-primary-fixed-dim mt-0.5"
                    >
                      {label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </NavLink>
            )
          })}
        </div>
      </GlassSurface>
    </nav>
  )
}

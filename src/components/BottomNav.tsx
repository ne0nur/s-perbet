import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
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
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden select-none pb-3 pt-1 px-2">
      <GlassSurface blur={16} opacity={0.25} saturation={1.8} className="rounded-2xl">
      <div className="flex justify-center items-center h-[52px] px-1 relative">\n        {tabs.map(({ to, icon: Icon, label }, index) => {
          const isActive = activeIndex === index

          return (
            <NavLink
              key={to}
              to={to}
              onClick={() => handleTabClick(to)}
              className="flex-1 flex flex-col items-center justify-center gap-1 py-1.5 relative active:scale-95 transition-transform duration-150 z-10 cursor-pointer h-full"
            >
              {/* Premium Animated Sliding Pill (Background) */}
              {isActive && (
                <motion.div
                  layoutId="bottom-nav-indicator"
                  className="absolute inset-0 m-auto w-[82%] h-[82%] bg-primary-container/15 border border-primary-container/30 rounded-xl shadow-[0_0_20px_rgba(var(--primary-rgb),0.15)] z-0"
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
                  scale: isActive ? 1.15 : 1,
                  y: isActive ? -2 : 0 
                }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className={`relative z-10 transition-colors duration-300 ease-out ${
                  isActive
                    ? 'text-primary-fixed-dim drop-shadow-[0_0_10px_rgba(var(--primary-rgb),0.6)]'
                    : 'text-on-surface-variant/60'
                }`}
              >
                <Icon
                  size={22}
                  strokeWidth={isActive ? 2.5 : 1.5}
                  trigger={isActive ? (clickTrigger[to] || 0) + 1 : 0}
                />
              </motion.span>

              {/* Label */}
              <motion.span 
                animate={{ 
                  opacity: isActive ? 1 : 0.6,
                  y: isActive ? 0 : 2
                }}
                className={`relative z-10 text-[9px] font-mono font-bold tracking-widest uppercase transition-colors duration-300 ${
                  isActive ? 'text-primary-fixed-dim' : 'text-on-surface-variant/50'
                }`}
              >
                {label}
              </motion.span>
            </NavLink>
          )
        })}
      </div>
      </GlassSurface>
    </nav>
  )
}

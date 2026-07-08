import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion'
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
      <div className="w-full max-w-md bg-[#0a0d17]/80 border border-white/[0.06] backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.65),_inset_0_1px_1px_rgba(255,255,255,0.03)] rounded-2xl p-1.5">
        <LayoutGroup id="bottom-nav">
          <div className="flex justify-between items-center gap-1 relative h-11">
            {tabs.map(({ to, icon: Icon, label }, index) => {
              const isActive = activeIndex === index

              return (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => {
                    if ('vibrate' in navigator) navigator.vibrate(10)
                    handleTabClick(to)
                  }}
                  className="relative flex items-center justify-center cursor-pointer h-full min-w-0"
                  style={{ flexGrow: isActive ? 2.2 : 1 }}
                >
                  <motion.div
                    layout
                    transition={{
                      type: "spring",
                      stiffness: 380,
                      damping: 30,
                      mass: 0.9
                    }}
                    className={`relative w-full h-full flex items-center justify-center gap-1.5 px-3 rounded-xl z-10 transition-colors duration-300 ${
                      isActive
                        ? 'text-primary-fixed-dim'
                        : 'text-on-surface-variant/40 hover:text-on-surface-variant/70'
                    }`}
                  >
                    {/* Sliding Capsule Indicator */}
                    {isActive && (
                      <motion.div
                        layoutId="bottom-nav-active-bg"
                        className="absolute inset-0 bg-primary-container/15 border border-primary-container/25 rounded-xl shadow-[0_0_15px_rgba(var(--primary-rgb),0.06)] z-0"
                        transition={{
                          type: "spring",
                          stiffness: 380,
                          damping: 30,
                        }}
                      />
                    )}

                    {/* Icon */}
                    <motion.span
                      layout="position"
                      className="relative z-10 flex items-center justify-center"
                    >
                      <Icon
                        size={18}
                        strokeWidth={isActive ? 2.4 : 1.6}
                        trigger={isActive ? (clickTrigger[to] || 0) + 1 : 0}
                      />
                    </motion.span>

                    {/* Label */}
                    <AnimatePresence>
                      {isActive && (
                        <motion.span
                          layout
                          initial={{ opacity: 0, width: 0, x: -4 }}
                          animate={{ opacity: 1, width: 'auto', x: 0 }}
                          exit={{ opacity: 0, width: 0, x: -4 }}
                          transition={{
                            opacity: { duration: 0.12 },
                            width: { duration: 0.18, ease: "easeOut" }
                          }}
                          className="relative z-10 text-[9px] font-mono font-black tracking-wider uppercase whitespace-nowrap overflow-hidden pr-0.5"
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
        </LayoutGroup>
      </div>
    </nav>
  )
}

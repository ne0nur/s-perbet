import { NavLink, useLocation } from 'react-router-dom'
import { Trophy, Table2, BarChart2, Users, User } from 'lucide-react'
import { useTranslation } from '../utils/translations'

export function BottomNav() {
  const location = useLocation()
  const { t } = useTranslation()

  const tabs = [
    { to: '/dashboard', icon: Trophy, label: t('games') },
    { to: '/tabelle', icon: Table2, label: t('table') },
    { to: '/global', icon: BarChart2, label: t('global') },
    { to: '/league', icon: Users, label: t('league') },
    { to: '/profile', icon: User, label: t('profile') },
  ]

  const activeIndex = tabs.findIndex(tab => location.pathname === tab.to)

  return (
    <nav className="fixed bottom-4 left-4 right-4 max-w-md mx-auto z-50 bg-surface/85 backdrop-blur-2xl rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.7)] md:hidden border border-white/10 overflow-hidden">
      <div className="flex justify-around items-center h-[60px] px-1 relative">
        {/* Sliding Pill */}
        {activeIndex !== -1 && (
          <div
            className="absolute top-0 bottom-0 left-0 right-0 flex items-center pointer-events-none z-0"
          >
            <div
              className="w-[20%] flex items-center justify-center"
              style={{
                transform: `translateX(${activeIndex * 100}%)`,
                transition: 'transform 0.32s cubic-bezier(0.34, 1.56, 0.64, 1)',
              }}
            >
              <div className="w-12 h-9 rounded-xl bg-primary-container/12 border border-primary-container/25 shadow-[0_0_15px_rgba(251,191,36,0.1)]" />
            </div>
          </div>
        )}

        {tabs.map(({ to, icon: Icon, label }) => {
          const isActive = location.pathname === to

          return (
            <NavLink
              key={to}
              to={to}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 py-1.5 relative active:scale-90 transition-transform duration-150 z-10 cursor-pointer"
            >
              {/* Icon */}
              <span className={`relative z-10 transition-all duration-300 ease-out ${
                isActive
                  ? 'text-primary-fixed-dim scale-110 drop-shadow-[0_0_8px_rgba(249,189,34,0.5)]'
                  : 'text-on-surface-variant/60 scale-100'
              }`}>
                <Icon
                  size={20}
                  strokeWidth={isActive ? 2.5 : 1.5}
                  className="transition-all duration-300"
                />
              </span>

              {/* Label */}
              <span className={`relative z-10 text-[9px] font-mono font-medium tracking-widest uppercase transition-all duration-300 ${
                isActive ? 'text-primary-fixed-dim' : 'text-on-surface-variant/50'
              }`}>
                {label}
              </span>
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}

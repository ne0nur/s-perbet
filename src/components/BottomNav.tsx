import { NavLink, useLocation } from 'react-router-dom'
import { Trophy, Table2, BarChart2, Users, User } from 'lucide-react'

const tabs = [
  { to: '/dashboard', icon: Trophy, label: 'Spiele' },
  { to: '/tabelle', icon: Table2, label: 'Tabelle' },
  { to: '/global', icon: BarChart2, label: 'Global' },
  { to: '/league', icon: Users, label: 'Liga' },
  { to: '/profile', icon: User, label: 'Profil' },
]

export function BottomNav() {
  const location = useLocation()
  const activeIndex = tabs.findIndex(tab => location.pathname === tab.to)

  return (
    <nav className="fixed bottom-0 w-full z-50 glass-nav md:hidden">
      {/* Trennlinie oben */}
      <div className="h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />

      <div className="flex justify-around items-center h-[68px] px-1 pb-safe relative">
        {/* Sliding Pill */}
        {activeIndex !== -1 && (
          <div
            className="absolute top-0 bottom-0 left-1 right-1 flex items-center pointer-events-none z-0"
            style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
          >
            <div
              className="w-[20%] flex items-center justify-center"
              style={{
                transform: `translateX(${activeIndex * 100}%)`,
                transition: 'transform 0.32s cubic-bezier(0.34, 1.56, 0.64, 1)',
              }}
            >
              <div className="w-12 h-10 rounded-2xl bg-primary-container/12 border border-primary-container/20 shadow-[0_0_15px_rgba(251,191,36,0.05)]" />
            </div>
          </div>
        )}

        {tabs.map(({ to, icon: Icon, label }) => {
          const isActive = location.pathname === to

          return (
            <NavLink
              key={to}
              to={to}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 relative active:scale-90 transition-transform duration-150 z-10"
            >
              {/* Icon */}
              <span className={`relative z-10 transition-all duration-300 ease-out ${
                isActive
                  ? 'text-primary-fixed-dim scale-110 drop-shadow-[0_0_8px_rgba(249,189,34,0.5)]'
                  : 'text-on-surface-variant/60 scale-100'
              }`}>
                <Icon
                  size={21}
                  strokeWidth={isActive ? 2.5 : 1.5}
                  className="transition-all duration-300"
                />
              </span>

              {/* Label */}
              <span className={`relative z-10 text-[10px] font-mono font-medium tracking-widest uppercase transition-all duration-300 ${
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

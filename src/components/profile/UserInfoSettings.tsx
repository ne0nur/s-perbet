import { Camera, ShieldAlert } from 'lucide-react'
import { motion } from 'framer-motion'
import { useTranslation } from '../../utils/translations'
import { useThemeStore } from '../../stores/themeStore'
import { LevelBadge } from '../ui/LevelBadge'

interface UserInfoSettingsProps {
  username: string
  setUsername: (name: string) => void
  avatarUrl: string | null
  uploading: boolean
  fileRef: React.RefObject<HTMLInputElement | null>
  handleBildUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>
  handleUsernameUpdate: () => Promise<void>
  isAdmin: boolean
  userRank: number | null
  levelTitle?: string
  xpCurrent: number
  xpRequired: number
  xpPct: number
  level: number
}

export function UserInfoSettings({
  username,
  setUsername,
  avatarUrl,
  uploading,
  fileRef,
  handleBildUpload,
  handleUsernameUpdate,
  isAdmin,
  userRank,
  levelTitle,
  xpCurrent,
  xpRequired,
  xpPct,
  level
}: UserInfoSettingsProps) {
  const { t } = useTranslation()
  const { theme, setTheme } = useThemeStore()

  return (
    <div className="bg-surface-container-low border border-surface-container-high rounded-xl p-5 shadow-sm">
      <div className="flex items-center gap-5">
        
        {/* Animated Avatar Box */}
        <div className="relative shrink-0">
          <motion.div 
            layoutId="header-avatar"
            className="relative w-[72px] h-[72px] rounded-full border-2 border-primary-container/40 group cursor-pointer shadow-[0_0_20px_rgba(var(--primary-rgb),0.15)] overflow-hidden flex items-center justify-center bg-surface-container-high"
            onClick={() => fileRef.current?.click()}
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="w-full h-full object-cover transition-all group-hover:scale-105" />
            ) : (
              <span className="text-on-surface-variant text-2xl font-bold">{username.slice(0, 1).toUpperCase()}</span>
            )}
            
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm rounded-full flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
              <Camera size={20} className="text-white mb-0.5" />
              <span className="text-[8px] font-bold text-white uppercase tracking-wider">Ändern</span>
            </div>
            
            {uploading && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10">
                <div className="w-6 h-6 border-2 border-primary-container border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </motion.div>
          
          <motion.div layoutId="header-level" className="absolute -bottom-1 -right-1 z-20">
            <LevelBadge level={level} className="text-[12px] h-7 w-7 rounded-full shadow shadow-black/80 select-none level-digit border-2 border-surface-container-low">
              {level}
            </LevelBadge>
          </motion.div>
        </div>
        
        <input ref={fileRef} type="file" accept="image/*" onChange={handleBildUpload} className="hidden" />
        
        <div className="flex-1 min-w-0 text-left flex flex-col justify-center">
          <div className="flex items-center gap-1 mb-1">
            <input
              type="text" value={username}
              onChange={e => setUsername(e.target.value)}
              onBlur={handleUsernameUpdate}
              className="text-lg font-bold text-on-surface bg-transparent outline-none w-full border-b border-transparent hover:border-surface-container-high focus:border-primary transition-colors pb-0.5"
            />
          </div>
          
          {/* Animated EXP Bar */}
          <motion.div layoutId="header-exp" className="flex flex-col mt-1">
            <div className="flex justify-between items-end mb-1.5">
              <span className="text-[9px] font-mono text-on-surface-variant/80 uppercase leading-none">XP: {xpCurrent} / {xpRequired}</span>
              {levelTitle && (
                <span className="text-[9px] font-mono text-primary uppercase font-bold leading-none">{levelTitle}</span>
              )}
            </div>
            <div className="w-full h-3 bg-black/50 border border-white/20 rounded-full overflow-hidden p-[1px] relative">
              <div 
                className="h-full bg-primary rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(var(--primary-rgb),0.5)]"
                style={{ width: `${xpPct}%` }}
              />
            </div>
          </motion.div>
          
          <div className="flex flex-wrap items-center gap-2 mt-3">
            {isAdmin && (
              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-red-400 bg-red-500/10 border border-red-500/20 animate-pulse">
                <ShieldAlert size={10} /> {t('admin')}
              </span>
            )}
            {userRank != null && userRank > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-primary bg-primary-container/10 border border-primary-container/20 font-bold">
                🏆 {t('rank')} {userRank}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Theme Selector */}
      <div className="mt-5 border-t border-surface-container-high/60 pt-4 flex items-center justify-between">
        <span className="text-[10px] font-mono font-bold text-on-surface-variant uppercase tracking-wider">
          App Farbe
        </span>
        <div className="flex gap-2">
          {([
            { id: 'default', color: '#fbbf24' },
            { id: 'blue', color: '#3b82f6' },
            { id: 'red', color: '#ef4444' },
            { id: 'pink', color: '#ec4899' }
          ] as const).map(t => {
            const isActive = theme === t.id
            return (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={`w-5 h-5 rounded-full transition-all duration-300 ${isActive ? 'scale-125 ring-2 ring-white/50 shadow-[0_0_8px_currentColor]' : 'hover:scale-110 opacity-70 hover:opacity-100'}`}
                style={{ backgroundColor: t.color, color: t.color }}
              />
            )
          })}
        </div>
      </div>
      <p className="text-[9px] text-on-surface-variant/40 font-mono mt-4 text-center border-t border-surface-container-high/60 pt-2">
        {t('tapToEditProfile')}
      </p>
    </div>
  )
}

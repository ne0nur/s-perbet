import { Camera, ShieldAlert } from 'lucide-react'
import { useTranslation } from '../../utils/translations'

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
  levelTitle
}: UserInfoSettingsProps) {
  const { t } = useTranslation()

  return (
    <div className="bg-surface-container-low border border-surface-container-high rounded-xl p-5 shadow-sm">
      <div className="flex items-center gap-4">
        <div className="relative w-16 h-16 flex-shrink-0 group cursor-pointer" onClick={() => fileRef.current?.click()}>
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="w-16 h-16 rounded-full object-cover border-2 border-primary-container/40 group-hover:border-primary-container transition-all shadow-[0_0_15px_rgba(251,191,36,0.1)]" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-surface-container-high border-2 border-surface-container-highest flex items-center justify-center group-hover:bg-surface-container-highest transition-colors">
              <span className="text-on-surface-variant text-xl font-bold">{username.slice(0, 1).toUpperCase()}</span>
            </div>
          )}
          <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Camera size={16} className="text-white" />
          </div>
          {uploading && (
            <div className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-primary-container border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" onChange={handleBildUpload} className="hidden" />
        
        <div className="flex-1 min-w-0 text-left">
          <div className="flex items-center gap-1">
            <input
              type="text" value={username}
              onChange={e => setUsername(e.target.value)}
              onBlur={handleUsernameUpdate}
              className="text-base font-bold text-on-surface bg-transparent outline-none w-full border-b border-transparent hover:border-surface-container-high focus:border-primary transition-colors pb-0.5"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            {isAdmin && (
              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-red-400 bg-red-500/10 border border-red-500/20 animate-pulse">
                <ShieldAlert size={10} /> {t('admin')}
              </span>
            )}
            {userRank != null && userRank > 0 ? (
              <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-primary bg-primary-container/10 border border-primary-container/20 font-bold">
                🏆 {t('rank')} {userRank}
              </span>
            ) : levelTitle ? (
              <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-slate-300 bg-surface-container-high border border-surface-container-highest font-medium">
                {levelTitle}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-on-surface-variant/40 bg-surface-container-high border border-surface-container-highest">
                {t('noRank')}
              </span>
            )}
          </div>
        </div>
      </div>
      <p className="text-[9px] text-on-surface-variant/40 font-mono mt-3 text-center border-t border-surface-container-high/60 pt-2">
        {t('tapToEditProfile')}
      </p>
    </div>
  )
}

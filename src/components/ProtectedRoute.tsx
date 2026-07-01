import { useAuthStore } from '../stores/authStore'
import { Navigate, useLocation } from 'react-router-dom'
import { useTranslation } from '../utils/translations'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isEingeloggt, isLaden, mussPasswortAendern } = useAuthStore()
  const { t } = useTranslation()
  const location = useLocation()

  if (isLaden) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="w-6 h-6 border-2 border-primary-container border-t-transparent rounded-full animate-spin" />
        <span className="text-[10px] font-mono text-on-surface-variant/40 uppercase tracking-wider">{t('loading')}</span>
      </div>
    </div>
  )
  if (!isEingeloggt) return <Navigate to="/login" replace />
  if (mussPasswortAendern && location.pathname !== '/passwort-setzen') return <Navigate to="/passwort-setzen" replace />
  return <>{children}</>
}

import { useAuthStore } from '../stores/authStore'
import { Navigate, useLocation } from 'react-router-dom'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isEingeloggt, isLaden, mussPasswortAendern } = useAuthStore()
  const location = useLocation()

  if (isLaden) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="w-6 h-6 border-2 border-primary-container border-t-transparent rounded-full animate-spin" />
        <span className="text-[10px] font-mono text-on-surface-variant/40 uppercase tracking-wider">Laden…</span>
      </div>
    </div>
  )
  if (!isEingeloggt) return <Navigate to="/login" replace />
  if (mussPasswortAendern && location.pathname !== '/passwort-setzen') return <Navigate to="/passwort-setzen" replace />
  return <>{children}</>
}

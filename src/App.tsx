import { useEffect, Suspense, lazy } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
import { AppShell } from './components/AppShell'
import { ProtectedRoute } from './components/ProtectedRoute'
import { SplashPage } from './pages/SplashPage'
import { LoginPage } from './pages/LoginPage'
import { SetPasswordPage } from './pages/SetPasswordPage'

const DashboardPage = lazy(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })))
const MatchDetailPage = lazy(() => import('./pages/MatchDetailPage').then(m => ({ default: m.MatchDetailPage })))
const StandingsPage = lazy(() => import('./pages/StandingsPage').then(m => ({ default: m.StandingsPage })))
const RivalAnalysisPage = lazy(() => import('./pages/RivalAnalysisPage').then(m => ({ default: m.RivalAnalysisPage })))
const GlobalPage = lazy(() => import('./pages/GlobalPage').then(m => ({ default: m.GlobalPage })))
const LeaguePage = lazy(() => import('./pages/LeaguePage').then(m => ({ default: m.LeaguePage })))
const ProfilePage = lazy(() => import('./pages/ProfilePage').then(m => ({ default: m.ProfilePage })))
const RulesPage = lazy(() => import('./pages/RulesPage').then(m => ({ default: m.RulesPage })))

function PageLoader() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="w-6 h-6 border-2 border-primary-container border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

import { usePwaStore } from './stores/pwaStore'

export default function App() {
  const { ladeUser } = useAuthStore()

  useEffect(() => {
    ladeUser()
  }, [ladeUser])

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent browser's default prompt banner
      e.preventDefault()
      // Save prompt event in store
      usePwaStore.getState().setDeferredPrompt(e)
    }

    const handleAppInstalled = () => {
      usePwaStore.getState().setDeferredPrompt(null)
      console.log('App was successfully installed')
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    // Check display mode standalone
    if (window.matchMedia('(display-mode: standalone)').matches) {
      usePwaStore.getState().setIsInstallable(false)
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<SplashPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/passwort-setzen" element={<SetPasswordPage />} />

        <Route element={
          <ProtectedRoute>
            <Suspense fallback={null}>
              <AppShell />
            </Suspense>
          </ProtectedRoute>
        }>
          <Route path="/dashboard" element={<Suspense fallback={<PageLoader />}><DashboardPage /></Suspense>} />
          <Route path="/match/:id" element={<Suspense fallback={<PageLoader />}><MatchDetailPage /></Suspense>} />
          <Route path="/tabelle" element={<Suspense fallback={<PageLoader />}><StandingsPage /></Suspense>} />
          <Route path="/analyse/:userId" element={<Suspense fallback={<PageLoader />}><RivalAnalysisPage /></Suspense>} />
          <Route path="/global" element={<Suspense fallback={<PageLoader />}><GlobalPage /></Suspense>} />
          <Route path="/league" element={<Suspense fallback={<PageLoader />}><LeaguePage /></Suspense>} />
          <Route path="/profile" element={<Suspense fallback={<PageLoader />}><ProfilePage /></Suspense>} />
          <Route path="/rules" element={<Suspense fallback={<PageLoader />}><RulesPage /></Suspense>} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  )
}

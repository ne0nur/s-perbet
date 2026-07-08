import { useEffect, Suspense, lazy } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
import { useSettingsStore } from './stores/settingsStore'
import { AppShell } from './components/AppShell'
import { ProtectedRoute } from './components/ProtectedRoute'
import { ErrorBoundary } from './components/ErrorBoundary'
import { OfflineBanner } from './components/OfflineBanner'
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

import { usePwaStore, type BeforeInstallPromptEvent } from './stores/pwaStore'
import { supabase } from './lib/supabase'
import { useToastStore } from './stores/toastStore'
import { useNetworkStore } from './stores/networkStore'
import { useTranslation } from './utils/translations'

import { useThemeStore } from './stores/themeStore'
import { useTournamentStore } from './stores/tournamentStore'

export default function App() {
  const { theme } = useThemeStore()
  const { ladeUser } = useAuthStore()
  const ladeSettings = useSettingsStore(s => s.ladeSettings)
  const { t } = useTranslation()

  useEffect(() => {
    ladeUser()
    ladeSettings()
    useTournamentStore.getState().ladeTournaments()
  }, [ladeUser, ladeSettings])

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent browser's default prompt banner
      e.preventDefault()
      // Save prompt event in store
      usePwaStore.getState().setDeferredPrompt(e as BeforeInstallPromptEvent)
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

  // Network listener
  useEffect(() => {
    const handleOnline = () => {
      useNetworkStore.getState().setIsOnline(true)
    }
    const handleOffline = () => {
      useNetworkStore.getState().setIsOnline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Service Worker Update-Listener — Auto-Reload bei neuen Versionen (debounced)
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      const handleMessage = (event: MessageEvent) => {
        if (event.data?.type === 'SW_UPDATE') {
          const LAST_RELOAD_KEY = 'sw_last_reload'
          const now = Date.now()
          const lastReload = parseInt(sessionStorage.getItem(LAST_RELOAD_KEY) || '0', 10)
          // Debounce: max 1 Reload alle 30 Sekunden — verhindert Endlos-Loop
          if (now - lastReload < 30000) {
            console.log('🔄 SW-Update ignoriert (Debounce)')
            return
          }
          sessionStorage.setItem(LAST_RELOAD_KEY, String(now))
          console.log('🔄 Neue Version erkannt. Lade neu...')
          window.location.reload()
        }
      }
      navigator.serviceWorker.addEventListener('message', handleMessage)
      return () => navigator.serviceWorker.removeEventListener('message', handleMessage)
    }
  }, [])

  // Admin broadcast polling
  const user = useAuthStore(s => s.user)
  useEffect(() => {
    if (!user) return
    const storageKey = `superbet_last_broadcast_${user.id}`
    const lastSeenId = localStorage.getItem(storageKey)
    supabase.from('admin_broadcasts')
      .select('id, message, created_at')
      .order('id', { ascending: false })
      .limit(1)
      .single()
      .then(({ data }) => {
        if (data && String(data.id) !== lastSeenId) {
          // Zeige die Nachricht nicht für User, die NACH dem Broadcast erstellt wurden
          const userCreatedAt = new Date(user.created_at || Date.now())
          const broadcastCreatedAt = new Date(data.created_at)
          
          if (broadcastCreatedAt > userCreatedAt) {
            useToastStore.getState().toast(`📢 ${data.message}`, 'info')
          }
          localStorage.setItem(storageKey, String(data.id))
        }
      })
  }, [user])

  return (
    <ErrorBoundary>
    <HashRouter>
      <OfflineBanner />
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
    </ErrorBoundary>
  )
}

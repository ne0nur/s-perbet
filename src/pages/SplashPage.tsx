import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { useTranslation } from '../utils/translations'

export function SplashPage() {
  const navigate = useNavigate()
  const { isEingeloggt, isLaden } = useAuthStore()
  const { t } = useTranslation()
  const [logoKicked, setLogoKicked] = useState(false)

  useEffect(() => {
    const tKick = setTimeout(() => setLogoKicked(true), 780)
    return () => clearTimeout(tKick)
  }, [])

  useEffect(() => {
    if (isLaden) return
    if (isEingeloggt) { navigate('/dashboard', { replace: true }); return }
    const t = setTimeout(() => navigate('/login', { replace: true }), 2500)
    return () => clearTimeout(t)
  }, [isEingeloggt, isLaden, navigate])

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center relative overflow-hidden">
      {/* Ambient Glow hinter dem Logo */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-80 h-80 rounded-full bg-primary/5 blur-[120px] animate-pulse" style={{ animationDuration: '3s' }} />
      </div>

      {/* Reinfliegender Fußball */}
      <div className="animate-football-kick">⚽</div>

      <div className={`text-center transition-transform duration-300 ${logoKicked ? 'animate-shake' : ''}`}>
        {/* SVG Logo mit Animation */}
        <div className="relative w-48 h-48 mx-auto mb-6">
          {/* Pulsierender Glow-Ring */}
          <span className="absolute inset-0 rounded-full border border-primary-container/20 animate-ping" style={{ animationDuration: '3s' }} />
          {/* Logo */}
          <img
            src={`${import.meta.env.BASE_URL}logo.svg`}
            alt="SüperBET"
            className="w-full h-full object-contain drop-shadow-[0_0_30px_rgba(251,191,36,0.2)] animate-logo-enter"
          />
        </div>

        <p className="text-on-surface-variant/50 mt-2 text-xs font-mono uppercase tracking-[0.3em]">{t('saisonPredictionLeagueSubtitle')}</p>

        {/* Lade-Indikator */}
        <div className="mt-10 flex items-center justify-center gap-1.5">
          {[0,1,2].map(i => (
            <span
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-primary/60"
              style={{ animation: `blinker 1.2s ease-in-out infinite`, animationDelay: `${i * 200}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

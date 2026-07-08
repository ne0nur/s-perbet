import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { HeaderLogo } from '../components/HeaderLogo'
import { useTranslation } from '../utils/translations'

export function SplashPage() {
  const navigate = useNavigate()
  const { isEingeloggt, isLaden } = useAuthStore()
  const { t } = useTranslation()
  const [logoKicked, setLogoKicked] = useState(false)

  // Kick-Kollision triggert nach ~780ms (wenn der Ball die Mitte trifft)
  useEffect(() => {
    const tKick = setTimeout(() => setLogoKicked(true), 780)
    return () => clearTimeout(tKick)
  }, [])

  useEffect(() => {
    if (isLaden) return
    if (isEingeloggt) { navigate('/dashboard', { replace: true }); return }
    const tRedirect = setTimeout(() => navigate('/login', { replace: true }), 2500)
    return () => clearTimeout(tRedirect)
  }, [isEingeloggt, isLaden, navigate])

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center relative overflow-hidden">
      {/* Reinfliegender Fußball */}
      <div className="animate-football-kick">⚽</div>

      <div className={`text-center transition-transform duration-300 ${logoKicked ? 'animate-shake' : ''}`}>
        
        <div className="mb-4 scale-150 origin-center">
          <HeaderLogo />
        </div>
        
        <p className="text-on-surface-variant/50 mt-8 text-xs font-mono uppercase tracking-[0.3em]">{t('saisonPredictionLeagueSubtitle')}</p>

        {/* Lade-Indikator */}
        <div className="mt-10 flex items-center justify-center gap-1.5">
          {[0,1,2].map(i => (
            <span
              key={i}
              className="w-1 h-1 rounded-full bg-primary-container/50"
              style={{ animation: `blinker 1.2s ease-in-out infinite`, animationDelay: `${i * 200}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

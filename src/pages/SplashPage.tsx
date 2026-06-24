import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { Trophy } from 'lucide-react'
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
    const t = setTimeout(() => navigate('/login', { replace: true }), 2500)
    return () => clearTimeout(t)
  }, [isEingeloggt, isLaden, navigate])

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center relative overflow-hidden">
      {/* Reinfliegender Fußball */}
      <div className="animate-football-kick">⚽</div>

      <div className={`text-center transition-transform duration-300 ${logoKicked ? 'animate-shake' : ''}`}>
        {/* Icon mit Glow-Ring */}
        <div className="relative w-28 h-28 mx-auto mb-8">
          {/* Äußerer pulsierender Ring */}
          <span className="absolute inset-0 rounded-full border border-primary-container/20 animate-ping" style={{ animationDuration: '2.5s' }} />
          {/* Mittlerer Glow */}
          <span className="absolute inset-2 rounded-full bg-primary-container/5 blur-md" />
          {/* Icon-Container */}
          <div className="relative w-full h-full rounded-full bg-gradient-to-br from-primary-container/15 to-primary-container/5 flex items-center justify-center border border-primary-container/20 shadow-[0_0_40px_rgba(251,191,36,0.12)]">
            <Trophy size={52} className="text-primary-fixed-dim drop-shadow-[0_0_12px_rgba(249,189,34,0.4)]" />
          </div>
        </div>

        <div className="superbet-logo-container select-none mb-1">
          <span className="superbet-text-super text-4xl">SÜPER</span>
          <span className="superbet-badge-bet text-3xl ml-1">BET</span>
        </div>
        <p className="text-on-surface-variant/50 mt-3 text-xs font-mono uppercase tracking-[0.3em]">{t('saisonPredictionLeagueSubtitle')}</p>

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

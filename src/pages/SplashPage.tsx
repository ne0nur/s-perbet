import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { useTranslation } from '../utils/translations'

export function SplashPage() {
  const navigate = useNavigate()
  const { isEingeloggt, isLaden } = useAuthStore()
  const { t } = useTranslation()
  const [phase, setPhase] = useState(0) // 0→1→2→3

  // Animations-Sequenz
  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 200)  // Diamond erscheint
    const t2 = setTimeout(() => setPhase(2), 800)  // Text erscheint
    const t3 = setTimeout(() => setPhase(3), 1400) // Glow pulsiert
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [])

  useEffect(() => {
    if (isLaden) return
    if (isEingeloggt) { navigate('/dashboard', { replace: true }); return }
    const t = setTimeout(() => navigate('/login', { replace: true }), 3000)
    return () => clearTimeout(t)
  }, [isEingeloggt, isLaden, navigate])

  return (
    <div className="min-h-screen bg-[#0a0f1a] flex flex-col items-center justify-center relative overflow-hidden">
      {/* Ambient Background Glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-amber-500/5 blur-[150px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full bg-amber-400/10 blur-[80px] animate-pulse" style={{ animationDuration: '2s', animationDelay: '1s' }} />
      </div>

      {/* Partikel (dezent) */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute w-0.5 h-0.5 bg-amber-400/40 rounded-full animate-float-up"
            style={{
              left: `${20 + Math.random() * 60}%`,
              top: `${50 + Math.random() * 40}%`,
              animationDelay: `${i * 0.3 + 0.5}s`,
              animationDuration: `${2 + Math.random() * 3}s`,
            }}
          />
        ))}
      </div>

      {/* Logo + Text */}
      <div className="relative z-10 flex flex-col items-center">
        {/* === INLINE SVG LOGO === */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 400 140"
          className="w-72 h-auto mb-2"
          style={{ filter: 'drop-shadow(0 0 40px rgba(251,191,36,0.15))' }}
        >
          <defs>
            <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#F2C94C"/>
              <stop offset="50%" stopColor="#FBBF24"/>
              <stop offset="100%" stopColor="#D97706"/>
            </linearGradient>
            <linearGradient id="goldShimmer" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#FBBF24" stopOpacity="0"/>
              <stop offset="45%" stopColor="#FFF" stopOpacity="0.6"/>
              <stop offset="55%" stopColor="#FFF" stopOpacity="0.6"/>
              <stop offset="100%" stopColor="#FBBF24" stopOpacity="0"/>
              <animate attributeName="x1" values="-1;2" dur="2s" repeatCount="indefinite"/>
              <animate attributeName="x2" values="0;3" dur="2s" repeatCount="indefinite"/>
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="blur"/>
              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
            <filter id="glowStrong">
              <feGaussianBlur stdDeviation="6" result="blur"/>
              <feMerge><feMergeNode in="blur"/><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>

          {/* === DIAMOND === */}
          <g transform="translate(0, 10)">
            {/* Outer ring (pulses) */}
            <polygon
              points="60,2 118,60 60,118 2,60"
              fill="none"
              stroke="#FBBF24"
              strokeWidth="1"
              opacity={phase >= 1 ? 0.25 : 0}
              style={{ transition: 'opacity 0.8s ease-out' }}
            >
              {phase >= 3 && <animate attributeName="opacity" values="0.25;0.45;0.25" dur="2s" repeatCount="indefinite"/>}
            </polygon>

            {/* Left half (dark gold) */}
            <polygon
              points="60,8 60,112 8,60"
              fill="url(#gold)"
              opacity={phase >= 1 ? 0.12 : 0}
              style={{ transition: 'opacity 0.6s ease-out', transitionDelay: '0.1s' }}
            />

            {/* Right half (bright gold) */}
            <polygon
              points="60,8 112,60 60,112"
              fill="url(#gold)"
              opacity={phase >= 1 ? 0.3 : 0}
              style={{ transition: 'opacity 0.6s ease-out', transitionDelay: '0.2s' }}
            />

            {/* Top triangle */}
            <polygon
              points="60,10 108,58 60,58"
              fill="url(#gold)"
              opacity={phase >= 1 ? 0.55 : 0}
              style={{ transition: 'opacity 0.5s ease-out', transitionDelay: '0.3s' }}
            />

            {/* Bottom triangle */}
            <polygon
              points="60,62 108,62 60,110"
              fill="url(#gold)"
              opacity={phase >= 1 ? 0.2 : 0}
              style={{ transition: 'opacity 0.5s ease-out', transitionDelay: '0.4s' }}
            />

            {/* Main border */}
            <polygon
              points="60,6 114,60 60,114 6,60"
              fill="none"
              stroke="url(#gold)"
              strokeWidth="2"
              opacity={phase >= 1 ? 1 : 0}
              style={{ transition: 'opacity 0.4s ease-out' }}
              strokeDasharray={phase >= 1 ? '0' : '350'}
              strokeDashoffset={phase >= 1 ? '0' : '350'}
            >
              {phase < 1 && <animate attributeName="strokeDashoffset" from="350" to="0" dur="0.6s" fill="freeze"/>}
            </polygon>

            {/* Center line */}
            <line x1="60" y1="14" x2="60" y2="106" stroke="url(#gold)" strokeWidth="1" opacity="0.3"
              style={{ transition: 'opacity 0.8s ease-out', transitionDelay: '0.5s' }}
            />

            {/* Shimmer overlay */}
            <polygon
              points="60,6 114,60 60,114 6,60"
              fill="url(#goldShimmer)"
              opacity="0.5"
              style={{ opacity: phase >= 2 ? 0.5 : 0, transition: 'opacity 0.5s ease-out', transitionDelay: '0.6s' }}
            />

            {/* Center beacon */}
            <circle cx="60" cy="60" r="5" fill="#FBBF24" filter="url(#glowStrong)"
              opacity={phase >= 1 ? 1 : 0}
              style={{ transition: 'opacity 0.4s', transitionDelay: '0.5s' }}
            >
              {phase >= 3 && <animate attributeName="r" values="5;7;5" dur="1.5s" repeatCount="indefinite"/>}
            </circle>
            <circle cx="60" cy="60" r="2" fill="#FFF"
              opacity={phase >= 1 ? 1 : 0}
              style={{ transition: 'opacity 0.3s', transitionDelay: '0.55s' }}
            />
          </g>

          {/* === TEXT: SÜPER === */}
          <text
            x="140"
            y="55"
            fontFamily="'JetBrains Mono', monospace"
            fontSize="38"
            fontWeight="900"
            letterSpacing="8"
            fill="#F2C94C"
            filter="url(#glow)"
            opacity={phase >= 2 ? 1 : 0}
            style={{ transition: 'opacity 0.5s ease-out', transitionDelay: '0s' }}
          >
            SÜPER
          </text>

          {/* === TEXT: BET === */}
          <text
            x="140"
            y="95"
            fontFamily="'JetBrains Mono', monospace"
            fontSize="38"
            fontWeight="200"
            letterSpacing="14"
            fill="#64748B"
            opacity={phase >= 2 ? 1 : 0}
            style={{ transition: 'opacity 0.5s ease-out', transitionDelay: '0.15s' }}
          >
            BET
          </text>

          {/* Gold underline */}
          <rect x="140" y="102" width="190" height="2.5" rx="1.5" fill="url(#gold)" opacity="0.5"
            style={{
              opacity: phase >= 2 ? 0.5 : 0,
              transform: phase >= 2 ? 'scaleX(1)' : 'scaleX(0)',
              transformOrigin: '140px 102px',
              transition: 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s',
              transitionDelay: '0.2s',
            }}
          />
        </svg>

        <p className="text-slate-500/50 mt-4 text-[10px] font-mono uppercase tracking-[0.35em]"
          style={{
            opacity: phase >= 2 ? 0.6 : 0,
            transition: 'opacity 0.6s ease-out',
            transitionDelay: '0.4s',
          }}
        >
          {t('saisonPredictionLeagueSubtitle')}
        </p>
      </div>
    </div>
  )
}

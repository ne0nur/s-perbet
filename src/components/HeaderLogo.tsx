interface HeaderLogoProps {
  size?: 'sm' | 'md'
}

export function HeaderLogo({ size = 'md' }: HeaderLogoProps) {
  const isSm = size === 'sm'

  return (
    <span className={`superbet-header-logo select-none inline-flex items-center gap-0${isSm ? ' scale-75 origin-left' : ''}`}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 370 120"
        className="h-10 w-auto"
        fill="none"
      >
        <defs>
          <linearGradient id="hGoldGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#F2C94C" />
            <stop offset="50%" stopColor="#FBBF24" />
            <stop offset="100%" stopColor="#D97706" />
          </linearGradient>

          <filter id="hGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          <filter id="hGlowStrong" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* === DIAMOND ICON === */}
        <g className="superbet-diamond">
          {/* Äußeres Diamond */}
          <polygon
            points="60,4 116,60 60,116 4,60"
            fill="none"
            stroke="url(#hGoldGrad)"
            strokeWidth="1.5"
            opacity="0.3"
          />
          <polygon
            points="60,8 112,60 60,112 8,60"
            fill="none"
            stroke="url(#hGoldGrad)"
            strokeWidth="2"
          />
          {/* Linke Hälfte */}
          <polygon points="60,10 60,110 10,60" fill="url(#hGoldGrad)" opacity="0.15" />
          {/* Rechte Hälfte */}
          <polygon points="60,10 110,60 60,110" fill="url(#hGoldGrad)" opacity="0.35" />
          {/* Oberes Dreieck */}
          <polygon points="60,12 106,58 60,58" fill="url(#hGoldGrad)" opacity="0.6" />
          {/* Unteres Dreieck */}
          <polygon points="60,62 106,62 60,108" fill="url(#hGoldGrad)" opacity="0.25" />
          {/* Zentrale Linie */}
          <line x1="60" y1="14" x2="60" y2="106" stroke="url(#hGoldGrad)" strokeWidth="1.5" opacity="0.4" />
          {/* Flutlicht-Punkt */}
          <circle cx="60" cy="60" r="4" fill="#FBBF24" filter="url(#hGlowStrong)" />
          <circle cx="60" cy="60" r="2" fill="#FFF" />
        </g>

        {/* === TEXT "SÜPER" === */}
        <text
          className="superbet-text-super-svg"
          x="130"
          y="52"
          fontFamily="'JetBrains Mono', 'Geist', monospace"
          fontSize="34"
          fontWeight="900"
          letterSpacing="8"
          fill="#F2C94C"
          filter="url(#hGlow)"
        >
          SÜPER
        </text>

        {/* === TEXT "BET" === */}
        <text
          className="superbet-text-bet-svg"
          x="130"
          y="92"
          fontFamily="'JetBrains Mono', 'Geist', monospace"
          fontSize="34"
          fontWeight="300"
          letterSpacing="12"
          fill="#94A3B8"
        >
          BET
        </text>

        {/* Goldener Unterstrich */}
        <rect
          className="superbet-underline"
          x="130"
          y="98"
          width="170"
          height="2"
          rx="1"
          fill="url(#hGoldGrad)"
          opacity="0.6"
        />
      </svg>
    </span>
  )
}

/**
 * Header-Logo: Alte Schrift-Effekte (Chromatische Aberration + Neon-Flicker)
 * mit neuen, unabhängigen Animationen für SÜPER & BET.
 * Diamond ersetzt durch Fußball-SVG.
 */

interface HeaderLogoProps {
  size?: 'sm' | 'md'
}

export function HeaderLogo({ size = 'md' }: HeaderLogoProps) {
  const isSm = size === 'sm'
  const textSize = isSm ? 'text-base' : 'text-2xl'
  const badgeSize = isSm ? 'text-[10px]' : 'text-sm'

  return (
    <span className={`superbet-header-logo select-none inline-flex items-center gap-1.5${isSm ? ' scale-75 origin-left' : ''}`}>
      {/* === Fußball (ersetzt Diamond) === */}
      <svg
        viewBox="0 0 40 40"
        className={`superbet-ball shrink-0 ${isSm ? 'w-4 h-4' : 'w-6 h-6'}`}
        fill="none"
      >
        <defs>
          <linearGradient id="ballGoldGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#F2C94C" />
            <stop offset="100%" stopColor="#D97706" />
          </linearGradient>
          <filter id="ballGlow">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {/* Ball-Körper */}
        <circle cx="20" cy="20" r="17" fill="none" stroke="url(#ballGoldGrad)" strokeWidth="1.5" filter="url(#ballGlow)" />
        <circle cx="20" cy="20" r="17" fill="url(#ballGoldGrad)" opacity="0.12" />
        {/* Pentagon-Muster (vereinfacht) */}
        <polygon points="20,8 23,13 28,11 27,16 31,17 28,21 30,26 25,26 23,31 19,29 15,32 15,27 10,28 10,22 7,18 12,16 11,11 16,12" fill="none" stroke="url(#ballGoldGrad)" strokeWidth="0.8" opacity="0.5" />
        {/* Zentrum-Punkt */}
        <circle cx="20" cy="20" r="2.5" fill="#FBBF24" filter="url(#ballGlow)" opacity="0.8" />
      </svg>

      {/* === TEXT (alte Effekte, neue Animationen) === */}
      <span className="superbet-text-super-new">SÜPER</span>
      <span className={`superbet-badge-bet-new ${badgeSize}`}>BET</span>
    </span>
  )
}

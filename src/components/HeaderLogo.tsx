/**
 * Header-Logo: Chromatische Aberration + Neon-Flicker + SVG-3D-Fußball.
 * Animationen: langsamer, sanfter.
 */

interface HeaderLogoProps {
  size?: 'sm' | 'md'
}

function Football3D({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        {/* Leder-Basis-Gradient */}
        <radialGradient id="leather" cx="35%" cy="30%" r="65%">
          <stop offset="0%" stopColor="#fefefe" />
          <stop offset="8%" stopColor="#f5f0e8" />
          <stop offset="30%" stopColor="#e8dcc8" />
          <stop offset="60%" stopColor="#c4a878" />
          <stop offset="85%" stopColor="#8b6914" />
          <stop offset="100%" stopColor="#5c3d0e" />
        </radialGradient>

        {/* 3D-Shading-Overlay */}
        <radialGradient id="shade" cx="35%" cy="30%" r="60%">
          <stop offset="0%" stopColor="white" stopOpacity="0.35" />
          <stop offset="20%" stopColor="white" stopOpacity="0.08" />
          <stop offset="55%" stopColor="black" stopOpacity="0" />
          <stop offset="80%" stopColor="black" stopOpacity="0.25" />
          <stop offset="100%" stopColor="black" stopOpacity="0.5" />
        </radialGradient>

        {/* Pentagon-Patch-Füllung (schwarz) */}
        <radialGradient id="patchBlack" cx="40%" cy="30%" r="60%">
          <stop offset="0%" stopColor="#3a3a3a" />
          <stop offset="100%" stopColor="#111" />
        </radialGradient>

        {/* Pentagon-Patch-Füllung (weiß) */}
        <radialGradient id="patchWhite" cx="40%" cy="30%" r="60%">
          <stop offset="0%" stopColor="#fafaf5" />
          <stop offset="100%" stopColor="#d4c8a8" />
        </radialGradient>

        {/* Specular Highlight */}
        <radialGradient id="spec" cx="28%" cy="22%" r="25%">
          <stop offset="0%" stopColor="white" stopOpacity="0.7" />
          <stop offset="60%" stopColor="white" stopOpacity="0.05" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </radialGradient>

        {/* Drop Shadow Filter */}
        <filter id="ballShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="2" floodColor="#000" floodOpacity="0.5" />
        </filter>
      </defs>

      {/* === BALL-KÖRPER === */}
      <circle cx="24" cy="24" r="21" fill="url(#leather)" filter="url(#ballShadow)" />

      {/* === PENTAGON-PATCHES === */}
      {/* Zentrales schwarzes Pentagon */}
      <polygon
        points="24,12 28.5,15.5 27,21 21,21 19.5,15.5"
        fill="url(#patchBlack)"
        stroke="rgba(0,0,0,0.4)"
        strokeWidth="0.5"
      />

      {/* Obere Reihe weiße Pentagons */}
      <polygon points="14,10 16,7 18,10 16.5,13.5 13.5,12" fill="url(#patchWhite)" stroke="rgba(0,0,0,0.2)" strokeWidth="0.4" />
      <polygon points="20,6 22,3.5 24,7 22.5,10 19.5,9" fill="url(#patchWhite)" stroke="rgba(0,0,0,0.2)" strokeWidth="0.4" />
      <polygon points="28,4 30,2 32,5.5 30,8.5 27.5,7" fill="url(#patchWhite)" stroke="rgba(0,0,0,0.2)" strokeWidth="0.4" />
      <polygon points="34,8 36.5,6.5 38,10 36,13 33,11.5" fill="url(#patchWhite)" stroke="rgba(0,0,0,0.2)" strokeWidth="0.4" />

      {/* Untere Reihe weiße Pentagons */}
      <polygon points="14,16 12,18.5 10.5,15.5 13,13 15.5,14" fill="url(#patchWhite)" stroke="rgba(0,0,0,0.2)" strokeWidth="0.4" />
      <polygon points="38,16 40,18 38.5,21 36,19 35.5,16" fill="url(#patchWhite)" stroke="rgba(0,0,0,0.2)" strokeWidth="0.4" />
      <polygon points="16,22 14,25 11.5,23 13,20 15,19.5" fill="url(#patchWhite)" stroke="rgba(0,0,0,0.2)" strokeWidth="0.4" />
      <polygon points="40,24 42,26.5 40,29.5 37.5,27 37,24" fill="url(#patchWhite)" stroke="rgba(0,0,0,0.2)" strokeWidth="0.4" />

      {/* Untere Pentagons */}
      <polygon points="24,32 26.5,34.5 28,30.5 25.5,28 22.5,29" fill="url(#patchWhite)" stroke="rgba(0,0,0,0.2)" strokeWidth="0.4" />
      <polygon points="16,30 14,33 12,29.5 14.5,27 17,28" fill="url(#patchBlack)" stroke="rgba(0,0,0,0.35)" strokeWidth="0.5" />
      <polygon points="32,36 34,39 31.5,41 29,38.5 29,35.5" fill="url(#patchWhite)" stroke="rgba(0,0,0,0.2)" strokeWidth="0.4" />
      <polygon points="20,38 18,41 16,38 18,35.5 21,36" fill="url(#patchWhite)" stroke="rgba(0,0,0,0.2)" strokeWidth="0.4" />

      {/* Unterster Patch */}
      <polygon points="24,40 26.5,42.5 24,45 21.5,42.5" fill="url(#patchBlack)" stroke="rgba(0,0,0,0.35)" strokeWidth="0.5" />

      {/* === 3D-SHADING === */}
      <circle cx="24" cy="24" r="21" fill="url(#shade)" />

      {/* === SPECULAR HIGHLIGHT === */}
      <circle cx="24" cy="24" r="21" fill="url(#spec)" />

      {/* === NAHT-LINIEN === */}
      <g stroke="rgba(0,0,0,0.25)" strokeWidth="0.5" fill="none">
        {/* Vertikal */}
        <line x1="24" y1="3.5" x2="24" y2="44.5" />
        {/* Horizontal */}
        <line x1="3.5" y1="24" x2="44.5" y2="24" />
        {/* Diagonal */}
        <line x1="9" y1="9" x2="39" y2="39" />
        <line x1="39" y1="9" x2="9" y2="39" />
      </g>
    </svg>
  )
}

export function HeaderLogo({ size = 'md' }: HeaderLogoProps) {
  const isSm = size === 'sm'
  const ballSize = isSm ? 'w-5 h-5' : 'w-7 h-7'

  return (
    <span className={`superbet-header-logo select-none inline-flex items-center gap-1.5${isSm ? ' scale-75 origin-left' : ''}`}>
      {/* 3D-Fußball */}
      <Football3D className={`${ballSize} superbet-ball-3d shrink-0`} />

      {/* Text */}
      <span className="superbet-text-super-new">SÜPER</span>
      <span className={`superbet-badge-bet-new ${isSm ? 'text-[10px]' : 'text-sm'}`}>BET</span>
    </span>
  )
}

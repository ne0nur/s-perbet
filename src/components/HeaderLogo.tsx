/**
 * Header-Logo: Alte Schrift-Effekte (Chromatische Aberration + Neon-Flicker)
 * mit unabhängigen Animationen + CSS-3D-Fußball.
 */

interface HeaderLogoProps {
  size?: 'sm' | 'md'
}

export function HeaderLogo({ size = 'md' }: HeaderLogoProps) {
  const isSm = size === 'sm'
  const ballSize = isSm ? 'w-5 h-5' : 'w-7 h-7'

  return (
    <span className={`superbet-header-logo select-none inline-flex items-center gap-1.5${isSm ? ' scale-75 origin-left' : ''}`}>
      {/* === CSS 3D-Fußball === */}
      <span className={`superbet-ball-3d ${ballSize} shrink-0 relative`}>
        {/* Kugel-Körper mit 3D-Gradient */}
        <span className="absolute inset-0 rounded-full bg-radial-3d" />
        {/* Glanzlicht */}
        <span className="absolute top-[8%] left-[15%] w-[30%] h-[25%] rounded-full bg-white/30 blur-[1px]" />
        {/* Kleineres Glanzlicht */}
        <span className="absolute top-[18%] left-[25%] w-[12%] h-[10%] rounded-full bg-white/50 blur-[0.5px]" />
        {/* Pentagon-Nähte (vereinfacht als Pseudoelemente via border) */}
        <span className="absolute inset-0 rounded-full border border-amber-600/30" />
        <span className="superbet-ball-seams absolute inset-0 rounded-full" />
      </span>

      {/* === TEXT === */}
      <span className="superbet-text-super-new">SÜPER</span>
      <span className={`superbet-badge-bet-new ${isSm ? 'text-[10px]' : 'text-sm'}`}>BET</span>
    </span>
  )
}

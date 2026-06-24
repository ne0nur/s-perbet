/**
 * Header-Logo: Chromatische Aberration + Neon-Flicker + echtes 3D-Modell (GLB).
 * Animationen: langsam, sanft.
 */

import { Football3D } from './Football3D'

interface HeaderLogoProps {
  size?: 'sm' | 'md'
}

export function HeaderLogo({ size = 'md' }: HeaderLogoProps) {
  const isSm = size === 'sm'
  const ballSize = isSm ? 'w-5 h-5' : 'w-7 h-7'

  return (
    <span className={`superbet-header-logo select-none inline-flex items-center gap-1.5${isSm ? ' scale-75 origin-left' : ''}`}>
      {/* Echtes 3D-Fußball-Modell */}
      <Football3D className={ballSize} />

      {/* Text */}
      <span className="superbet-text-super-new">SÜPER</span>
      <span className={`superbet-badge-bet-new ${isSm ? 'text-[10px]' : 'text-sm'}`}>BET</span>
    </span>
  )
}

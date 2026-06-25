/**
 * Header-Logo: Chromatische Aberration + Neon-Flicker + echtes 3D-Modell (GLB).
 * Animationen: langsam, sanft.
 */

import { useState } from 'react'
import { Football3D } from './Football3D'

interface HeaderLogoProps {
  size?: 'sm' | 'md'
}

export function HeaderLogo({ size = 'md' }: HeaderLogoProps) {
  const isSm = size === 'sm'
  const ballSize = isSm ? 'w-12 h-12 -mr-1.5' : 'w-16 h-16 -mr-2.5'

  const [isHovered, setIsHovered] = useState(false)
  const [isKicked, setIsKicked] = useState(false)
  const [superShake, setSuperShake] = useState(false)
  const [betFlicker, setBetFlicker] = useState(false)

  const handleKick = () => {
    if (isKicked) return
    setIsKicked(true)

    // Ball starts moving.
    // At t = 300ms, the ball hits "SÜPER"
    setTimeout(() => {
      setSuperShake(true)
    }, 300)

    // At t = 450ms, the impact energy reaches "BET"
    setTimeout(() => {
      setBetFlicker(true)
    }, 450)

    // Reset ball kick and super shake state
    setTimeout(() => {
      setIsKicked(false)
      setSuperShake(false)
    }, 950)

    // Reset bet flicker state
    setTimeout(() => {
      setBetFlicker(false)
    }, 1350)
  }

  return (
    <span
      className={`superbet-header-logo select-none inline-flex items-center gap-1.5 cursor-pointer${isSm ? ' scale-90 origin-left' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleKick}
    >
      {/* Echtes 3D-Fußball-Modell mit Wave-Effekt und CSS-Hopser */}
      <span 
        className={`animate-logo-float inline-flex ${isKicked ? 'animate-ball-hop' : ''}`} 
        style={{ '--float-delay': '0s' } as React.CSSProperties}
      >
        <Football3D 
          className={ballSize} 
          isHovered={isHovered} 
          isKicked={isKicked} 
          onKick={handleKick} 
        />
      </span>

      {/* Text SÜPER mit Wave-Effekt und Hit-Erschütterung */}
      <span 
        className={`animate-logo-float inline-flex ${superShake ? 'animate-super-hit' : ''}`} 
        style={{ '--float-delay': '0.12s' } as React.CSSProperties}
      >
        <span className={`superbet-text-super-new ${isHovered ? 'hover-glow' : ''}`}>
          SÜPER
        </span>
      </span>

      {/* Badge BET mit Wave-Effekt und Flicker-Entladung */}
      <span 
        className={`animate-logo-float inline-flex ${betFlicker ? 'animate-bet-discharge' : ''}`} 
        style={{ '--float-delay': '0.24s' } as React.CSSProperties}
      >
        <span className={`superbet-badge-bet-new ${isSm ? 'text-[10px]' : 'text-sm'} ${isHovered ? 'hover-glow' : ''}`}>
          BET
        </span>
      </span>
    </span>
  )
}


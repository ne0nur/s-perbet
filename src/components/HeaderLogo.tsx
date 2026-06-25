/**
 * Header-Logo: Chromatische Aberration + Neon-Flicker + echtes 3D-Modell (GLB).
 * Text mittig über dem 3D-Ball.
 */

import { useState } from 'react'
import { Football3D } from './Football3D'

interface HeaderLogoProps {
  size?: 'sm' | 'md'
}

export function HeaderLogo({ size = 'md' }: HeaderLogoProps) {
  const isSm = size === 'sm'
  const ballSize = isSm ? 'w-12 h-12' : 'w-16 h-16'

  const [isHovered, setIsHovered] = useState(false)
  const [isKicked, setIsKicked] = useState(false)
  const [superShake, setSuperShake] = useState(false)
  const [betFlicker, setBetFlicker] = useState(false)

  const handleKick = () => {
    if (isKicked) return
    setIsKicked(true)
    setTimeout(() => setSuperShake(true), 300)
    setTimeout(() => setBetFlicker(true), 450)
    setTimeout(() => { setIsKicked(false); setSuperShake(false) }, 950)
    setTimeout(() => setBetFlicker(false), 1350)
  }

  return (
    <span
      className={`superbet-header-logo select-none inline-flex flex-col items-center gap-1 cursor-pointer${isSm ? ' scale-90 origin-top' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleKick}
    >
      {/* === TEXT-REIHE (SÜPER + BET) mittig über dem Ball === */}
      <span className="inline-flex items-center gap-1.5">
        {/* SÜPER */}
        <span
          className={`animate-logo-float inline-flex ${superShake ? 'animate-super-hit' : ''}`}
          style={{ '--float-delay': '0.12s' } as React.CSSProperties}
        >
          <span className={`superbet-text-super-new ${isHovered ? 'hover-glow' : ''}`}>
            SÜPER
          </span>
        </span>

        {/* BET Badge */}
        <span
          className={`animate-logo-float inline-flex ${betFlicker ? 'animate-bet-discharge' : ''}`}
          style={{ '--float-delay': '0.24s' } as React.CSSProperties}
        >
          <span className={`superbet-badge-bet-new ${isSm ? 'text-[10px]' : 'text-sm'} ${isHovered ? 'hover-glow' : ''}`}>
            BET
          </span>
        </span>
      </span>

      {/* === 3D-BALL (unter dem Text) === */}
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
    </span>
  )
}

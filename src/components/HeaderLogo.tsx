/**
 * Header-Logo: Text als Overlay über dem 3D-Ball.
 * Ball größer, Text absolut positioniert zentriert darauf.
 */

import { useState } from 'react'
import { Football3D } from './Football3D'

interface HeaderLogoProps {
  size?: 'sm' | 'md'
}

export function HeaderLogo({ size = 'md' }: HeaderLogoProps) {
  const isSm = size === 'sm'
  const ballSize = isSm ? 'w-[84px] h-[84px]' : 'w-[120px] h-[120px]'

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
      className={`superbet-header-logo select-none inline-flex cursor-pointer${isSm ? ' scale-90 origin-center' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleKick}
    >
      {/* Container: Ball als Basis, Text absolut drüber */}
      <span className="relative inline-flex items-center justify-center">
        {/* 3D-Ball (groß) */}
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

        {/* Text-Overlay (absolut positioniert auf dem Ball) */}
        <span className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          {/* SÜPER */}
          <span
            className={`animate-logo-float inline-flex ${superShake ? 'animate-super-hit' : ''}`}
            style={{ '--float-delay': '0.12s' } as React.CSSProperties}
          >
            <span className={`superbet-text-super-new text-sm ${isHovered ? 'hover-glow' : ''}`}>
              SÜPER
            </span>
          </span>

          {/* BET Badge */}
          <span
            className={`animate-logo-float inline-flex ${betFlicker ? 'animate-bet-discharge' : ''}`}
            style={{ '--float-delay': '0.24s' } as React.CSSProperties}
          >
            <span className={`superbet-badge-bet-new text-[9px] ${isHovered ? 'hover-glow' : ''}`}>
              BET
            </span>
          </span>
        </span>
      </span>
    </span>
  )
}

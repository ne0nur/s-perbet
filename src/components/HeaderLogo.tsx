/**
 * Header-Logo: "SÜPER" + "BET" Badge — Monr Font, kein 3D-Objekt.
 */

import { useState } from 'react'

interface HeaderLogoProps {
  size?: 'sm' | 'md'
}

export function HeaderLogo({ size = 'md' }: HeaderLogoProps) {
  const isSm = size === 'sm'

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
      <span className="inline-flex flex-col items-center justify-center">
        {/* SÜPER */}
        <span
          className={`animate-logo-float inline-flex ${superShake ? 'animate-super-hit' : ''}`}
          style={{ '--float-delay': '0.12s' } as React.CSSProperties}
        >
          <span className={`superbet-text-super-new ${isSm ? 'text-2xl' : 'text-4xl'} ${isHovered ? 'hover-glow' : ''}`}>
            SÜPER
          </span>
        </span>

        {/* BET Badge */}
        <span
          className={`animate-logo-float inline-flex ${betFlicker ? 'animate-bet-discharge' : ''}`}
          style={{ '--float-delay': '0.24s' } as React.CSSProperties}
        >
          <span className={`superbet-badge-bet-new ${isSm ? 'text-[9px]' : 'text-xs'} ${isHovered ? 'hover-glow' : ''}`}>
            BET
          </span>
        </span>
      </span>
    </span>
  )
}

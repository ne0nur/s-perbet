import { useMemo } from 'react'

interface Particle {
  id: number
  x: number       // 0–100 (%)
  y: number       // 0–100 (%)
  size: number    // px
  dur: number     // animation-duration in s
  delay: number   // animation-delay in s
  hue: number     // 0–360 color shift
  opac: number    // peak opacity
}

function pseudoRand(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}

function generateParticles(level: number, compact: boolean): Particle[] {
  const count = compact
    ? Math.max(0, Math.floor(level / 2))
    : level >= 13 ? 8
    : level >= 11 ? 6
    : level >= 9  ? 5
    : level >= 7  ? 4
    : level >= 5  ? 3
    : level >= 3  ? 2
    : 0

  const seed = level * 137 + (compact ? 500 : 0)
  const particles: Particle[] = []

  for (let i = 0; i < count; i++) {
    const s = seed + i * 7
    particles.push({
      id: i,
      x: 25 + pseudoRand(s) * 50,           // 25–75% — stay within badge bounds
      y: 25 + pseudoRand(s + 1) * 50,
      size: 1.2 + pseudoRand(s + 2) * 2.8,  // 1.2–4px
      dur: 2 + pseudoRand(s + 3) * 3.5,     // 2–5.5s
      delay: pseudoRand(s + 4) * 3,         // 0–3s
      hue: Math.floor(pseudoRand(s + 5) * 40 - 20), // ±20 hue shift
      opac: 0.5 + pseudoRand(s + 6) * 0.5,  // 0.5–1.0
    })
  }

  return particles
}

interface BadgeParticlesProps {
  level: number
  accentColor?: string  // tailwind color like '#fbbf24'
  compact?: boolean
}

export function BadgeParticles({ level, accentColor = '#fbbf24', compact = false }: BadgeParticlesProps) {
  const particles = useMemo(() => generateParticles(level, compact), [level, compact])

  if (particles.length === 0) return null

  return (
    <div
      className="absolute inset-0 pointer-events-none z-0"
      aria-hidden="true"
    >
      {particles.map((p) => (
        <span
          key={p.id}
          className="absolute rounded-full animate-particle-float"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: accentColor,
            filter: `hue-rotate(${p.hue}deg)`,
            boxShadow: `0 0 ${p.size * 3}px ${accentColor}`,
            animationDuration: `${p.dur}s`,
            animationDelay: `${p.delay}s`,
            '--peak-opacity': p.opac,
          } as React.CSSProperties}
        />
      ))}
    </div>
  )
}

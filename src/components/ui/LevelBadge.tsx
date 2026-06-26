import React, { useMemo } from 'react';
import { getLevelBadgeStyle } from '../../lib/utils';

interface LevelBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  level: number;
  children?: React.ReactNode;
}

function pseudoRand(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

// Escalating per level — floor(lvl × 0.5) + 3 → 3 at lvl 1, 18 at lvl 30
function getParticleCount(level: number): number {
  return Math.floor(level * 0.5) + 3;
}

// AAA palette: warm gold base, platinum at high tiers
function getParticleGlow(level: number): string {
  if (level >= 30) return 'rgba(255,255,255,0.7)';    // pure platinum
  if (level >= 24) return 'rgba(226,232,240,0.65)';    // cool platinum
  if (level >= 20) return 'rgba(254,215,170,0.65)';    // warm platinum
  if (level >= 10) return 'rgba(251,191,36,0.55)';     // soft gold
  return 'rgba(251,191,36,0.4)';                        // subtle gold
}

export function LevelBadge({ level, className = '', children, ...props }: LevelBadgeProps) {
  const baseStyle = getLevelBadgeStyle(level);

  const particles = useMemo(() => {
    const count = getParticleCount(level);
    const seed = level * 137;
    const glow = getParticleGlow(level);
    const p: Array<{
      id: number;
      size: number;
      left: string;
      top: string;     // spawn from bottom area
      dur: string;
      delay: string;
      sway: string;    // CSS var for horizontal oscillation
      opacity: number;
      glow: string;
      behind: boolean;
    }> = [];

    for (let i = 0; i < count; i++) {
      const s = seed + i * 11;

      // Subtle size: 1–2.5px — delicate sparkle
      const size = 1 + pseudoRand(s + 2) * 1.5;

      // Spawn from bottom 60% of badge area, float upward
      const left = 20 + pseudoRand(s) * 60;      // 20–80% horizontal
      const top = 55 + pseudoRand(s + 1) * 40;    // 55–95% (bottom area)

      // Slow, deliberate: 3–6s per cycle
      const dur = 3.5 + pseudoRand(s + 3) * 2.5;

      // Staggered delays for continuous gentle flow
      const delay = pseudoRand(s + 4) * 3;

      // Subtle horizontal sway: 1–4px
      const sway = (1 + pseudoRand(s + 5) * 3).toFixed(1);

      // Soft opacity: never full blast
      const opacity = 0.35 + pseudoRand(s + 6) * 0.35;

      // 40% behind badge for depth
      const behind = pseudoRand(s + 7) < 0.4;

      p.push({
        id: i,
        size,
        left: `${left}%`,
        top: `${top}%`,
        dur: `${dur}s`,
        delay: `${delay}s`,
        sway: `${sway}px`,
        opacity,
        glow,
        behind,
      });
    }
    return p;
  }, [level]);

  const behindParticles = particles.filter(p => p.behind);
  const frontParticles = particles.filter(p => !p.behind);

  return (
    <div className={`relative flex items-center justify-center ${className}`} {...props}>
      {/* ── BEHIND: subtle depth particles ── */}
      {behindParticles.length > 0 && (
        <div className="absolute inset-[-2px] pointer-events-none z-0 overflow-visible">
          {behindParticles.map(p => (
            <div
              key={`b-${p.id}`}
              className="absolute rounded-full animate-particle-float"
              style={{
                width: `${p.size}px`,
                height: `${p.size}px`,
                left: p.left,
                top: p.top,
                opacity: p.opacity * 0.5,
                animationDuration: p.dur,
                animationDelay: p.delay,
                '--sway': p.sway,
                boxShadow: `0 0 ${p.size * 3}px ${p.glow}`,
                background: 'rgba(255,255,255,0.7)',
              } as React.CSSProperties}
            />
          ))}
        </div>
      )}

      {/* ── BADGE ── */}
      <div className={`absolute inset-0 rounded-[inherit] overflow-hidden ${baseStyle}`} />

      {/* ── FRONT: delicate sparkles over badge ── */}
      {frontParticles.length > 0 && (
        <div className="absolute inset-[-2px] pointer-events-none z-20 overflow-visible">
          {frontParticles.map(p => (
            <div
              key={`f-${p.id}`}
              className="absolute rounded-full animate-particle-float"
              style={{
                width: `${p.size}px`,
                height: `${p.size}px`,
                left: p.left,
                top: p.top,
                opacity: p.opacity,
                animationDuration: p.dur,
                animationDelay: p.delay,
                '--sway': p.sway,
                boxShadow: `0 0 ${p.size * 4}px ${p.glow}, 0 0 ${p.size * 8}px ${p.glow}`,
                background: 'rgba(255,255,255,0.85)',
              } as React.CSSProperties}
            />
          ))}
        </div>
      )}

      {/* ── CONTENT ── */}
      <div className="relative z-30 flex flex-col items-center justify-center w-full h-full">
        {children}
      </div>
    </div>
  );
}

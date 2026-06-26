import React, { useMemo } from 'react';
import { getLevelBadgeStyle } from '../../lib/utils';

interface LevelBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  level: number;
  children?: React.ReactNode;
}

// Deterministic pseudo-random — same level always produces same particles
function pseudoRand(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function getParticleCount(level: number): number {
  return Math.floor(level * 0.6) + 2;
}

function getGlowColor(level: number): string {
  if (level >= 30) return 'rgba(255,255,255,0.9)';   // gojo: pure white
  if (level >= 27) return 'rgba(192,132,252,0.85)';    // amethyst: bright purple
  if (level >= 24) return 'rgba(56,189,248,0.85)';     // sapphire: bright cyan
  if (level >= 20) return 'rgba(251,113,133,0.85)';    // ruby: bright red
  if (level >= 10) return 'rgba(52,211,153,0.8)';      // emerald: bright green
  if (level >= 5)  return 'rgba(96,165,250,0.8)';      // blue
  return 'rgba(148,163,184,0.65)';                      // slate (lvl 1-4)
}

export function LevelBadge({ level, className = '', children, ...props }: LevelBadgeProps) {
  const baseStyle = getLevelBadgeStyle(level);

  const particles = useMemo(() => {
    const count = getParticleCount(level);
    const seed = level * 137;
    const glow = getGlowColor(level);
    const p: Array<{
      id: number;
      size: number;
      left: string;
      top: string;
      dur: string;
      delay: string;
      opacity: number;
      glow: string;
      behind: boolean;
    }> = [];

    for (let i = 0; i < count; i++) {
      const s = seed + i * 7;

      // Gojo-level: occasional colored particle for variety
      let particleGlow = glow;
      if (level >= 30) {
        const r = pseudoRand(s + 10);
        if (r < 0.33) particleGlow = 'rgba(6,182,212,0.9)';      // cyan
        else if (r < 0.66) particleGlow = 'rgba(168,85,247,0.9)'; // purple
      }

      const size = 1.5 + pseudoRand(s + 2) * 2.5;  // 1.5–4px
      const left = 10 + pseudoRand(s) * 80;          // 10–90%
      const top = 10 + pseudoRand(s + 1) * 80;
      const dur = 2 + pseudoRand(s + 3) * 3;         // 2–5s
      const delay = pseudoRand(s + 4) * 3;           // 0–3s
      const opacity = 0.45 + pseudoRand(s + 5) * 0.55; // 0.45–1.0
      const behind = pseudoRand(s + 6) < 0.4;        // 40% behind badge

      p.push({ id: i, size, left: `${left}%`, top: `${top}%`, dur: `${dur}s`, delay: `${delay}s`, opacity, glow: particleGlow, behind });
    }
    return p;
  }, [level]);

  const behindParticles = particles.filter(p => p.behind);
  const frontParticles = particles.filter(p => !p.behind);

  return (
    <div className={`relative flex items-center justify-center ${className}`} {...props}>
      {/* ── BEHIND: particles rendered under the badge ── */}
      {behindParticles.length > 0 && (
        <div className="absolute inset-[-3px] pointer-events-none z-0 overflow-visible">
          {behindParticles.map(p => (
            <div
              key={`b-${p.id}`}
              className="absolute rounded-full bg-white animate-particle-float"
              style={{
                width: `${p.size}px`,
                height: `${p.size}px`,
                left: p.left,
                top: p.top,
                opacity: p.opacity * 0.7,
                animationDuration: p.dur,
                animationDelay: p.delay,
                boxShadow: `0 0 ${p.size * 3}px ${p.glow}, 0 0 ${p.size * 6}px ${p.glow}`,
              }}
            />
          ))}
        </div>
      )}

      {/* ── BADGE BODY: conic sweep + gradient background ── */}
      <div className={`absolute inset-0 rounded-[inherit] overflow-hidden ${baseStyle}`} />

      {/* ── FRONT: particles rendered over the badge ── */}
      {frontParticles.length > 0 && (
        <div className="absolute inset-[-3px] pointer-events-none z-20 overflow-visible">
          {frontParticles.map(p => (
            <div
              key={`f-${p.id}`}
              className="absolute rounded-full bg-white animate-particle-float"
              style={{
                width: `${p.size}px`,
                height: `${p.size}px`,
                left: p.left,
                top: p.top,
                opacity: p.opacity,
                animationDuration: p.dur,
                animationDelay: p.delay,
                boxShadow: `0 0 ${p.size * 3}px ${p.glow}, 0 0 ${p.size * 6}px ${p.glow}`,
              }}
            />
          ))}
        </div>
      )}

      {/* ── CONTENT: LVL text, number ── */}
      <div className="relative z-30 flex flex-col items-center justify-center w-full h-full">
        {children}
      </div>
    </div>
  );
}

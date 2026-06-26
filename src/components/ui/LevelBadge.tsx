import React, { useMemo } from 'react';
import { getLevelBadgeStyle } from '../../lib/utils';

interface LevelBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  level: number;
  children?: React.ReactNode;
}

// Pseudo-random for deterministic variety per level
function pseudoRand(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export function LevelBadge({ level, className = '', children, ...props }: LevelBadgeProps) {
  const baseStyle = getLevelBadgeStyle(level);
  const hasParticles = level >= 5;
  const isPremium = level >= 20;
  const isGojo = level >= 30;

  // Organic particles — each gets unique random params via seed
  const particles = useMemo(() => {
    if (!hasParticles) return [];

    const count = isGojo ? 20
      : level >= 27 ? 14
      : level >= 24 ? 10
      : level >= 20 ? 8
      : level >= 10 ? 5
      : 3; // level 5-9: 3 particles

    const seed = level * 137;
    const p: Array<{
      id: number;
      size: number;
      left: string;
      top: string;
      dur: string;
      delay: string;
      opacity: number;
      bg: string;
      shadow: string;
    }> = [];

    for (let i = 0; i < count; i++) {
      const s = seed + i * 7;

      // Color per tier
      let bg = 'bg-amber-300';
      let shadow = 'rgba(251,191,36,0.7)';
      if (isGojo) {
        const r = pseudoRand(s + 10);
        if (r > 0.7) { bg = 'bg-white'; shadow = 'rgba(255,255,255,0.9)'; }
        else if (r > 0.3) { bg = 'bg-cyan-300'; shadow = 'rgba(6,182,212,0.9)'; }
        else { bg = 'bg-purple-400'; shadow = 'rgba(168,85,247,0.9)'; }
      } else if (level >= 27) {
        bg = pseudoRand(s + 10) > 0.5 ? 'bg-fuchsia-300' : 'bg-purple-300';
        shadow = pseudoRand(s + 10) > 0.5 ? 'rgba(217,70,239,0.8)' : 'rgba(168,85,247,0.8)';
      } else if (level >= 24) {
        bg = pseudoRand(s + 10) > 0.5 ? 'bg-cyan-300' : 'bg-blue-300';
        shadow = pseudoRand(s + 10) > 0.5 ? 'rgba(34,211,238,0.8)' : 'rgba(96,165,250,0.8)';
      } else if (level >= 20) {
        bg = pseudoRand(s + 10) > 0.5 ? 'bg-red-400' : 'bg-amber-300';
        shadow = pseudoRand(s + 10) > 0.5 ? 'rgba(248,113,113,0.8)' : 'rgba(251,191,36,0.8)';
      } else if (level >= 10) {
        bg = 'bg-emerald-300';
        shadow = 'rgba(16,185,129,0.7)';
      } else {
        bg = 'bg-blue-300';
        shadow = 'rgba(59,130,246,0.65)';
      }

      // Random params: spawn 15-85% (close to center), size 1-3px, dur 2-5s
      const size = 1 + pseudoRand(s + 2) * 2;
      const left = 15 + pseudoRand(s) * 70;     // 15–85% — nah am Badge
      const top = 15 + pseudoRand(s + 1) * 70;
      const dur = 2 + pseudoRand(s + 3) * 3;     // 2–5s
      const delay = pseudoRand(s + 4) * 2.5;     // 0–2.5s
      const opacity = 0.5 + pseudoRand(s + 5) * 0.5;

      p.push({
        id: i,
        size,
        left: `${left}%`,
        top: `${top}%`,
        dur: `${dur}s`,
        delay: `${delay}s`,
        opacity,
        bg,
        shadow,
      });
    }
    return p;
  }, [level, hasParticles, isPremium, isGojo]);

  return (
    <div className={`relative flex items-center justify-center ${className}`} {...props}>
      {/* Particles — tighter inset, organic non-linear animation */}
      {hasParticles && (
        <div className="absolute inset-[-4px] pointer-events-none z-0 overflow-visible">
          {particles.map(p => (
            <div
              key={p.id}
              className={`absolute rounded-full animate-particle-float ${p.bg}`}
              style={{
                width: `${p.size}px`,
                height: `${p.size}px`,
                left: p.left,
                top: p.top,
                opacity: p.opacity,
                animationDuration: p.dur,
                animationDelay: p.delay,
                boxShadow: `0 0 ${p.size * 2}px ${p.shadow}`,
              }}
            />
          ))}
        </div>
      )}

      {/* Inner Badge — overflow hidden clips the sweep ::before/::after */}
      <div className={`absolute inset-0 rounded-[inherit] overflow-hidden ${baseStyle}`} />

      {/* Content on top */}
      <div className="relative z-10 flex flex-col items-center justify-center w-full h-full">
        {children}
      </div>
    </div>
  );
}

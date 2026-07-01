import React, { useMemo } from 'react';
import { Lightning } from './Lightning';

interface PodiumBadgeProps {
  rank: 1 | 2 | 3;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const RANK_CONFIG = {
  1: {
    textColor: '#F2C94C',
    textShadow: '0 0 12px rgba(242,201,76,0.5)',
    particleColor: 'rgba(255,220,100,0.8)',
    particleCount: 10,
    sizeMap: { sm: 26, md: 34, lg: 44 },
    lightning: true,
  },
  2: {
    textColor: '#CBD5E1',
    textShadow: '0 0 8px rgba(203,213,225,0.4)',
    particleColor: 'rgba(200,215,235,0.7)',
    particleCount: 6,
    sizeMap: { sm: 22, md: 28, lg: 36 },
    lightning: false,
  },
  3: {
    textColor: '#CD7F32',
    textShadow: '0 0 6px rgba(205,127,50,0.35)',
    particleColor: 'rgba(200,140,70,0.65)',
    particleCount: 4,
    sizeMap: { sm: 20, md: 26, lg: 32 },
    lightning: false,
  },
};

function pseudoRand(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export function PodiumBadge({ rank, size = 'md', className = '' }: PodiumBadgeProps) {
  const config = RANK_CONFIG[rank];
  const px = config.sizeMap[size];

  const particles = useMemo(() => {
    const count = config.particleCount;
    const seed = rank * 73;
    const p: Array<{
      id: number;
      particleSize: number;
      left: string;
      top: string;
      dur: string;
      delay: string;
      sway: string;
      opacity: number;
    }> = [];

    for (let i = 0; i < count; i++) {
      p.push({
        id: i,
        particleSize: 1.5 + pseudoRand(seed + i * 11) * 2,
        left: `${10 + pseudoRand(seed + i * 7) * 80}%`,
        top: `${40 + pseudoRand(seed + i * 13) * 55}%`,
        dur: `${3 + pseudoRand(seed + i * 17) * 3}s`,
        delay: `${pseudoRand(seed + i * 19) * 3}s`,
        sway: `${1.5 + pseudoRand(seed + i * 23) * 3}px`,
        opacity: 0.3 + pseudoRand(seed + i * 29) * 0.35,
      });
    }
    return p;
  }, [rank]);

  return (
    <div
      className={`relative flex items-center justify-center select-none ${className}`}
      style={{ width: px + 8, height: px + 8 }}
    >
      {/* Lightning Canvas (Gold only) — subtle, behind everything */}
      {config.lightning && (
        <div className="absolute inset-[-8px] overflow-hidden z-0">
          <Lightning hue={40} speed={0.5} intensity={0.7} size={2.5} />
        </div>
      )}

      {/* Subtle Particles */}
      <div className="absolute inset-[-6px] pointer-events-none z-10 overflow-visible">
        {particles.map(p => (
          <div
            key={p.id}
            className="absolute rounded-full animate-particle-float"
            style={{
              width: `${p.particleSize}px`,
              height: `${p.particleSize}px`,
              left: p.left,
              top: p.top,
              opacity: p.opacity,
              animationDuration: p.dur,
              animationDelay: p.delay,
              '--sway': p.sway,
              boxShadow: `0 0 ${p.particleSize * 3}px ${config.particleColor}`,
              background: 'rgba(255,255,255,0.8)',
            } as React.CSSProperties}
          />
        ))}
      </div>

      {/* Number — clean, no circle, just the digit */}
      <span
        className="relative z-40 font-bold tabular-nums animate-podium-float"
        style={{
          fontFamily: "'Urban Thunder', sans-serif",
          fontSize: `${px}px`,
          lineHeight: 1,
          color: config.textColor,
          textShadow: config.textShadow,
          animationDuration: rank === 1 ? '3.8s' : rank === 2 ? '4.2s' : '4.6s',
        }}
      >
        {rank}
      </span>
    </div>
  );
}

import React, { useMemo } from 'react';
import { Lightning } from './Lightning';

interface PodiumBadgeProps {
  rank: 1 | 2 | 3;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const RANK_CONFIG = {
  1: {
    gradient: '#F2C94C',
    glow: '0 0 24px rgba(242,201,76,0.9), 0 0 48px rgba(242,201,76,0.4)',
    particleColor: 'rgba(255,220,100,0.95)',
    particleCount: 14,
    textShadow: '0 0 16px rgba(242,201,76,0.7), 0 0 32px rgba(242,201,76,0.3)',
    sizeMap: { sm: 28, md: 36, lg: 48 },
    lightning: true,
    textColor: '#F2C94C',
    dropGlow: true,
  },
  2: {
    gradient: '#CBD5E1',
    glow: '0 0 16px rgba(203,213,225,0.6), 0 0 32px rgba(203,213,225,0.25)',
    particleColor: 'rgba(220,230,245,0.85)',
    particleCount: 8,
    textShadow: '0 0 10px rgba(203,213,225,0.5)',
    sizeMap: { sm: 24, md: 30, lg: 40 },
    lightning: false,
    textColor: '#CBD5E1',
    dropGlow: true,
  },
  3: {
    gradient: '#CD7F32',
    glow: '0 0 12px rgba(205,127,50,0.5), 0 0 24px rgba(205,127,50,0.2)',
    particleColor: 'rgba(220,150,80,0.8)',
    particleCount: 5,
    textShadow: '0 0 8px rgba(205,127,50,0.4)',
    sizeMap: { sm: 22, md: 28, lg: 36 },
    lightning: false,
    textColor: '#CD7F32',
    dropGlow: true,
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
        particleSize: 2 + pseudoRand(seed + i * 11) * 3,
        left: `${10 + pseudoRand(seed + i * 7) * 80}%`,
        top: `${45 + pseudoRand(seed + i * 13) * 50}%`,
        dur: `${2.5 + pseudoRand(seed + i * 17) * 2.5}s`,
        delay: `${pseudoRand(seed + i * 19) * 2.5}s`,
        sway: `${2 + pseudoRand(seed + i * 23) * 4}px`,
        opacity: 0.5 + pseudoRand(seed + i * 29) * 0.45,
      });
    }
    return p;
  }, [rank]);

  return (
    <div
      className={`relative flex items-center justify-center select-none ${className}`}
      style={{ width: px + 12, height: px + 12 }}
    >
      {/* Lightning Canvas (Gold only) — rectangular area behind number */}
      {config.lightning && (
        <div className="absolute inset-[-12px] overflow-hidden z-0">
          <Lightning hue={40} speed={0.8} intensity={1.5} size={3.5} />
        </div>
      )}

      {/* Glow behind number */}
      {config.dropGlow && (
        <div
          className="absolute inset-0 rounded-full animate-podium-glow opacity-40"
          style={{
            boxShadow: config.glow,
            animationDuration: rank === 1 ? '2.5s' : rank === 2 ? '3.5s' : '4s',
          }}
        />
      )}

      {/* Particles */}
      <div className="absolute inset-[-8px] pointer-events-none z-10 overflow-visible">
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
              boxShadow: `0 0 ${p.particleSize * 5}px ${config.particleColor}, 0 0 ${p.particleSize * 10}px ${config.particleColor}`,
              background: 'rgba(255,255,255,0.9)',
            } as React.CSSProperties}
          />
        ))}
      </div>

      {/* Number — no circle, just the digit with glow */}
      <span
        className="relative z-40 font-bold tabular-nums animate-podium-float"
        style={{
          fontFamily: "'Urban Thunder', sans-serif",
          fontSize: `${px}px`,
          lineHeight: 1,
          color: config.textColor,
          textShadow: config.textShadow,
          animationDuration: rank === 1 ? '3.8s' : rank === 2 ? '4.2s' : '4.6s',
          filter: config.lightning
            ? 'drop-shadow(0 0 8px rgba(242,201,76,0.6))'
            : undefined,
        }}
      >
        {rank}
      </span>
    </div>
  );
}

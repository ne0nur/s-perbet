import React, { useMemo } from 'react';
import { Lightning } from './Lightning';

interface PodiumBadgeProps {
  rank: 1 | 2 | 3;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const RANK_CONFIG = {
  1: {
    gradient: 'from-[#F2C94C] via-[#F2994A] to-[#E67E22]',
    glow: '0 0 24px rgba(242,201,76,0.9), 0 0 48px rgba(242,201,76,0.4), 0 0 72px rgba(242,201,76,0.2)',
    particleColor: 'rgba(255,220,100,0.95)',
    particleCount: 14,
    textShadow: '0 0 16px rgba(242,201,76,0.7), 0 0 32px rgba(242,201,76,0.3)',
    sizeMap: { sm: 28, md: 36, lg: 48 },
    lightning: true,
  },
  2: {
    gradient: 'from-[#E2E8F0] via-[#CBD5E1] to-[#94A3B8]',
    glow: '0 0 16px rgba(203,213,225,0.6), 0 0 32px rgba(203,213,225,0.25)',
    particleColor: 'rgba(220,230,245,0.85)',
    particleCount: 8,
    textShadow: '0 0 10px rgba(203,213,225,0.5)',
    sizeMap: { sm: 24, md: 30, lg: 40 },
    lightning: false,
  },
  3: {
    gradient: 'from-[#CD7F32] via-[#B87333] to-[#A0522D]',
    glow: '0 0 12px rgba(205,127,50,0.5), 0 0 24px rgba(205,127,50,0.2)',
    particleColor: 'rgba(220,150,80,0.8)',
    particleCount: 5,
    textShadow: '0 0 8px rgba(205,127,50,0.4)',
    sizeMap: { sm: 22, md: 28, lg: 36 },
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
        particleSize: 2 + pseudoRand(seed + i * 11) * 3, // 2-5px — visible
        left: `${10 + pseudoRand(seed + i * 7) * 80}%`,
        top: `${45 + pseudoRand(seed + i * 13) * 50}%`,
        dur: `${2.5 + pseudoRand(seed + i * 17) * 2.5}s`,
        delay: `${pseudoRand(seed + i * 19) * 2.5}s`,
        sway: `${2 + pseudoRand(seed + i * 23) * 4}px`,
        opacity: 0.5 + pseudoRand(seed + i * 29) * 0.45, // 0.5-0.95 — visible
      });
    }
    return p;
  }, [rank]);

  return (
    <div
      className={`relative flex items-center justify-center select-none ${className}`}
      style={{ width: px + 20, height: px + 20 }}
    >
      {/* Lightning Canvas (Gold only) */}
      {config.lightning && (
        <div className="absolute inset-[-8px] rounded-full overflow-hidden z-0">
          <Lightning hue={40} speed={0.8} intensity={1.5} size={3.5} />
        </div>
      )}

      {/* Glow Ring */}
      <div
        className="absolute inset-0 rounded-full animate-podium-glow"
        style={{
          boxShadow: config.glow,
          animationDuration: rank === 1 ? '2.5s' : rank === 2 ? '3.5s' : '4s',
        }}
      />

      {/* Particles */}
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
              boxShadow: `0 0 ${p.particleSize * 5}px ${config.particleColor}, 0 0 ${p.particleSize * 10}px ${config.particleColor}`,
              background: 'rgba(255,255,255,0.9)',
            } as React.CSSProperties}
          />
        ))}
      </div>

      {/* Badge Circle */}
      <div
        className={`absolute inset-0 rounded-full bg-gradient-to-br ${config.gradient} z-20`}
        style={{ boxShadow: config.glow }}
      />

      {/* Gold Shimmer Overlay */}
      {config.lightning && (
        <div className="absolute inset-0 rounded-full z-30 overflow-hidden pointer-events-none" style={{ opacity: 0.35 }}>
          <div
            className="absolute inset-[-50%] animate-podium-shimmer"
            style={{
              background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.7) 45%, rgba(255,255,255,1) 50%, rgba(255,255,255,0.7) 55%, transparent 60%)',
              backgroundSize: '200% 100%',
            }}
          />
        </div>
      )}

      {/* Number */}
      <span
        className="relative z-40 font-black tabular-nums animate-podium-float"
        style={{
          fontFamily: "'Monr', sans-serif",
          fontSize: `${px * 0.55}px`,
          lineHeight: 1,
          color: rank === 1 ? '#1a1200' : rank === 2 ? '#1e293b' : '#1a0e00',
          textShadow: config.textShadow,
          animationDuration: rank === 1 ? '3.8s' : rank === 2 ? '4.2s' : '4.6s',
        }}
      >
        {rank}
      </span>
    </div>
  );
}

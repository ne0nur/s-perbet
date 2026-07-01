import React, { useMemo } from 'react';

interface PodiumBadgeProps {
  rank: 1 | 2 | 3;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const RANK_CONFIG = {
  1: {
    gradient: 'from-[#F2C94C] via-[#F2994A] to-[#E67E22]',
    glow: '0 0 20px rgba(242,201,76,0.7), 0 0 40px rgba(242,201,76,0.3)',
    particleColor: 'rgba(242,201,76,0.9)',
    textShadow: '0 0 12px rgba(242,201,76,0.5)',
    shimmer: true,
    sizeMap: { sm: 28, md: 36, lg: 48 },
  },
  2: {
    gradient: 'from-[#E2E8F0] via-[#CBD5E1] to-[#94A3B8]',
    glow: '0 0 14px rgba(203,213,225,0.5), 0 0 28px rgba(203,213,225,0.2)',
    particleColor: 'rgba(203,213,225,0.8)',
    textShadow: '0 0 8px rgba(203,213,225,0.4)',
    shimmer: false,
    sizeMap: { sm: 24, md: 30, lg: 40 },
  },
  3: {
    gradient: 'from-[#CD7F32] via-[#B87333] to-[#A0522D]',
    glow: '0 0 10px rgba(205,127,50,0.4), 0 0 20px rgba(205,127,50,0.15)',
    particleColor: 'rgba(205,127,50,0.7)',
    textShadow: '0 0 6px rgba(205,127,50,0.3)',
    shimmer: false,
    sizeMap: { sm: 22, md: 28, lg: 36 },
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
    const count = rank === 1 ? 8 : rank === 2 ? 5 : 3;
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
        particleSize: 1 + pseudoRand(seed + i * 11) * 1.8,
        left: `${15 + pseudoRand(seed + i * 7) * 70}%`,
        top: `${50 + pseudoRand(seed + i * 13) * 45}%`,
        dur: `${3 + pseudoRand(seed + i * 17) * 3}s`,
        delay: `${pseudoRand(seed + i * 19) * 3}s`,
        sway: `${1 + pseudoRand(seed + i * 23) * 3}px`,
        opacity: 0.3 + pseudoRand(seed + i * 29) * 0.4,
      });
    }
    return p;
  }, [rank]);

  return (
    <div
      className={`relative flex items-center justify-center select-none ${className}`}
      style={{ width: px + 16, height: px + 16 }}
    >
      {/* Glow Ring */}
      <div
        className="absolute inset-0 rounded-full animate-podium-glow"
        style={{
          boxShadow: config.glow,
          animationDuration: rank === 1 ? '2.5s' : rank === 2 ? '3.5s' : '4s',
          animationDelay: `${rank * 0.4}s`,
        }}
      />

      {/* Particles */}
      <div className="absolute inset-[-4px] pointer-events-none z-10 overflow-visible">
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
              boxShadow: `0 0 ${p.particleSize * 3}px ${config.particleColor}, 0 0 ${p.particleSize * 6}px ${config.particleColor}`,
              background: config.particleColor,
            } as React.CSSProperties}
          />
        ))}
      </div>

      {/* Badge Circle */}
      <div
        className={`absolute inset-0 rounded-full bg-gradient-to-br ${config.gradient} z-20`}
        style={{
          boxShadow: config.glow,
        }}
      />

      {/* Gold Shimmer Overlay */}
      {config.shimmer && (
        <div
          className="absolute inset-0 rounded-full z-30 overflow-hidden pointer-events-none"
          style={{ opacity: 0.3 }}
        >
          <div
            className="absolute inset-[-50%] animate-podium-shimmer"
            style={{
              background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.6) 45%, rgba(255,255,255,0.9) 50%, rgba(255,255,255,0.6) 55%, transparent 60%)',
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
          animationDelay: `${rank * 0.3}s`,
        }}
      >
        {rank}
      </span>
    </div>
  );
}

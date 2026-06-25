import React, { useMemo } from 'react';
import { getLevelBadgeStyle } from '../../lib/utils';

interface LevelBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  level: number;
  children?: React.ReactNode;
}

export function LevelBadge({ level, className = '', children, ...props }: LevelBadgeProps) {
  const baseStyle = getLevelBadgeStyle(level);
  const isPremium = level >= 20;
  const isGojo = level >= 30;

  // Generate random particles only once per mount
  const particles = useMemo(() => {
    if (!isPremium) return [];
    
    // Dichter (mehr Partikel), aber weniger weit verstreut
    const count = isGojo ? 35 : level >= 27 ? 25 : level >= 24 ? 20 : 15;
    const p = [];
    
    // Farben passend zum Konzept
    // 20-23: Ruby (Red/Amber), 24-26: Sapphire (Blue/Cyan), 27-29: Mythic (Purple/Pink), 30: Gojo (White/Cyan/Purple)
    const getParticleColor = () => {
      if (isGojo) {
        const r = Math.random();
        if (r > 0.7) return { bg: 'bg-white', shadow: 'rgba(255,255,255,0.8)' };
        if (r > 0.3) return { bg: 'bg-cyan-300', shadow: 'rgba(6,182,212,0.8)' };
        return { bg: 'bg-purple-400', shadow: 'rgba(168,85,247,0.8)' };
      }
      if (level >= 27) {
        return Math.random() > 0.5 ? { bg: 'bg-fuchsia-300', shadow: 'rgba(217,70,239,0.8)' } : { bg: 'bg-purple-300', shadow: 'rgba(168,85,247,0.8)' };
      }
      if (level >= 24) {
        return Math.random() > 0.5 ? { bg: 'bg-cyan-200', shadow: 'rgba(34,211,238,0.8)' } : { bg: 'bg-blue-300', shadow: 'rgba(96,165,250,0.8)' };
      }
      // Level 20-23
      return Math.random() > 0.5 ? { bg: 'bg-red-400', shadow: 'rgba(248,113,113,0.8)' } : { bg: 'bg-amber-300', shadow: 'rgba(251,191,36,0.8)' };
    };

    for (let i = 0; i < count; i++) {
      const size = Math.random() * (isGojo ? 3 : 2) + 1; // 1px to 4px
      // Dichter am Zentrum: -10% bis +110% statt -20% bis +120%
      const left = Math.random() * 120 - 10; 
      const top = Math.random() * 120 - 10;
      
      const duration = Math.random() * 2.5 + 1.5; // 1.5s - 4s
      const delay = Math.random() * 2;
      const color = getParticleColor();
      
      p.push({
        id: i,
        size,
        left: `${left}%`,
        top: `${top}%`,
        duration: `${duration}s`,
        delay: `${delay}s`,
        opacity: Math.random() * 0.6 + 0.4,
        ...color
      });
    }
    return p;
  }, [level, isPremium, isGojo]);

  return (
    <div className={`relative flex items-center justify-center ${className}`} {...props}>
      {/* Container for particles - NO overflow hidden, but tighter inset so it doesn't break tables */}
      {isPremium && (
        <div className="absolute inset-[-15px] pointer-events-none z-0">
          {particles.map(p => (
            <div 
              key={p.id}
              className={`absolute rounded-full animate-premium-particle ${p.bg}`}
              style={{
                width: `${p.size}px`,
                height: `${p.size}px`,
                left: p.left,
                top: p.top,
                opacity: p.opacity,
                animationDuration: p.duration,
                animationDelay: p.delay,
                boxShadow: `0 0 ${p.size * 2}px ${p.shadow}`
              }}
            />
          ))}
        </div>
      )}
      
      {/* Inner Badge Container - HAS overflow hidden to clip the sweep, uses the badge styles */}
      <div className={`absolute inset-0 rounded-[inherit] overflow-hidden ${baseStyle}`} />
      
      {/* Render the actual content (LVL text, numbers) on top */}
      <div className="relative z-10 flex flex-col items-center justify-center w-full h-full">
        {children}
      </div>
    </div>
  );
}

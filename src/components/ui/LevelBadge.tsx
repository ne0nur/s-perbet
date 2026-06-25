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
    
    // More particles for higher levels
    const count = isGojo ? 25 : level >= 27 ? 15 : 10;
    const p = [];
    
    for (let i = 0; i < count; i++) {
      const size = Math.random() * (isGojo ? 4 : 3) + 1; // 1px to 5px
      const left = Math.random() * 140 - 20; // -20% to +120% (spills out)
      const top = Math.random() * 140 - 20;
      
      // Random animation duration between 1s and 4s
      const duration = Math.random() * 3 + 1;
      // Random delay
      const delay = Math.random() * 2;
      
      p.push({
        id: i,
        size,
        left: `${left}%`,
        top: `${top}%`,
        duration: `${duration}s`,
        delay: `${delay}s`,
        opacity: Math.random() * 0.7 + 0.3
      });
    }
    return p;
  }, [level, isPremium, isGojo]);

  return (
    <div className={`relative flex items-center justify-center ${className}`} {...props}>
      {/* Container for particles - absolute positioned, NO overflow hidden, spills out everywhere */}
      {isPremium && (
        <div className="absolute inset-[-40px] pointer-events-none z-0">
          {particles.map(p => (
            <div 
              key={p.id}
              className={`absolute rounded-full animate-premium-particle ${isGojo ? 'bg-purple-300' : 'bg-amber-100'}`}
              style={{
                width: `${p.size}px`,
                height: `${p.size}px`,
                left: p.left,
                top: p.top,
                opacity: p.opacity,
                animationDuration: p.duration,
                animationDelay: p.delay,
                boxShadow: isGojo ? `0 0 ${p.size * 2}px rgba(168, 85, 247, 0.8)` : `0 0 ${p.size * 2}px rgba(251, 191, 36, 0.6)`
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

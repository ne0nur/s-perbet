/*
 * SüperBET GlassSurface — Adapted from reactbits.dev (MIT)
 * Premium glassmorphism container for desktop.
 */

import React from 'react';
import './GlassSurface.css';

export interface GlassSurfaceProps {
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  blur?: number;
  opacity?: number;
}

const GlassSurface: React.FC<GlassSurfaceProps> = ({
  children,
  className = '',
  style = {},
  blur = 16,
  opacity = 0.4,
}) => {
  const vars = {
    '--gs-blur': `${blur}px`,
    '--gs-opacity': opacity,
  } as React.CSSProperties;

  return (
    <div
      className={`glass-surface ${className}`}
      style={{ ...vars, ...style }}
    >
      <div className="glass-surface-content">
        {children}
      </div>
    </div>
  );
};

export default GlassSurface;

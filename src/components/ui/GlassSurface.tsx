/*
 * SüperBET GlassSurface — Adapted from reactbits.dev (MIT)
 * Tailored for dark-mode glass overlay on mobile BottomNav.
 * Uses backdrop-filter blur + semi-transparent background for a premium glass look.
 */
import React from 'react';
import './GlassSurface.css';

export interface GlassSurfaceProps {
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  blur?: number;
  opacity?: number;
  saturation?: number;
}

const GlassSurface: React.FC<GlassSurfaceProps> = ({
  children,
  className = '',
  style = {},
  blur = 24,
  opacity = 0.18,
  saturation = 2.0,
}) => {
  const containerStyle: React.CSSProperties = {
    ...style,
    '--gb-blur': `${blur}px`,
    '--gb-opacity': opacity,
    '--gb-saturation': saturation,
  } as React.CSSProperties;

  return (
    <div className={`glass-surface ${className}`} style={containerStyle}>
      {children}
    </div>
  );
};

export default GlassSurface;

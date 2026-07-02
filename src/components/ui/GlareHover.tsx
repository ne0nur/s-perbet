/*
 * SüperBET GlareHover — Adapted from reactbits.dev (MIT)
 * CSS-only mouse-following glare effect on desktop cards.
 * Color from CSS variable — theme-compatible.
 */

import React from 'react';
import './GlareHover.css';

interface GlareHoverProps {
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

const GlareHover: React.FC<GlareHoverProps> = ({
  children,
  className = '',
  style = {},
}) => {
  return (
    <div
      className={`glare-hover ${className}`}
      style={style as React.CSSProperties}
    >
      {children}
    </div>
  );
};

export default GlareHover;

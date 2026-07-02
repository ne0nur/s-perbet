/*
 * SüperBET AnimatedList — Adapted from reactbits.dev (MIT)
 * Staggered entry animation wrapper for list items.
 * Uses framer-motion useInView for scroll-triggered animation.
 */

import React, { useRef } from 'react';
import { motion, useInView } from 'motion/react';
import './AnimatedList.css';

interface AnimatedListProps {
  children: React.ReactNode;
  className?: string;
  staggerDelay?: number;
}

export function AnimatedList({
  children,
  className = '',
  staggerDelay = 60,
}: AnimatedListProps) {
  return (
    <div className={`animated-list ${className}`}>
      {React.Children.map(children, (child, i) => (
        <AnimatedListItem key={i} index={i} delay={staggerDelay}>
          {child}
        </AnimatedListItem>
      ))}
    </div>
  );
}

function AnimatedListItem({
  children,
  index,
  delay,
}: {
  children: React.ReactNode;
  index: number;
  delay: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.3, once: true });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 12 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
      transition={{ duration: 0.35, delay: (index * delay) / 1000, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}

export default AnimatedList;

/**
 * Zentrale Animation-Konstanten für SüperBET.
 * Alle Komponenten importieren von hier für konsistente Motion.
 */

import type { Transition } from 'motion/react'

// ─── Spring (Apple-feel, nicht zu bouncy) ───
export const spring: Transition = {
  type: 'spring',
  stiffness: 120,
  damping: 18,
  mass: 0.8,
}

// ─── Card Entrance ───
export const cardEntrance = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: spring,
}

// ─── Stagger Delay (pro Kind) ───
export const stagger = (index: number) => index * 0.06

// ─── Page Transition ───
export const pageTransition: Transition = {
  duration: 0.25,
  ease: [0, 0, 0.2, 1], // ease-out
}

// ─── Fade In ───
export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: { duration: 0.3 },
}

// ─── Scale Press ───
export const scalePress = {
  whileTap: { scale: 0.95 },
  transition: { type: 'spring', stiffness: 400, damping: 17 },
}

// ─── List Item Stagger ───
export const listItem = (index: number) => ({
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { ...spring, delay: stagger(index) },
})

// ─── Progress Fill (natürliche Verzögerung) ───
export const progressFill: Transition = {
  duration: 1,
  ease: [0.22, 0.61, 0.36, 1], // custom ease-out
}

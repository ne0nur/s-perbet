import { useThemeStore, type AppTheme } from '../stores/themeStore'

/** Primary accent color per theme — source: src/index.css --primary-fixed-dim */
export const THEME_PRIMARY: Record<AppTheme, string> = {
  default: '#f9bd22',
  blue: '#60a5fa',
  red: '#f87171',
  pink: '#f472b6',
  teal: '#2dd4bf',
}

/** Container/solid variant per theme — source: src/index.css --primary-container */
export const THEME_CONTAINER: Record<AppTheme, string> = {
  default: '#fbbf24',
  blue: '#3b82f6',
  red: '#ef4444',
  pink: '#ec4899',
  teal: '#14b8a6',
}

/** Convert hex to HSL hue (0-360). Returns 40 (gold) for unrecognized colors. */
export function hexToHue(hex: string): number {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16) / 255
  const g = parseInt(h.slice(2, 4), 16) / 255
  const b = parseInt(h.slice(4, 6), 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  if (max === min) return 0
  let hue = 0
  const d = max - min
  if (max === r) hue = ((g - b) / d + (g < b ? 6 : 0)) * 60
  else if (max === g) hue = ((b - r) / d + 2) * 60
  else hue = ((r - g) / d + 4) * 60
  return Math.round(hue)
}

/** Hook: current theme's primary hex color */
export function useAppColor(): string {
  return THEME_PRIMARY[useThemeStore(s => s.theme)]
}

/** Hook: current theme's container color */
export function useAppContainerColor(): string {
  return THEME_CONTAINER[useThemeStore(s => s.theme)]
}

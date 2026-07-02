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

/** Hook: current theme's primary hex color */
export function useAppColor(): string {
  return THEME_PRIMARY[useThemeStore(s => s.theme)]
}

/** Hook: current theme's container color */
export function useAppContainerColor(): string {
  return THEME_CONTAINER[useThemeStore(s => s.theme)]
}

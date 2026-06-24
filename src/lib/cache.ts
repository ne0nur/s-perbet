/**
 * localStorage Cache Utility
 * Reduziert Supabase Free-Tier Traffic durch client-seitiges Caching.
 * TTL-basiert mit Stale-While-Revalidate-Semantik.
 */

const CACHE_PREFIX = 'sb_cache_'
const DEFAULT_TTL = 5 * 60 * 1000 // 5 Minuten

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

export function getCached<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key)
    if (!raw) return null
    const entry: CacheEntry<T> = JSON.parse(raw)
    if (Date.now() - entry.timestamp > entry.ttl) {
      localStorage.removeItem(CACHE_PREFIX + key)
      return null
    }
    return entry.data
  } catch {
    return null
  }
}

export function setCache<T>(key: string, data: T, ttl = DEFAULT_TTL): void {
  try {
    const entry: CacheEntry<T> = { data, timestamp: Date.now(), ttl }
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry))
  } catch {
    // localStorage voll oder anderer Fehler → silently ignore
  }
}

export function invalidateCache(pattern?: string): void {
  try {
    if (pattern) {
      const keys = Object.keys(localStorage).filter(k => k.startsWith(CACHE_PREFIX + pattern))
      keys.forEach(k => localStorage.removeItem(k))
    } else {
      const keys = Object.keys(localStorage).filter(k => k.startsWith(CACHE_PREFIX))
      keys.forEach(k => localStorage.removeItem(k))
    }
  } catch {
    // ignore
  }
}

/** Key-Generatoren für GlobalPage-Daten */
export const CACHE_KEYS = {
  leaderboard: (season: number) => `leaderboard_${season}`,
  globalStats: (season: number) => `global_stats_${season}`,
  bonusStats: (season: number) => `bonus_stats_${season}`,
}

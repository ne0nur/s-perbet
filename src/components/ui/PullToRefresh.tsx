import { useState, useRef, useCallback, type ReactNode } from 'react'

interface Props {
  onRefresh: () => Promise<void>
  children: ReactNode
}

export function PullToRefresh({ onRefresh, children }: Props) {
  const [refreshing, setRefreshing] = useState(false)
  const touchStartY = useRef(0)
  const [pullDistance, setPullDistance] = useState(0)
  const THRESHOLD = 80

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (window.scrollY <= 5) touchStartY.current = e.touches[0].clientY
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (window.scrollY <= 5 && touchStartY.current > 0) {
      const dist = Math.max(0, e.touches[0].clientY - touchStartY.current)
      setPullDistance(Math.min(dist * 0.5, 120))
    }
  }, [])

  const handleTouchEnd = useCallback(async () => {
    if (pullDistance > THRESHOLD && !refreshing) {
      setRefreshing(true)
      try { await onRefresh() } finally {
        setRefreshing(false)
        setPullDistance(0)
        touchStartY.current = 0
      }
    } else {
      setPullDistance(0)
      touchStartY.current = 0
    }
  }, [pullDistance, refreshing, onRefresh])

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="min-h-full"
    >
      <div
        className="flex justify-center transition-all duration-200 overflow-hidden"
        style={{ height: pullDistance, opacity: Math.min(pullDistance / THRESHOLD, 1) }}
      >
        <div className={`mt-2 w-6 h-6 border-2 border-primary-fixed-dim border-t-transparent rounded-full ${refreshing ? 'animate-spin' : ''}`} />
      </div>
      {children}
    </div>
  )
}

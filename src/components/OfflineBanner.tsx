import { WifiOff } from 'lucide-react'
import { useNetworkStore } from '../stores/networkStore'

export function OfflineBanner() {
  const isOnline = useNetworkStore(s => s.isOnline)

  if (isOnline) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-[60] bg-red-600/90 backdrop-blur-sm text-white text-center py-2 px-4 text-xs font-medium flex items-center justify-center gap-2">
      <WifiOff size={13} strokeWidth={2} />
      Du bist offline — Änderungen werden lokal zwischengespeichert.
    </div>
  )
}

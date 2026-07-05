import { useEffect, useState } from 'react'
import { WifiOff, Wifi } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNetworkStore } from '../stores/networkStore'
import { useTranslation } from '../utils/translations'

export function NetworkIndicator() {
  const isOnline = useNetworkStore((state) => state.isOnline)
  const [showOnlineBanner, setShowOnlineBanner] = useState(false)
  const [hasBeenOffline, setHasBeenOffline] = useState(!navigator.onLine)
  const { t } = useTranslation()

  useEffect(() => {
    if (!isOnline) {
      setHasBeenOffline(true)
      setShowOnlineBanner(false)
    } else if (hasBeenOffline && isOnline) {
      setShowOnlineBanner(true)
      const timer = setTimeout(() => {
        setShowOnlineBanner(false)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [isOnline, hasBeenOffline])

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          className="fixed top-0 left-0 right-0 z-50 bg-red-600/90 backdrop-blur text-white px-4 py-2.5 flex items-center justify-center gap-2 shadow-lg border-b border-red-500/50"
        >
          <WifiOff size={16} className="animate-pulse" />
          <span className="text-xs font-mono font-bold tracking-wider uppercase">{t('offlineWarning')}</span>
        </motion.div>
      )}

      {showOnlineBanner && isOnline && (
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          className="fixed top-0 left-0 right-0 z-50 bg-emerald-600/90 backdrop-blur text-white px-4 py-2.5 flex items-center justify-center gap-2 shadow-lg border-b border-emerald-500/50"
        >
          <Wifi size={16} />
          <span className="text-xs font-mono font-bold tracking-wider uppercase">{t('onlineAgain')}</span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

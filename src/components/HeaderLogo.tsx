import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '../stores/authStore'
import { useTranslation } from '../utils/translations'

interface HeaderLogoProps {
  size?: 'sm' | 'md'
}

export function HeaderLogo({ size = 'md' }: HeaderLogoProps) {
  const isSm = size === 'sm'
  const { user } = useAuthStore()
  const { language } = useTranslation()
  const username = user?.user_metadata?.username || (language === 'de' ? 'Gast' : language === 'tr' ? 'Misafir' : 'Guest')

  const [isHovered, setIsHovered] = useState(false)
  const [showUsername, setShowUsername] = useState(true)

  // Start-Animation: Zeige Username für 3 Sekunden, dann wechsle smooth zum SüperBET Logo
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowUsername(false)
    }, 3500)
    return () => clearTimeout(timer)
  }, [])

  return (
    <span
      className={`superbet-header-logo select-none inline-flex cursor-pointer relative ${isSm ? ' scale-90 origin-center' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <AnimatePresence mode="wait">
        {showUsername ? (
          <motion.span
            key="username"
            initial={{ opacity: 0, scale: 0.8, filter: "blur(10px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, scale: 1.1, filter: "blur(10px)", transition: { duration: 0.8, ease: "easeInOut" } }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            className="inline-flex flex-col items-center justify-center"
          >
            <motion.span
              animate={{ y: [0, -4, 0] }}
              transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
              className={`superbet-text-super-new ${isSm ? 'text-2xl' : 'text-3xl'} tracking-widest text-primary-fixed-dim drop-shadow-[0_0_15px_rgba(251,191,36,0.5)]`}
              style={{ fontFamily: 'Monr', fontWeight: 700 }}
            >
              {username.toUpperCase()}
            </motion.span>
          </motion.span>
        ) : (
          <motion.span
            key="logo"
            initial={{ opacity: 0, scale: 0.9, filter: "blur(5px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="inline-flex flex-col items-center justify-center"
          >
            {/* SÜPER */}
            <motion.span
              animate={{ y: [0, -3, 0] }}
              transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut", delay: 0.1 }}
              className="inline-flex"
            >
              <span className={`superbet-text-super-new ${isSm ? 'text-2xl' : 'text-4xl'} ${isHovered ? 'drop-shadow-[0_0_20px_rgba(251,191,36,0.6)]' : 'drop-shadow-[0_0_10px_rgba(251,191,36,0.3)]'} transition-all duration-500`}>
                SÜPER
              </span>
            </motion.span>

            {/* BET Badge */}
            <motion.span
              animate={{ y: [0, -2, 0] }}
              transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut", delay: 0.2 }}
              className="inline-flex"
            >
              <span className={`superbet-badge-bet-new ${isSm ? 'text-[9px]' : 'text-xs'} ${isHovered ? 'drop-shadow-[0_0_15px_rgba(251,191,36,0.8)] bg-primary-container text-on-primary font-black' : ''} transition-all duration-500`}>
                BET
              </span>
            </motion.span>
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  )
}

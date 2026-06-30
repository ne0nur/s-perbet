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

  const greeting = language === 'tr' ? 'MERHABA' : language === 'en' ? 'HELLO' : 'HALLO'
  const nameLen = username.length
  let nameSize = isSm ? 'text-xl' : 'text-3xl'
  if (!isSm) {
    if (nameLen > 14) nameSize = 'text-lg md:text-xl'
    else if (nameLen > 10) nameSize = 'text-xl md:text-2xl'
  } else {
    if (nameLen > 14) nameSize = 'text-sm'
    else if (nameLen > 10) nameSize = 'text-base'
  }

  // Start-Animation: Zeige Username für 3.5 Sekunden, dann wechsle smooth zum SüperBET Logo
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
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="inline-flex items-center justify-center"
          >
            <motion.span
              animate={{ y: [0, -2, 0] }}
              transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
              className={`inline-flex flex-col items-center px-4 py-4 -mx-4 -my-4 tracking-widest drop-shadow-[0_0_15px_rgba(var(--primary-rgb),0.3)]`}
              style={{ fontFamily: 'Montserrat' }}
            >
              <motion.span
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="text-[9px] md:text-[10px] text-on-surface-variant/80 font-bold tracking-[0.2em] mb-0.5 uppercase"
              >
                {greeting}
              </motion.span>
              <motion.span
                initial={{ opacity: 0, scale: 0.95, filter: "blur(8px)", y: 6 }}
                animate={{ opacity: 1, scale: 1, filter: "blur(0px)", y: 0 }}
                exit={{ 
                  opacity: 0, 
                  scale: 1.05, 
                  filter: "blur(8px)", 
                  y: -6, 
                  transition: { duration: 0.3, ease: "easeIn" } 
                }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className={`liquid-gradient-text ${nameSize} tracking-widest truncate max-w-[220px] md:max-w-[320px]`}
                style={{ 
                  fontWeight: 900, 
                  display: 'inline-block'
                }}
              >
                {username.toUpperCase()}
              </motion.span>
            </motion.span>
          </motion.span>
        ) : (
          <motion.span
            key="logo"
            initial={{ opacity: 0, scale: 0.9, filter: "blur(5px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="inline-flex items-center justify-center gap-2 md:gap-3"
          >
            {/* App Icon */}
            <motion.img
              src="/logo.png"
              alt="Logo"
              className={`rounded-xl shadow-[0_0_15px_rgba(var(--primary-rgb),0.3)] transition-all duration-500 ${isSm ? 'w-8 h-8' : 'w-10 h-10'} ${isHovered ? 'shadow-[0_0_20px_rgba(var(--primary-rgb),0.6)] scale-105' : ''}`}
            />
            {/* SÜPER */}
            <motion.span
              animate={{ y: [0, -2, 0] }}
              transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut", delay: 0.1 }}
              className="inline-flex"
            >
              <span className={`superbet-text-super-new ${isSm ? 'text-xl' : 'text-4xl'} ${isHovered ? 'drop-shadow-[0_0_20px_rgba(var(--primary-rgb),0.6)]' : 'drop-shadow-[0_0_10px_rgba(var(--primary-rgb),0.3)]'} transition-all duration-500`}>
                SÜPER
              </span>
            </motion.span>

            {/* BET Badge */}
            <motion.span
              animate={{ y: [0, -2, 0] }}
              transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut", delay: 0.2 }}
              className="inline-flex"
            >
              <span className={`superbet-badge-bet-new ${isSm ? 'text-[8px] px-1 py-0.5' : 'text-xs px-1.5 py-0.5'} rounded shrink-0 ${isHovered ? 'drop-shadow-[0_0_15px_rgba(var(--primary-rgb),0.8)] bg-primary-container text-on-primary font-black' : ''} transition-all duration-500`}>
                BET
              </span>
            </motion.span>
          </motion.span>
        )}
      </AnimatePresence>
      {/* SVG Liquid Filter Definition */}
      <svg className="absolute w-0 h-0 pointer-events-none" aria-hidden="true" style={{ position: 'absolute' }}>
        <defs>
          <filter id="liquid-distortion-logo">
            <feTurbulence type="turbulence" baseFrequency="0.008 0.018" numOctaves="4" result="noise">
              <animate attributeName="baseFrequency" dur="6s" values="0.008 0.018;0.015 0.03;0.008 0.018" repeatCount="indefinite" />
            </feTurbulence>
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="14" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>
    </span>
  )
}

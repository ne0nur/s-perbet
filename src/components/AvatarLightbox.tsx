import { useState } from 'react'
import { X } from 'lucide-react'

interface AvatarLightboxProps {
  src: string | null
  username: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
  showLevel?: boolean
  levelBadge?: React.ReactNode
}

export function AvatarLightbox({
  src,
  username,
  size = 'md',
  className = '',
  showLevel,
  levelBadge,
}: AvatarLightboxProps) {
  const [isOpen, setIsOpen] = useState(false)

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-16 h-16',
  }

  const initial = username?.charAt(0)?.toUpperCase() || '?'

  return (
    <>
      <div
        onClick={(e) => { e.stopPropagation(); if (src) setIsOpen(true) }}
        className={`relative ${sizeClasses[size]} shrink-0 ${src ? 'cursor-pointer' : ''} ${showLevel ? 'mr-2' : ''} ${className}`}
        style={showLevel ? { overflow: 'visible' } : undefined}
      >
        <div className="w-full h-full rounded-full bg-surface-container-high border border-surface-container-highest overflow-hidden flex items-center justify-center">
          {src ? (
            <img src={src} alt={username} className="w-full h-full object-cover" />
          ) : (
            <span className="text-on-surface-variant font-bold">{initial}</span>
          )}
        </div>
        {showLevel && levelBadge}
      </div>

      {/* Lightbox Modal */}
      {isOpen && src && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center px-4 pt-[calc(1rem+env(safe-area-inset-top,0px))] pb-[calc(1rem+env(safe-area-inset-bottom,0px))] animate-fade-in"
          onClick={() => setIsOpen(false)}
        >
          <button
            onClick={() => setIsOpen(false)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 border border-white/10 flex items-center justify-center hover:bg-white/20 transition-colors z-10"
          >
            <X size={20} className="text-white" />
          </button>

          <div className="flex flex-col items-center gap-4 max-w-[90vw] max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <img
              src={src}
              alt={username}
              className="max-w-full max-h-[70vh] object-contain rounded-2xl shadow-2xl border border-white/10"
            />
            <p className="text-white/80 font-bold text-sm">{username}</p>
          </div>
        </div>
      )}
    </>
  )
}

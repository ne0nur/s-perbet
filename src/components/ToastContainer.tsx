import { useToastStore } from '../stores/toastStore'
import { Check, X, Info } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

const icons = { success: Check, error: X, info: Info }
const colors = {
  success: 'border-success/30 bg-success-container/70 text-success',
  error: 'border-error/30 bg-error-container/70 text-error',
  info: 'border-info/30 bg-info-container/70 text-info',
}

/** Einzelner Toast mit Slide-in / Slide-out Animation */
function ToastItem({ id, message, type }: { id: number; message: string; type: 'success' | 'error' | 'info' }) {
  const { remove } = useToastStore()
  const [leaving, setLeaving] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const dismiss = () => {
    if (leaving) return
    setLeaving(true)
    setTimeout(() => remove(id), 320) // warte auf Exit-Animation
  }

  useEffect(() => {
    // Toast wird vom Store nach 3s entfernt — wir starten die Exit-Animation 320ms früher
    timerRef.current = setTimeout(() => {
      setLeaving(true)
    }, 2680)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const Icon = icons[type]

  return (
    <div
      onClick={dismiss}
      className={`flex items-center gap-2.5 px-3.5 py-3 rounded-xl border text-xs font-mono cursor-pointer
        select-none shadow-lg backdrop-blur-sm
        ${colors[type]}
        ${leaving ? 'animate-toast-out' : 'animate-toast-in'}
      `}
    >
      <Icon size={14} className="flex-shrink-0" />
      <span className="flex-1 leading-snug">{message}</span>
    </div>
  )
}

export function ToastContainer() {
  const { toasts } = useToastStore()

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="fixed top-4 right-4 z-[200] flex flex-col gap-2 w-[calc(100vw-2rem)] max-w-xs pointer-events-none"
    >
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto" role="alert">
          <ToastItem id={t.id} message={t.message} type={t.type} />
        </div>
      ))}
    </div>
  )
}

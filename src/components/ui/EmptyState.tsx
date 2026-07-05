import type { ReactNode } from 'react'
import { motion } from 'framer-motion'

interface Props {
  icon: ReactNode
  title: string
  description: string
  action?: { label: string; onClick: () => void }
}

export function EmptyState({ icon, title, description, action }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 px-6 text-center"
    >
      <div className="w-16 h-16 rounded-2xl bg-surface-container flex items-center justify-center mb-4 text-on-surface-variant/40">
        {icon}
      </div>
      <h3 className="text-sm font-bold text-on-surface mb-1.5">{title}</h3>
      <p className="text-xs text-on-surface-variant/60 max-w-[240px] leading-relaxed mb-4">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="px-5 py-2.5 bg-primary/10 border border-primary/20 rounded-xl text-primary-fixed-dim text-xs font-bold font-mono hover:bg-primary/15 transition-colors cursor-pointer"
        >
          {action.label}
        </button>
      )}
    </motion.div>
  )
}

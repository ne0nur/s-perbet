import { Bell, MessageCircle } from 'lucide-react'

interface NotificationSettingsProps {
  notifyAnpfiff: boolean
  handleToggleAnpfiff: () => Promise<void>
  notifyChat: boolean
  handleToggleChat: () => Promise<void>
}

export function NotificationSettings({
  notifyAnpfiff,
  handleToggleAnpfiff,
  notifyChat,
  handleToggleChat
}: NotificationSettingsProps) {
  return (
    <div className="bg-surface-container-low border border-surface-container-high rounded-xl overflow-hidden shadow-sm stagger-in text-left">
      <div className="px-4 py-2.5 bg-surface-container border-b border-surface-container-high">
        <span className="font-mono text-[9px] text-on-surface-variant uppercase tracking-wider">Benachrichtigungen</span>
      </div>
      
      {/* Push vor Anpfiff */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-container-high last:border-0">
        <div className="flex items-center gap-3">
          <Bell size={16} className="text-on-surface-variant animate-pulse" />
          <div className="min-w-0">
            <p className="text-sm text-on-surface leading-tight">Push vor Anpfiff</p>
            <p className="font-mono text-[9px] text-on-surface-variant/60 uppercase tracking-wider mt-0.5">30 Min vor Spielbeginn</p>
          </div>
        </div>
        <button
          onClick={handleToggleAnpfiff}
          className={`relative w-11 h-6 rounded-full transition-all duration-300 focus-ring border ${
            notifyAnpfiff
              ? 'bg-primary-container border-primary-container/30 shadow-[0_0_10px_rgba(251,191,36,0.25)]'
              : 'bg-black/30 border-white/10'
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-4.5 h-4.5 rounded-full shadow transition-transform duration-300 ease-out ${
              notifyAnpfiff ? 'translate-x-5 bg-on-primary-container' : 'translate-x-0 bg-on-surface-variant/40'
            }`}
          />
        </button>
      </div>

      {/* Neue Chat-Nachrichten */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <MessageCircle size={16} className="text-on-surface-variant" />
          <div className="min-w-0">
            <p className="text-sm text-on-surface leading-tight">Neue Chat-Nachrichten</p>
            <p className="font-mono text-[9px] text-on-surface-variant/60 uppercase tracking-wider mt-0.5">In deinen Ligen</p>
          </div>
        </div>
        <button
          onClick={handleToggleChat}
          className={`relative w-11 h-6 rounded-full transition-all duration-300 focus-ring border ${
            notifyChat
              ? 'bg-primary-container border-primary-container/30 shadow-[0_0_10px_rgba(251,191,36,0.25)]'
              : 'bg-black/30 border-white/10'
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-4.5 h-4.5 rounded-full shadow transition-transform duration-300 ease-out ${
              notifyChat ? 'translate-x-5 bg-on-primary-container' : 'translate-x-0 bg-on-surface-variant/40'
            }`}
          />
        </button>
      </div>
    </div>
  )
}

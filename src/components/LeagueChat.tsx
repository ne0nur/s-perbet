import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { useToastStore } from '../stores/toastStore'
import { Send, MessageCircle } from 'lucide-react'

// ─── Typen ───────────────────────────────────────────
interface ChatMessage {
  id: string
  league_id: string
  user_id: string
  username?: string
  avatar_url?: string | null
  nachricht: string
  created_at: string
}

// ─── User-Farben (smart syntax: jeder User behält seine Farbe) ───
const USER_COLORS = [
  { bg: 'bg-amber-600/15', text: 'text-amber-300', border: 'border-amber-600/30', dot: 'bg-amber-500' },
  { bg: 'bg-blue-600/15', text: 'text-blue-300', border: 'border-blue-600/30', dot: 'bg-blue-500' },
  { bg: 'bg-emerald-600/15', text: 'text-emerald-300', border: 'border-emerald-600/30', dot: 'bg-emerald-500' },
  { bg: 'bg-violet-600/15', text: 'text-violet-300', border: 'border-violet-600/30', dot: 'bg-violet-500' },
  { bg: 'bg-rose-600/15', text: 'text-rose-300', border: 'border-rose-600/30', dot: 'bg-rose-500' },
  { bg: 'bg-cyan-600/15', text: 'text-cyan-300', border: 'border-cyan-600/30', dot: 'bg-cyan-500' },
  { bg: 'bg-orange-600/15', text: 'text-orange-300', border: 'border-orange-600/30', dot: 'bg-orange-500' },
  { bg: 'bg-fuchsia-600/15', text: 'text-fuchsia-300', border: 'border-fuchsia-600/30', dot: 'bg-fuchsia-500' },
]

function getUserColor(userId: string) {
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash) + userId.charCodeAt(i)
    hash |= 0
  }
  return USER_COLORS[Math.abs(hash) % USER_COLORS.length]
}

// ─── Zeit formatieren ────────────────────────────────
function formatZeit(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
}

// ─── Avatar-Komponente ───────────────────────────────
function Avatar({ url, name, size = 'sm' }: { url?: string | null; name: string; size?: 'sm' | 'md' }) {
  const dims = size === 'md' ? 'w-8 h-8' : 'w-6 h-6'
  const textSize = size === 'md' ? 'text-xs' : 'text-[9px]'
  if (url) {
    return <img src={url} alt="" className={`${dims} rounded-full object-cover border border-surface-container-highest flex-shrink-0`} />
  }
  return (
    <div className={`${dims} rounded-full bg-surface-container-high border border-surface-container-highest flex items-center justify-center flex-shrink-0`}>
      <span className={`${textSize} font-bold text-on-surface-variant`}>{name.slice(0, 1).toUpperCase()}</span>
    </div>
  )
}

// ─── Komponente ──────────────────────────────────────
interface LeagueChatProps {
  leagueId: string
}

export function LeagueChat({ leagueId }: LeagueChatProps) {
  const { user } = useAuthStore()
  const [nachrichten, setNachrichten] = useState<ChatMessage[]>([])
  const [text, setText] = useState('')
  const [isLaden, setIsLaden] = useState(true)
  const [sendeState, setSendeState] = useState<'idle' | 'sending'>('idle')
  const profileCacheRef = useRef<Record<string, { username: string; avatar_url: string | null }>>({})
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const ladeNachrichten = useCallback(async () => {
    setIsLaden(true)
    try {
      const { data, error } = await supabase
        .from('chat_nachrichten')
        .select('id, league_id, user_id, nachricht, created_at')
        .eq('league_id', leagueId)
        .order('created_at', { ascending: true })
        .limit(100)

      if (error || !data) {
        setIsLaden(false)
        return
      }

      const userIds = [...new Set(data.map(m => m.user_id))]
      let profiles: { id: string; username: string; avatar_url: string | null }[] | null = null

      if (userIds.length > 0) {
        const { data: pData } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .in('id', userIds)
        profiles = pData as { id: string; username: string; avatar_url: string | null }[] | null
      }

      const profileMap: Record<string, { username: string; avatar_url: string | null }> = {}
      profiles?.forEach(p => { profileMap[p.id] = { username: p.username, avatar_url: p.avatar_url } })
      profileCacheRef.current = { ...profileCacheRef.current, ...profileMap }

      const enriched: ChatMessage[] = data.map(m => ({
        ...m,
        username: profileMap[m.user_id]?.username || 'Unbekannt',
        avatar_url: profileMap[m.user_id]?.avatar_url || null,
      }))

      setNachrichten(enriched)
    } catch (err) {
      console.error('Fehler beim Laden der Nachrichten:', err)
      useToastStore.getState().toast('Chat-Nachrichten konnten nicht geladen werden', 'error')
    } finally {
      setIsLaden(false)
    }
  }, [leagueId])

  const subscribeRealtime = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
    }

    const uniqueChannelId = `chat-${leagueId}-${Math.random().toString(36).substring(2, 9)}`
    const channel = supabase
      .channel(uniqueChannelId)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_nachrichten',
          filter: `league_id=eq.${leagueId}`,
        },
        async (payload) => {
          const msg = payload.new as ChatMessage
          let prof = profileCacheRef.current[msg.user_id]
          if (!prof) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('username, avatar_url')
              .eq('id', msg.user_id)
              .single()
            prof = { username: profile?.username || 'Unbekannt', avatar_url: profile?.avatar_url || null }
            profileCacheRef.current[msg.user_id] = prof
          }

          setNachrichten(prev => [...prev, {
            ...msg,
            username: prof!.username,
            avatar_url: prof!.avatar_url,
          }])
        }
      )
      .subscribe()

    channelRef.current = channel
  }, [leagueId])

  // ─── Nachrichten laden ─────────────────────────────
  useEffect(() => {
    ladeNachrichten()
    subscribeRealtime()
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [ladeNachrichten, subscribeRealtime])

  // ─── Auto-Scroll bei neuen Nachrichten ──────────────
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [nachrichten])

  // ─── Senden ────────────────────────────────────────
  async function handleSenden() {
    if (!text.trim() || !user) return
    setSendeState('sending')
    const inhalt = text.trim()
    setText('')

    const { error } = await supabase
      .from('chat_nachrichten')
      .insert({
        league_id: leagueId,
        match_id: null,
        user_id: user.id,
        nachricht: inhalt,
      })

    if (error) {
      console.error('Chat-Fehler:', error)
      useToastStore.getState().toast(`Fehler beim Senden: ${error.message || 'Unbekannt'}`, 'error')
      setText(inhalt)
    }

    setSendeState('idle')
    inputRef.current?.focus()
  }

  // ─── Render ────────────────────────────────────────
  return (
    <div className="bg-surface-container-low border border-surface-container-high rounded-lg overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-3 py-2.5 border-b border-surface-container-high flex items-center gap-2">
        <MessageCircle size={16} className="text-primary-fixed-dim" />
        <span className="text-xs font-mono font-medium uppercase tracking-wider text-on-surface-variant">
          Liga-Chat
        </span>
        <span className="ml-auto text-[10px] font-mono text-on-surface-variant/40">
          {nachrichten.length} Nachrichten
        </span>
      </div>

      {/* Nachrichten-Liste — größer: 500px maxHeight */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-3 py-3 space-y-3"
        style={{ minHeight: '240px', maxHeight: '500px' }}
      >
        {isLaden && (
          <div className="flex items-center justify-center py-8">
            <div className="w-5 h-5 border-2 border-primary-container border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!isLaden && nachrichten.length === 0 && (
          <div className="text-center py-8">
            <MessageCircle size={24} className="text-on-surface-variant/20 mx-auto mb-2" />
            <p className="text-[11px] text-on-surface-variant/40 font-mono uppercase tracking-wider">
              Noch keine Nachrichten
            </p>
          </div>
        )}

        {nachrichten.map((msg, i) => {
          const isSelf = msg.user_id === user?.id
          const prevSame = i > 0 && nachrichten[i - 1].user_id === msg.user_id
          const color = getUserColor(msg.user_id)

          return (
            <div key={msg.id} className={`flex gap-2 ${isSelf ? 'flex-row-reverse' : 'flex-row'}`}>
              {/* Avatar */}
              <div className="flex-shrink-0 mt-0.5">
                {prevSame ? (
                  <div className="w-6 h-6" />
                ) : (
                  <Avatar url={msg.avatar_url} name={msg.username || '?'} />
                )}
              </div>

              <div className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'} flex-1 min-w-0`}>
                {/* Absender-Name + Zeit (nur erste Nachricht der Gruppe) */}
                {!prevSame && (
                  <div className={`flex items-center gap-1.5 mb-0.5 ${isSelf ? 'flex-row-reverse mr-1' : 'ml-1'}`}>
                    <span className={`text-[10px] font-mono font-medium uppercase tracking-wider ${color.text}`}>
                      {msg.username}
                    </span>
                    <span className="text-[9px] font-mono text-on-surface-variant/30">
                      {formatZeit(msg.created_at)}
                    </span>
                  </div>
                )}

                {/* Sprechblase — lesbare Farben */}
                <div className={`w-fit max-w-[90%] px-3 py-2 rounded-2xl ${
                  isSelf
                    ? 'bg-primary/15 border border-primary/20 rounded-br-md'
                    : `${color.bg} ${color.border} rounded-bl-md`
                }`}>
                  <p className={`text-sm leading-relaxed ${
                    isSelf ? 'text-on-surface' : color.text
                  }`}>
                    {msg.nachricht}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Input */}
      <div className="px-3 py-2.5 border-t border-surface-container-high flex items-center gap-2 bg-surface-container-lowest">
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSenden() }}
          placeholder="Nachricht…"
          className="flex-1 bg-surface-container-highest border border-surface-container-high rounded-full px-4 py-2 text-sm text-on-surface placeholder-on-surface-variant/30 focus:border-primary focus:outline-none"
        />
        <button
          onClick={handleSenden}
          disabled={!text.trim() || sendeState === 'sending'}
          className="w-9 h-9 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center hover:opacity-90 transition-opacity disabled:opacity-30 flex-shrink-0"
        >
          <Send size={15} />
        </button>
      </div>
    </div>
  )
}

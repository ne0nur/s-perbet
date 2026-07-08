import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { useTranslation } from '../utils/translations'
import { getUserColor } from '../lib/chatColors'
import { Send, MessageCircle } from 'lucide-react'

interface ChatMessage {
  id: string
  match_id: string
  user_id: string
  username?: string
  avatar_url?: string | null
  nachricht: string
  created_at: string
}

function formatZeit(iso: string, language: string): string {
  const d = new Date(iso)
  const locale = language === 'tr' ? 'tr-TR' : language === 'en' ? 'en-US' : 'de-DE'
  return d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
}

function Avatar({ url, name, size = 'sm' }: { url?: string | null; name: string; size?: 'sm' | 'md' }) {
  const dims = size === 'md' ? 'w-8 h-8' : 'w-6 h-6'
  const textSize = size === 'md' ? 'text-xs' : 'text-[9px]'
  if (url) {
    return <img src={url} alt="" className={`${dims} rounded-full object-cover border border-white/10 flex-shrink-0`}  loading="lazy" />
  }
  return (
    <div className={`${dims} rounded-full bg-surface-container-high border border-white/5 flex items-center justify-center flex-shrink-0`}>
      <span className={`${textSize} font-bold text-on-surface-variant`}>{name.slice(0, 1).toUpperCase()}</span>
    </div>
  )
}

interface MatchChatProps {
  matchId: string
}

export function MatchChat({ matchId }: MatchChatProps) {
  const { user } = useAuthStore()
  const { t, language } = useTranslation()
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
    const { data } = await supabase
      .from('chat_nachrichten')
      .select('id, match_id, user_id, nachricht, created_at')
      .eq('match_id', matchId)
      .order('created_at', { ascending: true })
      .limit(100)

    if (!data) { setIsLaden(false); return }

    const userIds = [...new Set(data.map(m => m.user_id))]
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, avatar_url')
      .in('id', userIds)

    const profileMap: Record<string, { username: string; avatar_url: string | null }> = {}
    profiles?.forEach(p => { profileMap[p.id] = { username: p.username, avatar_url: p.avatar_url } })
    profileCacheRef.current = { ...profileCacheRef.current, ...profileMap }

    const enriched: ChatMessage[] = data.map(m => ({
      ...m,
      username: profileMap[m.user_id]?.username || t('unknown'),
      avatar_url: profileMap[m.user_id]?.avatar_url || null,
    }))

    setNachrichten(enriched)
    setIsLaden(false)
  }, [matchId, t])

  const subscribeRealtime = useCallback(() => {
    const channel = supabase
      .channel(`match-chat-${matchId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_nachrichten',
          filter: `match_id=eq.${matchId}`,
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
            prof = { username: profile?.username || t('unknown'), avatar_url: profile?.avatar_url || null }
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
  }, [matchId, t])

  useEffect(() => {
    ladeNachrichten()
    subscribeRealtime()
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [ladeNachrichten, subscribeRealtime])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [nachrichten])

  async function handleSenden() {
    if (!text.trim() || !user) return
    setSendeState('sending')
    const inhalt = text.trim()
    setText('')

    const { error } = await supabase
      .from('chat_nachrichten')
      .insert({
        match_id: matchId,
        user_id: user.id,
        nachricht: inhalt,
      })

    if (error) {
      console.error('Match-Chat Fehler:', error)
      setText(inhalt)
    }

    setSendeState('idle')
    inputRef.current?.focus()
  }

  return (
    <div className="bg-surface-container-low border border-surface-container-high rounded-xl overflow-hidden flex flex-col h-full min-h-[300px]">
      {/* Header */}
      <div className="px-3 py-2 border-b border-surface-container-high flex items-center gap-2 bg-surface-container-low">
        <MessageCircle size={14} className="text-primary-fixed-dim" />
        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-on-surface-variant">
          {t('trashTalkLive')}
        </span>
        <span className="ml-auto text-[9px] font-mono text-on-surface-variant/40">
          {nachrichten.length} {t('posts')}
        </span>
      </div>

      {/* Message List */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-3 py-3 space-y-3 min-h-[200px]"
      >
        {isLaden && (
          <div className="flex items-center justify-center py-8">
            <div className="w-5 h-5 border-2 border-primary-container border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!isLaden && nachrichten.length === 0 && (
          <div className="text-center py-10">
            <MessageCircle size={20} className="text-on-surface-variant/20 mx-auto mb-2" />
            <p className="text-[9px] text-on-surface-variant/40 font-mono uppercase tracking-wider">
              {t('noTrashTalkYet')}
            </p>
          </div>
        )}

        {nachrichten.map((msg, i) => {
          const isSelf = msg.user_id === user?.id
          const prevSame = i > 0 && nachrichten[i - 1].user_id === msg.user_id
          const color = getUserColor(msg.user_id)

          return (
            <div key={msg.id} className={`flex gap-2 ${isSelf ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className="flex-shrink-0 mt-0.5">
                {prevSame ? (
                  <div className="w-6 h-6" />
                ) : (
                  <Avatar url={msg.avatar_url} name={msg.username || '?'} />
                )}
              </div>

              <div className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'} min-w-0`}>
                {!prevSame && (
                  <div className={`flex items-center gap-1.5 mb-0.5 ${isSelf ? 'flex-row-reverse mr-1' : 'ml-1'}`}>
                    <span className={`text-[9px] font-mono font-bold uppercase tracking-wider ${color.text}`}>
                      {msg.username}
                    </span>
                    <span className="text-[8px] font-mono text-on-surface-variant/30">
                      {formatZeit(msg.created_at, language)}
                    </span>
                  </div>
                )}

                <div className={`max-w-[85%] px-3 py-1.5 rounded-xl ${
                  isSelf
                    ? 'bg-primary/10 border border-primary/20 rounded-br-none text-on-surface text-[12px] font-mono'
                    : `${color.bg} ${color.border} rounded-bl-none text-[12px] font-mono`
                }`}>
                  <p className={isSelf ? 'text-on-surface' : color.text}>
                    {msg.nachricht}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Input section */}
      <div className="px-3 py-2.5 border-t border-surface-container-high flex items-center gap-2 bg-surface-container-lowest">
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSenden() }}
          placeholder={t('writeTrashTalk')}
          className="flex-1 bg-surface-container-highest border border-surface-container-high rounded-full px-4 py-2.5 text-xs text-on-surface placeholder-on-surface-variant/30 focus:border-primary focus:outline-none font-mono"
        />
        <button
          onClick={handleSenden}
          disabled={!text.trim() || sendeState === 'sending'}
          className="w-11 h-11 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center hover:opacity-90 transition-opacity disabled:opacity-30 flex-shrink-0 cursor-pointer"
        >
          <Send size={15} />
        </button>
      </div>
    </div>
  )
}

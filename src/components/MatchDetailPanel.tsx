import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { useMatchStore, type Match, type Tip } from '../stores/matchStore'
import { getTeamLogo } from '../lib/teamLogos'
import { MatchChat } from './MatchChat'
import { Users, MessageCircle, User as UserIcon, X } from 'lucide-react'
import { berechnePunkte } from '../lib/utils'

interface MatchDetailPanelProps {
  matchId: string
  onClose?: () => void
}

function punkteFarbe(punkte: number): string {
  if (punkte === 4) return 'text-green-400'
  if (punkte === 3) return 'text-amber-400'
  if (punkte === 2) return 'text-blue-400'
  return 'text-slate-500'
}

export function MatchDetailPanel({ matchId, onClose }: MatchDetailPanelProps) {
  const { user } = useAuthStore()
  const { matches } = useMatchStore()
  const [tipps, setTipps] = useState<Tip[]>([])
  const [isLaden, setIsLaden] = useState(true)
  const [activeTab, setActiveTab] = useState<'tips' | 'chat'>('tips')

  const match = matches.find(m => m.id === matchId) as Match | undefined

  useEffect(() => {
    if (!matchId || !user) return
    ladeTipps()
  }, [matchId, user])

  async function ladeTipps() {
    setIsLaden(true)
    try {
      // 1. Meine Ligen → Mitglieder-IDs
      const { data: myLeagues } = await supabase
        .from('league_members').select('league_id').eq('user_id', user!.id)

      let leagueUserIds: string[] = []

      if (myLeagues?.length) {
        const leagueIds = myLeagues.map(l => l.league_id)
        const { data: members } = await supabase
          .from('league_members').select('user_id').in('league_id', leagueIds)

        if (members?.length) {
          leagueUserIds = [...new Set(members.map(m => m.user_id))]
        }
      }

      // 2. Tipps laden — nur von Liga-Mitgliedern (oder alle wenn in keiner Liga)
      let query = supabase
        .from('tips')
        .select('*, profile:profiles(username, avatar_url)')
        .eq('match_id', matchId)
        .order('created_at', { ascending: true })

      if (leagueUserIds.length > 0) {
        query = query.in('user_id', leagueUserIds)
      }

      const { data, error } = await query
      if (!error && data) setTipps(data as Tip[])
    } catch (e) {
      console.error('Fehler beim Laden der Tipps im Panel:', e)
    } finally {
      setIsLaden(false)
    }
  }

  if (!match) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center p-6 bg-surface-container-low border border-surface-container-high rounded-xl">
        <p className="text-on-surface-variant/40 text-sm font-mono">Spiel nicht gefunden.</p>
      </div>
    )
  }

  const istVorAnpfiff = match.status === 'upcoming' && new Date(match.anpfiff) > new Date()

  return (
    <div className="bg-surface-container-low border border-surface-container-high rounded-xl overflow-hidden flex flex-col h-full shadow-lg max-h-[85vh] lg:max-h-[calc(100vh-130px)]">
      {/* Panel Header: Team vs Team & Close Button */}
      <div className="bg-surface-container border-b border-surface-container-high p-4 flex flex-col relative">
        {onClose && (
          <button 
            onClick={onClose}
            className="absolute top-3 right-3 text-on-surface-variant hover:text-on-surface p-1 rounded-lg hover:bg-white/5 transition-colors"
          >
            <X size={16} />
          </button>
        )}

        <div className="text-center font-mono text-[9px] text-on-surface-variant/50 uppercase tracking-widest mb-2">
          {match.status === 'live' ? 'LIVE SPIEL' : match.status === 'finished' ? 'SPIEL BEENDET' : 'BEVORSTEHEND'}
        </div>

        {/* Core Match Info: Teams + Score */}
        <div className="flex items-center justify-center gap-6 mt-1 mb-2">
          <div className="flex flex-col items-center gap-1 w-24">
            <img src={getTeamLogo(match.heim_team)} alt="" className="w-10 h-10 object-contain drop-shadow" />
            <span className="text-[10px] font-mono text-on-surface text-center truncate w-full font-bold">{match.heim_team}</span>
          </div>

          <div className="text-center">
            {match.status === 'finished' && match.tore_heim != null ? (
              <div className="font-mono text-2xl font-black text-on-surface tracking-wider">
                {match.tore_heim}:{match.tore_gast}
              </div>
            ) : match.status === 'live' ? (
              <div className="flex flex-col items-center gap-1">
                <span className="live-dot" />
                <span className="font-mono text-2xl font-black text-on-surface animate-pulse">
                  {match.tore_heim ?? 0}:{match.tore_gast ?? 0}
                </span>
              </div>
            ) : (
              <div className="font-mono text-2xl font-black text-on-surface-variant/30">-:-</div>
            )}
          </div>

          <div className="flex flex-col items-center gap-1 w-24">
            <img src={getTeamLogo(match.gast_team)} alt="" className="w-10 h-10 object-contain drop-shadow" />
            <span className="text-[10px] font-mono text-on-surface text-center truncate w-full font-bold">{match.gast_team}</span>
          </div>
        </div>

        {/* Tabs for Panel Sub-views */}
        <div className="flex border-t border-surface-container-high/60 mt-3 pt-2 gap-2">
          <button
            onClick={() => setActiveTab('tips')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider transition-all border ${
              activeTab === 'tips'
                ? 'bg-primary-container/15 text-primary border-primary-container/20 shadow-[0_0_10px_rgba(251,191,36,0.03)]'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <Users size={12} /> Tipps ({tipps.length})
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider transition-all border ${
              activeTab === 'chat'
                ? 'bg-primary-container/15 text-primary border-primary-container/20 shadow-[0_0_10px_rgba(251,191,36,0.03)]'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <MessageCircle size={12} /> Trash-Talk
          </button>
        </div>
      </div>

      {/* Tab Contents */}
      <div className="flex-1 overflow-y-auto p-3">
        {activeTab === 'tips' ? (
          <div className="space-y-1.5">
            {isLaden ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 border-2 border-primary-container border-t-transparent rounded-full animate-spin" />
              </div>
            ) : istVorAnpfiff ? (
              <div className="bg-surface-container-low border border-surface-container-high rounded-xl p-6 text-center text-left">
                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-2.5">
                  <span className="text-sm">🔒</span>
                </div>
                <p className="text-on-surface text-[12px] font-mono font-bold uppercase tracking-wider text-on-surface-variant mb-1">Tipps verdeckt</p>
                <p className="text-on-surface-variant text-[11px] font-mono leading-normal">
                  Die Tipps deiner Cousengs werden erst ab Anpfiff freigeschaltet. Keine Spionage vor Spielbeginn!
                </p>
              </div>
            ) : tipps.length === 0 ? (
              <div className="text-center py-12 font-mono text-on-surface-variant/40 text-xs">
                Für dieses Spiel wurden keine Tipps abgegeben.
              </div>
            ) : (
              tipps.map(tip => {
                const p = match.tore_heim != null && match.tore_gast != null
                  ? berechnePunkte(tip.tipp_heim, tip.tipp_gast, match.tore_heim, match.tore_gast)
                  : 0
                const isOwn = tip.user_id === user?.id
                return (
                  <div key={tip.id}
                    className={`bg-surface-container-lowest border rounded-xl p-2.5 flex items-center gap-3 transition-all ${
                      isOwn ? 'border-primary-container/30 bg-primary-container/5' : 'border-surface-container-high'
                    }`}
                  >
                    <div className="w-7 h-7 rounded-full bg-surface-container-high border border-surface-container-highest flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {tip.profile?.avatar_url ? (
                        <img src={tip.profile.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <UserIcon size={12} className="text-on-surface-variant" />
                      )}
                    </div>
                    <span className={`flex-1 text-xs truncate ${isOwn ? 'text-primary font-bold font-mono' : 'text-on-surface font-medium'}`}>
                      {tip.profile?.username || 'Unbekannt'}
                      {isOwn && <span className="text-[9px] text-on-surface-variant/50 ml-1">(Du)</span>}
                    </span>
                    <span className="font-mono text-xs font-bold text-on-surface px-2 py-0.5 bg-surface-container rounded">
                      {tip.tipp_heim}:{tip.tipp_gast}
                    </span>
                    {match.status === 'finished' && (
                      <span className={`font-mono text-[10px] font-black ${punkteFarbe(p)} bg-surface-container px-1.5 py-0.5 rounded border border-white/5`}>
                        {p}P
                      </span>
                    )}
                  </div>
                )
              })
            )}
          </div>
        ) : (
          <div className="h-full">
            <MatchChat matchId={matchId} />
          </div>
        )}
      </div>
    </div>
  )
}

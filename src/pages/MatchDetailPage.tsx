import { useParams, useNavigate } from 'react-router-dom'
import { MatchDetailPanel } from '../components/MatchDetailPanel'

export function MatchDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  if (!id) return null

  return (
    <div className="min-h-screen bg-background pb-24 max-w-xl mx-auto w-full px-3 pt-4 animate-page-enter">
      <MatchDetailPanel matchId={id} onClose={() => navigate(-1)} />
    </div>
  )
}

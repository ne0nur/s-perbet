import { useParams, useNavigate } from 'react-router-dom'
import { RivalInspector } from '../components/RivalInspector'

export function RivalAnalysisPage() {
  const { userId } = useParams<{ userId: string }>()
  const navigate = useNavigate()

  if (!userId) return null

  return (
    <div className="min-h-screen bg-background px-3 pt-4 pb-24 max-w-xl mx-auto w-full animate-page-enter">
      <RivalInspector userId={userId} onClose={() => navigate(-1)} />
    </div>
  )
}

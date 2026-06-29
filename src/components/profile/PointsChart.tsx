import { useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { useTranslation } from '../../utils/translations'

interface TipData {
  punkte: number
  match: {
    spieltag: number
    status: string
  }
}

interface PointsChartProps {
  tips: TipData[]
}

export function PointsChart({ tips }: PointsChartProps) {
  const { language } = useTranslation()

  const data = useMemo(() => {
    // 1. Gruppiere Punkte nach Spieltag
    const pointsPerMatchday: Record<number, number> = {}
    
    tips.forEach(tip => {
      if (tip.match.status === 'finished') {
        const st = tip.match.spieltag
        if (!pointsPerMatchday[st]) pointsPerMatchday[st] = 0
        pointsPerMatchday[st] += (tip.punkte || 0)
      }
    })

    // 2. Finde den maximalen Spieltag, der gespielt wurde
    const maxSpieltag = Math.max(0, ...Object.keys(pointsPerMatchday).map(Number))
    
    // 3. Berechne kumulative Summe
    const chartData = []
    let currentTotal = 0
    
    // Startpunkt 0
    chartData.push({ name: 'Start', punkte: 0 })

    for (let i = 1; i <= maxSpieltag; i++) {
      currentTotal += (pointsPerMatchday[i] || 0)
      chartData.push({
        name: `${i}. ST`,
        punkte: currentTotal,
        spieltag: i,
        matchdayPoints: pointsPerMatchday[i] || 0
      })
    }

    return chartData
  }, [tips])

  if (data.length <= 1) return null // Nicht genug Daten zum Zeichnen

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      if (data.name === 'Start') return null
      return (
        <div className="bg-[#1E1E1E]/90 backdrop-blur border border-white/10 p-2.5 rounded-xl shadow-xl">
          <p className="text-[10px] font-bold text-on-surface mb-1.5 uppercase tracking-wider">{data.name}</p>
          <div className="flex items-center gap-2">
            <div className="flex flex-col">
              <span className="text-[9px] text-on-surface-variant font-mono uppercase">Gesamt</span>
              <span className="text-sm font-black text-primary-fixed-dim">{data.punkte}</span>
            </div>
            <div className="w-px h-6 bg-white/10" />
            <div className="flex flex-col">
              <span className="text-[9px] text-on-surface-variant font-mono uppercase">Plus</span>
              <span className="text-[10px] font-bold text-emerald-400">+{data.matchdayPoints}</span>
            </div>
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <div className="glass-panel p-4 md:p-5 rounded-2xl border border-white/5 shadow-lg flex flex-col mt-6 overflow-hidden relative">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-primary/5 blur-3xl rounded-full pointer-events-none" />
      
      <h3 className="text-xs md:text-sm font-bold text-on-surface mb-4 flex items-center gap-2 relative z-10">
        <div className="w-6 h-6 rounded-md bg-primary-container/20 border border-primary/20 flex items-center justify-center">
          <span className="text-primary-fixed-dim text-[10px]">📈</span> 
        </div>
        <span className="tracking-wide uppercase">
          {language === 'tr' ? 'Puan Gelişimi' : language === 'en' ? 'Points Progression' : 'Punkteverlauf'}
        </span>
      </h3>
      
      <div className="h-[220px] w-full relative z-10 -ml-2 md:ml-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis 
              dataKey="name" 
              stroke="rgba(255,255,255,0.3)" 
              fontSize={10} 
              tickMargin={10}
              tickFormatter={(val) => val === 'Start' ? '' : val.replace('. ST', '')} 
              axisLine={false}
              tickLine={false}
            />
            <YAxis 
              stroke="rgba(255,255,255,0.3)" 
              fontSize={10} 
              tickMargin={10}
              allowDecimals={false}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(var(--primary-rgb),0.2)', strokeWidth: 2 }} />
            <Line 
              type="monotone" 
              dataKey="punkte" 
              stroke="var(--primary)" 
              strokeWidth={3}
              dot={{ fill: '#1E1E1E', stroke: 'var(--primary)', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, fill: 'var(--primary)', stroke: '#fff', strokeWidth: 2 }}
              animationDuration={2000}
              animationEasing="ease-out"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

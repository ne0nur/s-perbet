export interface ChatColor {
  bg: string
  text: string
  border: string
}

export const USER_COLORS: ChatColor[] = [
  { bg: 'bg-amber-500/10', text: 'text-amber-300', border: 'border-amber-500/20' },
  { bg: 'bg-info-container', text: 'text-info', border: 'border-info/20' },
  { bg: 'bg-success-container', text: 'text-success', border: 'border-success/20' },
  { bg: 'bg-purple-500/10', text: 'text-purple-300', border: 'border-purple-500/20' },
  { bg: 'bg-rose-500/10', text: 'text-rose-300', border: 'border-rose-500/20' },
  { bg: 'bg-cyan-500/10', text: 'text-cyan-300', border: 'border-cyan-500/20' },
  { bg: 'bg-warning-container', text: 'text-warning', border: 'border-warning/20' },
  { bg: 'bg-fuchsia-500/10', text: 'text-fuchsia-300', border: 'border-fuchsia-500/20' },
]

export function getUserColor(userId: string): ChatColor {
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash) + userId.charCodeAt(i)
    hash |= 0
  }
  return USER_COLORS[Math.abs(hash) % USER_COLORS.length]
}

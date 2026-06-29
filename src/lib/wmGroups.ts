/**
 * WM 2026 Gruppen-Zuordnung (laut offiziellem Spielplan)
 * Schlüssel: Englische Teamnamen aus der DB (ESPN API)
 * Werte:    Gruppen-Buchstabe A-L
 */
export const WM_GROUPS: Record<string, string> = {
  // Group A
  'Mexico': 'A', 'South Africa': 'A', 'South Korea': 'A', 'Czechia': 'A',
  // Group B
  'Switzerland': 'B', 'Canada': 'B', 'Bosnia-Herzegovina': 'B', 'Qatar': 'B',
  // Group C
  'Brazil': 'C', 'Morocco': 'C', 'Scotland': 'C', 'Haiti': 'C',
  // Group D
  'United States': 'D', 'Australia': 'D', 'Paraguay': 'D', 'Türkiye': 'D',
  // Group E
  'Germany': 'E', 'Ivory Coast': 'E', 'Ecuador': 'E', 'Curaçao': 'E',
  // Group F
  'Netherlands': 'F', 'Japan': 'F', 'Sweden': 'F', 'Tunisia': 'F',
  // Group G
  'Belgium': 'G', 'Egypt': 'G', 'Iran': 'G', 'New Zealand': 'G',
  // Group H
  'Spain': 'H', 'Cape Verde': 'H', 'Uruguay': 'H', 'Saudi Arabia': 'H',
  // Group I
  'France': 'I', 'Norway': 'I', 'Senegal': 'I', 'Iraq': 'I',
  // Group J
  'Argentina': 'J', 'Austria': 'J', 'Algeria': 'J', 'Jordan': 'J',
  // Group K
  'Colombia': 'K', 'Portugal': 'K', 'Congo DR': 'K', 'Uzbekistan': 'K',
  // Group L
  'England': 'L', 'Croatia': 'L', 'Ghana': 'L', 'Panama': 'L',
}

export function getWMGroup(teamName: string): string | null {
  // Exakter Match
  if (WM_GROUPS[teamName]) return WM_GROUPS[teamName]
  // Fallback: case-insensitive
  const lower = teamName.toLowerCase()
  for (const [key, val] of Object.entries(WM_GROUPS)) {
    if (key.toLowerCase() === lower) return val
  }
  return null
}

/** WM 2026 Phasen-Labels (koRound → Label) */
export const WM_PHASES: Record<number, string> = {
  1: 'Sechzehntelfinale',
  2: 'Achtelfinale',
  3: 'Viertelfinale',
  4: 'Halbfinale',
  5: 'Finale',
}

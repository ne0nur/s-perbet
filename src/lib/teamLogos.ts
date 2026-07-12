const KNOWN_LOGOS = new Set([
  'galatasaray',
  'fenerbahce',
  'besiktas',
  'trabzonspor',
  'basaksehir',
  'ramsbasaksehir',
  'medipolbasaksehir',
  'sivasspor',
  'konyaspor',
  'antalyaspor',
  'kayserispor',
  'kasimpasa',
  'alanyaspor',
  'gaziantep',
  'gaziantepfk',
  'rizespor',
  'caykurrizespor',
  'samsunspor',
  'hatayspor',
  'pendikspor',
  'eyupspor',
  'bodrum',
  'bodrumfk',
  'goztepe',
  'karagumruk',
  'fatihkaragumruk',
  'ankaragucu',
  'adanademirspor',
  'istanbulspor',
  'giresunspor',
  'yenimalatyaspor',
  'altay',
  'amedspor',
  'amedsk',
  // 2026-27 Aufsteiger / neue Teams
  'erzurum',
  'erzurumbb',
  'corum',
  'corumfk',
  'kocaelispor',
  'genclerbirligi',
  'juventus',
  'psveindhoven',
  'bscyoungboys',
  'astonvilla',
  'bayernmunchen',
  'dinamozagreb',
  'sportingcp',
  'lille',
  'acmilan',
  'liverpool',
  'realmadrid',
  'vfbstuttgart',
  'bologna',
  'shakhtardonetsk',
  'spartapraha',
  'redbullsalzburg',
  'manchestercity',
  'inter',
  'parissaintgermain',
  'girona',
  'celtic',
  'slovanbratislava',
  'clubbruggekv',
  'borussiadortmund',
  'feyenoord',
  'bayerleverkusen',
  'fkcrvenazvezda',
  'benfica',
  'monaco',
  'barcelona',
  'stadebrestois29',
  'sturmgraz',
  'atalanta',
  'arsenal',
  'atleticomadrid',
  'rbleipzig',
  // World Cup 2026
  'algeria', 'austria', 'jordan', 'argentina', 'southafrica', 'canada',
  'brazil', 'japan', 'germany', 'paraguay',
])

function normalizeName(name: string): string {
  if (!name) return ''
  return name.toLowerCase()
    .normalize('NFD') // Zerlegt Sonderzeichen (z. B. ş -> s + Akzent)
    .replace(/[\u0300-\u036f]/g, '') // Entfernt die Akzente
    .replace(/ı/g, 'i')
    .replace(/[^a-z0-9]/g, '') // Entfernt Leerzeichen und Sonderzeichen
}

/**
 * Gibt den Pfad zum lokalen Vereinslogo zurück.
 * Falls das Logo nicht existiert, wird ein generisches Standard-Logo zurückgegeben.
 */
export function getTeamLogo(teamName: string): string {
  let clean = normalizeName(teamName)
  
  // Custom mappings for spelling variations across seasons
  if (clean === 'istanbulbasaksehir' || clean === 'medipolbasaksehir' || clean === 'ramsbasaksehir') {
    clean = 'basaksehir'
  } else if (clean === 'gazisehirgaziantep' || clean === 'gaziantepfk') {
    clean = 'gaziantep'
  } else if (clean === 'caykurrizespor') {
    clean = 'rizespor'
  } else if (clean === 'bbbodrumspor' || clean === 'bodrumfk') {
    clean = 'bodrum'
  } else if (clean === 'fatihkaragumruk') {
    clean = 'karagumruk'
  } else if (clean === 'amedsk' || clean === 'amed') {
    clean = 'amedspor'
  } else if (clean === 'paris' || clean === 'psg' || clean === 'parissaintgermain') {
    clean = 'parissaintgermain'
  } else if (clean === 'bayern' || clean === 'fcbayernmunchen') {
    clean = 'bayernmunchen'
  } else if (clean === 'dortmund' || clean === 'bvb') {
    clean = 'borussiadortmund'
  }

  // Country Flags Mapping (ISO 3166-1 alpha-2 for flagcdn)
  const COUNTRY_FLAGS: Record<string, string> = {
    'mexico': 'mx', 'southafrica': 'za', 'southkorea': 'kr', 'czechia': 'cz',
    'canada': 'ca', 'bosniaherzegovina': 'ba', 'unitedstates': 'us', 'paraguay': 'py',
    'qatar': 'qa', 'switzerland': 'ch', 'brazil': 'br', 'morocco': 'ma', 'haiti': 'ht',
    'scotland': 'gb-sct', 'australia': 'au', 'turkiye': 'tr', 'turkey': 'tr',
    'germany': 'de', 'curacao': 'cw', 'netherlands': 'nl', 'japan': 'jp',
    'ivorycoast': 'ci', 'ecuador': 'ec', 'sweden': 'se', 'tunisia': 'tn',
    'spain': 'es', 'capeverde': 'cv', 'belgium': 'be', 'egypt': 'eg',
    'saudiarabia': 'sa', 'uruguay': 'uy', 'iran': 'ir', 'newzealand': 'nz',
    'france': 'fr', 'senegal': 'sn', 'iraq': 'iq', 'norway': 'no',
    'argentina': 'ar', 'algeria': 'dz', 'austria': 'at', 'jordan': 'jo',
    'portugal': 'pt', 'congodr': 'cd', 'england': 'gb-eng', 'croatia': 'hr',
    'ghana': 'gh', 'panama': 'pa', 'uzbekistan': 'uz', 'colombia': 'co',
    // deutsche namen fallback
    'deutschland': 'de', 'spanien': 'es', 'frankreich': 'fr', 'italien': 'it',
    'niederlande': 'nl', 'belgien': 'be', 'osterreich': 'at', 'schweiz': 'ch',
    'sudafrika': 'za', 'argentinien': 'ar', 'brasilien': 'br', 'algerien': 'dz',
    'jordanien': 'jo', 'kanada': 'ca', 'turkei': 'tr'
  }

  if (COUNTRY_FLAGS[clean]) {
    return `https://flagcdn.com/${COUNTRY_FLAGS[clean]}.svg`
  }

  if (KNOWN_LOGOS.has(clean)) {
    const baseUrl = import.meta.env.BASE_URL || '/'
    // Strip trailing slash if any
    const base = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
    return `${base}/logos/${clean}.png`
  }
  // Fallback: SVG mit Team-Initialen statt unknown.png
  return generateInitialsSvg(teamName)
}

function generateInitialsSvg(name: string): string {
  const parts = name.replace(/[^a-zA-Z0-9 ]/g, '').trim().split(/\s+/)
  let initials = ''
  if (parts.length >= 2) {
    initials = (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  } else {
    initials = name.slice(0, 2).toUpperCase()
  }
  // Konsistente Farbe aus Team-Namen hashen
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  const hue = Math.abs(hash) % 360
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
    <rect width="100" height="100" rx="20" fill="hsl(${hue},35%,20%)"/>
    <text x="50" y="50" text-anchor="middle" dominant-baseline="central"
      font-family="system-ui,sans-serif" font-size="40" font-weight="700"
      fill="hsl(${hue},35%,80%)">${initials}</text>
  </svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg.replace(/\s+/g, ' '))}`
}

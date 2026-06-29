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

  // World Cup 2026 Team Crests (Livescore + Fallbacks)
  const COUNTRY_FLAGS: Record<string, string> = {
    'mexico': 'https://lsm-static-prod.livescore.com/medium/enet/6710.png',
    'southafrica': 'https://flagcdn.com/za.svg',
    'southkorea': 'https://lsm-static-prod.livescore.com/medium/enet/7804.png',
    'czechia': 'https://lsm-static-prod.livescore.com/medium/enet/8496.png',
    'canada': 'https://lsm-static-prod.livescore.com/medium/enet/5810.png',
    'bosniaherzegovina': 'https://lsm-static-prod.livescore.com/medium/enet/10106.png',
    'unitedstates': 'https://lsm-static-prod.livescore.com/medium/enet/6713.png',
    'paraguay': 'https://lsm-static-prod.livescore.com/medium/enet/6724.png',
    'qatar': 'https://lsm-static-prod.livescore.com/medium/enet/5902.png',
    'switzerland': 'https://lsm-static-prod.livescore.com/medium/enet/6717.png',
    'brazil': 'https://lsm-static-prod.livescore.com/medium/enet/8256.png',
    'morocco': 'https://lsm-static-prod.livescore.com/medium/enet/6262.png',
    'haiti': 'https://lsm-static-prod.livescore.com/medium/enet/5934.png',
    'scotland': 'https://lsm-static-prod.livescore.com/medium/enet/8498.png',
    'australia': 'https://lsm-static-prod.livescore.com/medium/enet/6716.png',
    'turkiye': 'https://lsm-static-prod.livescore.com/medium/enet/8276.png', // manual fix (Turkey)
    'turkey': 'https://lsm-static-prod.livescore.com/medium/enet/8276.png',
    'germany': 'https://lsm-static-prod.livescore.com/medium/enet/8570.png',
    'curacao': 'https://lsm-static-prod.livescore.com/medium/enet/287981.png',
    'netherlands': 'https://lsm-static-prod.livescore.com/medium/enet/6708.png',
    'japan': 'https://lsm-static-prod.livescore.com/medium/enet/6715.png',
    'ivorycoast': 'https://lsm-static-prod.livescore.com/medium/enet/6709.png',
    'ecuador': 'https://lsm-static-prod.livescore.com/medium/enet/6707.png',
    'sweden': 'https://lsm-static-prod.livescore.com/medium/enet/8520.png',
    'tunisia': 'https://lsm-static-prod.livescore.com/medium/enet/6719.png',
    'spain': 'https://lsm-static-prod.livescore.com/medium/enet/6720.png',
    'capeverde': 'https://lsm-static-prod.livescore.com/medium/enet/5888.png',
    'belgium': 'https://lsm-static-prod.livescore.com/medium/enet/8263.png',
    'egypt': 'https://lsm-static-prod.livescore.com/medium/enet/10255.png',
    'saudiarabia': 'https://lsm-static-prod.livescore.com/medium/enet/7795.png',
    'uruguay': 'https://lsm-static-prod.livescore.com/medium/enet/5796.png',
    'iran': 'https://lsm-static-prod.livescore.com/medium/enet/6711.png',
    'newzealand': 'https://flagcdn.com/nz.svg',
    'france': 'https://lsm-static-prod.livescore.com/medium/enet/6723.png',
    'senegal': 'https://lsm-static-prod.livescore.com/medium/enet/6395.png',
    'iraq': 'https://lsm-static-prod.livescore.com/medium/enet/5819.png',
    'norway': 'https://lsm-static-prod.livescore.com/medium/enet/8492.png',
    'argentina': 'https://lsm-static-prod.livescore.com/medium/enet/6706.png',
    'algeria': 'https://lsm-static-prod.livescore.com/medium/enet/6265.png', // manual fix
    'austria': 'https://lsm-static-prod.livescore.com/medium/enet/8255.png',
    'jordan': 'https://a.espncdn.com/i/teamlogos/countries/500/jor.png',
    'portugal': 'https://lsm-static-prod.livescore.com/medium/enet/8361.png',
    'congodr': 'https://lsm-static-prod.livescore.com/medium/enet/6321.png',
    'england': 'https://lsm-static-prod.livescore.com/medium/enet/8491.png',
    'croatia': 'https://lsm-static-prod.livescore.com/medium/enet/10155.png',
    'ghana': 'https://lsm-static-prod.livescore.com/medium/enet/6714.png',
    'panama': 'https://a.espncdn.com/i/teamlogos/countries/500/pan.png',
    'uzbekistan': 'https://lsm-static-prod.livescore.com/medium/enet/8700.png',
    'colombia': 'https://lsm-static-prod.livescore.com/medium/enet/8258.png',

    // deutsche namen fallback
    'deutschland': 'https://lsm-static-prod.livescore.com/medium/enet/8570.png',
    'spanien': 'https://lsm-static-prod.livescore.com/medium/enet/6720.png',
    'frankreich': 'https://lsm-static-prod.livescore.com/medium/enet/6723.png',
    'italien': 'https://lsm-static-prod.livescore.com/medium/enet/8261.png',
    'niederlande': 'https://lsm-static-prod.livescore.com/medium/enet/6708.png',
    'belgien': 'https://lsm-static-prod.livescore.com/medium/enet/8263.png',
    'osterreich': 'https://lsm-static-prod.livescore.com/medium/enet/8255.png',
    'schweiz': 'https://lsm-static-prod.livescore.com/medium/enet/6717.png',
    'sudafrika': 'https://flagcdn.com/za.svg',
    'argentinien': 'https://lsm-static-prod.livescore.com/medium/enet/6706.png',
    'brasilien': 'https://lsm-static-prod.livescore.com/medium/enet/8256.png',
    'algerien': 'https://lsm-static-prod.livescore.com/medium/enet/6265.png',
    'jordanien': 'https://a.espncdn.com/i/teamlogos/countries/500/jor.png',
    'kanada': 'https://lsm-static-prod.livescore.com/medium/enet/5810.png',
    'turkei': 'https://lsm-static-prod.livescore.com/medium/enet/8276.png'
  }

  if (COUNTRY_FLAGS[clean]) {
    return COUNTRY_FLAGS[clean]
  }

  if (KNOWN_LOGOS.has(clean)) {
    const baseUrl = import.meta.env.BASE_URL || '/'
    // Strip trailing slash if any
    const base = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
    return `${base}/logos/${clean}.png`
  }
  const baseUrl = import.meta.env.BASE_URL || '/'
  const base = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
  return `${base}/logos/unknown.png`
}

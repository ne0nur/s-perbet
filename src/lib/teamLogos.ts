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
  'rbleipzig'
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

  if (KNOWN_LOGOS.has(clean)) {
    return `/logos/${clean}.png`
  }
  return '/logos/unknown.png'
}

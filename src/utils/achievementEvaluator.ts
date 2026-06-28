export interface MatchDetails {
  id: string
  spieltag: number
  heim_team: string
  gast_team: string
  anpfiff: string
  tore_heim: number | null
  tore_gast: number | null
  status: string
}

export interface TipDetails {
  id: string
  tipp_heim: number
  tipp_gast: number
  punkte: number
  created_at: string
  updated_at: string
  match: MatchDetails
}

const BIG_4 = ['Galatasaray', 'Fenerbahçe', 'Beşiktaş', 'Trabzonspor']

function isDerby(m: MatchDetails): boolean {
  return BIG_4.includes(m.heim_team) && BIG_4.includes(m.gast_team)
}

export function evaluateAchievements(
  userTips: TipDetails[],
  profil: { gesamt_punkte: number; exakte_treffer: number; is_admin: boolean; rang: number | null; league_count: number } | null,
  avatarUrl: string | null,
  username: string
): Set<string> {
  const unlocked = new Set<string>()

  // Hoşgeldin Abi: Profile completed and avatar uploaded
  // This can be unlocked even without any tips!
  if (avatarUrl && username) {
    unlocked.add('hosgeldin_abi')
  }

  if (!userTips || userTips.length === 0) {
    if (profil && profil.gesamt_punkte > 0) {
      // Fallback if tips are empty but profile has points (should not normally happen)
      unlocked.add('ilk_kan')
    }
    return unlocked
  }

  const punkte = profil?.gesamt_punkte || 0
  const userRank = profil?.rang || null
  const leagueCount = profil?.league_count || 0

  // Filter finished and upcoming tips
  const finishedTips = userTips
    .filter(t => t.match && t.match.status === 'finished' && t.match.tore_heim !== null && t.match.tore_gast !== null)
    .sort((a, b) => new Date(a.match.anpfiff).getTime() - new Date(b.match.anpfiff).getTime())

  // Group tips by matchday (spieltag)
  const tipsByMatchday: Record<number, TipDetails[]> = {}
  userTips.forEach(t => {
    if (t.match) {
      if (!tipsByMatchday[t.match.spieltag]) {
        tipsByMatchday[t.match.spieltag] = []
      }
      tipsByMatchday[t.match.spieltag].push(t)
    }
  })

  // --- 1. Speyer Locals ---
  
  // Domstadt-Don: Rank 1 overall and has tipped at least 27 matches (approx 3 matchdays)
  if (userRank === 1 && finishedTips.length >= 27) {
    unlocked.add('domstadt_don')
  }

  // Brezelfest-Kral: 5 consecutive exact tips (4 points)
  let exactStreak = 0
  for (const t of finishedTips) {
    if (t.punkte === 4) {
      exactStreak++
      if (exactStreak >= 5) unlocked.add('brezelfest_kral')
    } else {
      exactStreak = 0
    }
  }

  // Maxi-Flaneur: First to reach 100 overall points (Check if points >= 100)
  if (punkte >= 100) {
    unlocked.add('maxi_flaneur')
  }

  // Schorle & Çay: Friday night all matches tendency correct (punkte >= 2)
  // Group Friday matches by date string
  const fridayTipsByDate: Record<string, TipDetails[]> = {}
  finishedTips.forEach(t => {
    const d = new Date(t.match.anpfiff)
    // 5 = Friday
    if (d.getDay() === 5) {
      const dateStr = d.toISOString().split('T')[0]
      if (!fridayTipsByDate[dateStr]) fridayTipsByDate[dateStr] = []
      fridayTipsByDate[dateStr].push(t)
    }
  })
  for (const tips of Object.values(fridayTipsByDate)) {
    if (tips.length >= 2 && tips.every(t => t.punkte >= 1)) {
      unlocked.add('schorle_cay')
      break
    }
  }

  // Technik-Museum: Tip submitted within 5 minutes before kickoff
  for (const t of userTips) {
    const anpfiffTime = new Date(t.match.anpfiff).getTime()
    const tipTime = new Date(t.updated_at || t.created_at).getTime()
    const diffMs = anpfiffTime - tipTime
    if (diffMs >= 0 && diffMs <= 5 * 60 * 1000) {
      unlocked.add('technik_museum')
    }
  }

  // Altpörtel-Sniper: 3 away wins exactly correct (4 points) in 1 matchday
  for (const matchdayTips of Object.values(tipsByMatchday)) {
    const exactAwayWins = matchdayTips.filter(
      t => t.punkte === 4 && t.match.status === 'finished' && t.match.tore_gast !== null && t.match.tore_heim !== null && t.match.tore_gast > t.match.tore_heim
    )
    if (exactAwayWins.length >= 3) {
      unlocked.add('altpoertel_sniper')
      break
    }
  }

  // Speyer-Boss: Overall winner at the end of the season
  if (userRank === 1 && finishedTips.length >= 300) {
    unlocked.add('speyer_boss')
  }

  // --- 2. Trash-Talk & Fails ---

  // Vallah Krise: Exactly 0 points on a full matchday (minimum 3 tips submitted on that matchday)
  for (const matchdayTips of Object.values(tipsByMatchday)) {
    const finishedMD = matchdayTips.filter(t => t.match.status === 'finished')
    if (finishedMD.length === matchdayTips.length && finishedMD.length >= 3 && finishedMD.every(t => t.punkte <= 0)) {
      unlocked.add('vallah_krise')
      break
    }
  }

  // Kupon Yırtan: Tipped a home win by 2+ goals, but they ended up losing (torn betting coupon)
  for (const t of finishedTips) {
    if (t.match.tore_heim !== null && t.match.tore_gast !== null) {
      const predDiff = t.tipp_heim - t.tipp_gast
      if (predDiff >= 2 && t.match.tore_heim < t.match.tore_gast && t.punkte <= 0) {
        unlocked.add('kupon_yirtan')
        break
      }
      const predDiffAway = t.tipp_gast - t.tipp_heim
      if (predDiffAway >= 2 && t.match.tore_gast < t.match.tore_heim && t.punkte <= 0) {
        unlocked.add('kupon_yirtan')
        break
      }
    }
  }

  // Amk-Modus: 3x in a row missed exact score by exactly 1 goal (only got tendency = 2 pts)
  let amkStreak = 0
  for (const t of finishedTips) {
    if (t.match.tore_heim !== null && t.match.tore_gast !== null && t.punkte === 3) {
      const predDiff = t.tipp_heim - t.tipp_gast
      const actDiff = t.match.tore_heim - t.match.tore_gast
      if (Math.abs(predDiff - actDiff) === 1) {
        amkStreak++
        if (amkStreak >= 3) unlocked.add('amk_modus')
      } else {
        amkStreak = 0
      }
    } else {
      amkStreak = 0
    }
  }

  // Ters Köşe: Tipped GAL, FEN, BES or TRA to win at home, but they lost
  for (const t of finishedTips) {
    if (t.match.tore_heim !== null && t.match.tore_gast !== null) {
      const isBigHome = BIG_4.includes(t.match.heim_team)
      if (isBigHome && t.tipp_heim > t.tipp_gast && t.match.tore_heim < t.match.tore_gast) {
        unlocked.add('ters_koese')
        break
      }
    }
  }

  // Hayalet: Forgot to tip for 3 consecutive matchdays (only count matchdays that actually exist in DB)
  const allMatchdays = Array.from(
    new Set(userTips.map(t => t.match?.spieltag).filter(Boolean))
  ).sort((a, b) => a - b)
  if (allMatchdays.length >= 3) {
    const minMd = allMatchdays[0]
    const maxMd = allMatchdays[allMatchdays.length - 1]
    let missingStreak = 0
    for (let md = minMd; md <= maxMd; md++) {
      const mdHasMatches = allMatchdays.includes(md)
      if (!mdHasMatches) continue
      const userTipped = tipsByMatchday[md] && tipsByMatchday[md].length > 0
      if (!userTipped) {
        missingStreak++
        if (missingStreak >= 3) unlocked.add('hayalet')
      } else {
        missingStreak = 0
      }
    }
  }

  // Uğursuz (Tippschein-Pechvogel): Off by exactly one goal, 3 times in a row
  let ugursuzStreak = 0
  for (const t of finishedTips) {
    if (t.match.tore_heim !== null && t.match.tore_gast !== null) {
      const homeOff = Math.abs(t.tipp_heim - t.match.tore_heim)
      const gastOff = Math.abs(t.tipp_gast - t.match.tore_gast)
      if ((homeOff === 1 && gastOff === 0) || (homeOff === 0 && gastOff === 1)) {
        ugursuzStreak++
        if (ugursuzStreak >= 3) unlocked.add('ugursuz')
      } else {
        ugursuzStreak = 0
      }
    } else {
      ugursuzStreak = 0
    }
  }

  // Kral Çıplak: Scored less than 2 points on a matchday after previously scoring >= 15 points on the previous matchday
  const matchdays = Object.keys(tipsByMatchday).map(Number).sort((a, b) => a - b)
  for (let i = 1; i < matchdays.length; i++) {
    const prevMd = matchdays[i - 1]
    const currMd = matchdays[i]
    const prevTips = tipsByMatchday[prevMd].filter(t => t.match.status === 'finished')
    const currTips = tipsByMatchday[currMd].filter(t => t.match.status === 'finished')
    
    if (prevTips.length >= 5 && currTips.length >= 5) {
      const prevPoints = prevTips.reduce((sum, t) => sum + t.punkte, 0)
      const currPoints = currTips.reduce((sum, t) => sum + t.punkte, 0)
      if (prevPoints >= 15 && currPoints <= 2) {
        unlocked.add('kral_ciplak')
        break
      }
    }
  }

  // Finito: Last place at the end of the season
  if (leagueCount > 1 && userRank === leagueCount && finishedTips.length >= 300) {
    unlocked.add('finito')
  }

  // --- 3. Süper Lig Culture ---

  // Derby-Baba: Galatasaray vs Fenerbahçe exact score tipped
  for (const t of finishedTips) {
    if (isDerby(t.match) && t.punkte === 4) {
      const isGalFen = (t.match.heim_team === 'Galatasaray' && t.match.gast_team === 'Fenerbahçe') ||
                        (t.match.heim_team === 'Fenerbahçe' && t.match.gast_team === 'Galatasaray')
      if (isGalFen) {
        unlocked.add('derby_baba')
        break
      }
    }
  }

  // Cim Bom Bom: 3 exact tips on Galatasaray wins
  const exactGalWins = finishedTips.filter(
    t => t.punkte === 4 && 
    t.match.tore_heim !== null && t.match.tore_gast !== null &&
    ((t.match.heim_team === 'Galatasaray' && t.match.tore_heim > t.match.tore_gast) ||
     (t.match.gast_team === 'Galatasaray' && t.match.tore_gast > t.match.tore_heim))
  )
  if (exactGalWins.length >= 3) unlocked.add('cim_bom_bom')

  // Fener Ağlama: 3 exact tips on Fenerbahçe wins
  const exactFenWins = finishedTips.filter(
    t => t.punkte === 4 && 
    t.match.tore_heim !== null && t.match.tore_gast !== null &&
    ((t.match.heim_team === 'Fenerbahçe' && t.match.tore_heim > t.match.tore_gast) ||
     (t.match.gast_team === 'Fenerbahçe' && t.match.tore_gast > t.match.tore_heim))
  )
  if (exactFenWins.length >= 3) unlocked.add('fener_aglama')

  // Kara Kartal: 3 exact tips on Beşiktaş wins
  const exactBesWins = finishedTips.filter(
    t => t.punkte === 4 && 
    t.match.tore_heim !== null && t.match.tore_gast !== null &&
    ((t.match.heim_team === 'Beşiktaş' && t.match.tore_heim > t.match.tore_gast) ||
     (t.match.gast_team === 'Beşiktaş' && t.match.tore_gast > t.match.tore_heim))
  )
  if (exactBesWins.length >= 3) unlocked.add('kara_kartal')

  // Bize Her Yer Trabzon: 3 exact tips on Trabzonspor wins
  const exactTraWins = finishedTips.filter(
    t => t.punkte === 4 && 
    t.match.tore_heim !== null && t.match.tore_gast !== null &&
    ((t.match.heim_team === 'Trabzonspor' && t.match.tore_heim > t.match.tore_gast) ||
     (t.match.gast_team === 'Trabzonspor' && t.match.tore_gast > t.match.tore_heim))
  )
  if (exactTraWins.length >= 3) unlocked.add('bize_her_yer_trabzon')

  // Der Alman: Tipped a draw (Unentschieden) in the first 3 Derbies
  const userDerbyTips = finishedTips.filter(t => isDerby(t.match))
  const first3Derbies = userDerbyTips.slice(0, 3)
  if (first3Derbies.length >= 3 && first3Derbies.every(t => t.tipp_heim === t.tipp_gast)) {
    unlocked.add('der_alman')
  }

  // Gurbetçi: Tipped every match of Hinrunde (matchday 1-19)
  let tippedAllHinrunde = true
  for (let md = 1; md <= 19; md++) {
    const tipsForMD = tipsByMatchday[md] || []
    if (tipsForMD.length < 8) {
      tippedAllHinrunde = false
      break
    }
  }
  if (tippedAllHinrunde) {
    unlocked.add('gurbetci')
  }

  // Hadi Lan!: Tip submitted within 1 minute before kickoff
  for (const t of finishedTips) {
    if (t.punkte > 0) {
      const diffMs = new Date(t.match.anpfiff).getTime() - new Date(t.updated_at).getTime()
      if (diffMs >= 0 && diffMs <= 60 * 1000) {
        unlocked.add('hadi_lan')
      }
    }
  }

  // --- 4. Purer Flex ---

  // İlk Kan: First tip submitted
  if (userTips.length >= 1) {
    unlocked.add('ilk_kan')
  }

  // Macher: 5 consecutive matchdays where user tipped all matches
  let macherStreak = 0
  for (let md = 1; md <= 38; md++) {
    const mdTips = tipsByMatchday[md] || []
    const allGuessed = mdTips.length >= 9
    if (allGuessed) {
      macherStreak++
      if (macherStreak >= 5) unlocked.add('macher')
    } else {
      macherStreak = 0
    }
  }

  // Kahin: >=3 exact tips (4 points) in a single matchday
  for (const matchdayTips of Object.values(tipsByMatchday)) {
    const exactCountMD = matchdayTips.filter(t => t.punkte === 4 && t.match.status === 'finished').length
    if (exactCountMD >= 3) {
      unlocked.add('kahin')
      break
    }
  }

  // Son Dakika: Tipped in last 5 minutes before kickoff and got points
  for (const t of finishedTips) {
    if (t.punkte > 0) {
      const diffMs = new Date(t.match.anpfiff).getTime() - new Date(t.updated_at).getTime()
      if (diffMs > 0 && diffMs <= 5 * 60 * 1000) {
        unlocked.add('son_dakika')
        break
      }
    }
  }

  // Bereket: Tipped Big 4 5x in a row and scored points each time
  const big4Tips = finishedTips.filter(
    t => BIG_4.includes(t.match.heim_team) || BIG_4.includes(t.match.gast_team)
  )
  let big4Streak = 0
  for (const t of big4Tips) {
    if (t.punkte > 0) {
      big4Streak++
      if (big4Streak >= 5) unlocked.add('bereket')
    } else {
      big4Streak = 0
    }
  }

  // Psikopat: Tipped a wild score (e.g. 3:3, 4:2, 5:1) correctly
  for (const t of finishedTips) {
    if (t.punkte === 4 && t.match.tore_heim !== null && t.match.tore_gast !== null) {
      const totalGoals = t.tipp_heim + t.tipp_gast
      const maxGoals = Math.max(t.tipp_heim, t.tipp_gast)
      if (totalGoals >= 6 || maxGoals >= 4) {
        unlocked.add('psikopat')
        break
      }
    }
  }

  // Kebap-Spieß: 4 exact tips on a single matchday
  for (const matchdayTips of Object.values(tipsByMatchday)) {
    const exactCountMD = matchdayTips.filter(t => t.punkte === 4 && t.match.status === 'finished').length
    if (exactCountMD >= 4) {
      unlocked.add('kebap_spiess')
      break
    }
  }

  // Sıfır Sıkıntı: 10 consecutive matches with points
  let pointsStreak = 0
  for (const t of finishedTips) {
    if (t.punkte > 0) {
      pointsStreak++
      if (pointsStreak >= 10) unlocked.add('sifir_sikinti')
    } else {
      pointsStreak = 0
    }
  }

  // Gegen den Strom: Tipped on underdog against Big 4 and scored points (won)
  for (const t of finishedTips) {
    const isBigHome = BIG_4.includes(t.match.heim_team)
    const isBigAway = BIG_4.includes(t.match.gast_team)
    
    if (isBigHome && !isBigAway && t.punkte >= 3) {
      if (t.tipp_gast > t.tipp_heim) {
        unlocked.add('gegen_den_strom')
        break
      }
    } else if (isBigAway && !isBigHome && t.punkte >= 3) {
      if (t.tipp_heim > t.tipp_gast) {
        unlocked.add('gegen_den_strom')
        break
      }
    }
  }

  // Kardeşim Benim: Tipped the exact same score for 3 matches on a single matchday (copy-paste style)
  for (const matchdayTips of Object.values(tipsByMatchday)) {
    const scoreCounts: Record<string, number> = {}
    matchdayTips.forEach(t => {
      const key = `${t.tipp_heim}:${t.tipp_gast}`
      scoreCounts[key] = (scoreCounts[key] || 0) + 1
    })
    const hasCopy = Object.values(scoreCounts).some(count => count >= 3)
    if (hasCopy) {
      unlocked.add('kardesim_benim')
      break
    }
  }

  return unlocked
}

 
import { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { usePresenceStore } from '../stores/presenceStore'
import { BookOpen, Sparkles, Download } from 'lucide-react'
import { usePwaStore } from '../stores/pwaStore'
import { useToastStore } from '../stores/toastStore'
import { calculateLevelDetails } from '../lib/utils'
import { useLanguageStore } from '../stores/languageStore'
import { useTranslation } from '../utils/translations'

// Import profile subcomponents
import { UserInfoSettings } from '../components/profile/UserInfoSettings'
import { LevelProgressCard } from '../components/profile/LevelProgressCard'
import { AdminSection } from '../components/profile/AdminSection'
import { NotificationSettings } from '../components/profile/NotificationSettings'
import { StatsGrid } from '../components/profile/StatsGrid'
import { AchievementsSection } from '../components/profile/AchievementsSection'
import { evaluateAchievements, type TipDetails } from '../utils/achievementEvaluator'
import { BonusTippsCard } from '../components/profile/BonusTippsCard'

interface BonusTipp { frage_id: number; antwort: string }



function komprimiereBild(file: File, maxKB: number = 80): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const MAX = 200
        let w = img.width, h = img.height
        if (w > MAX || h > MAX) {
          if (w > h) { h = (h / w) * MAX; w = MAX }
          else { w = (w / h) * MAX; h = MAX }
        }
        const canvas = document.createElement('canvas')
        canvas.width = w; canvas.height = h
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0, w, h)
        let quality = 0.7
        let dataUrl = canvas.toDataURL('image/jpeg', quality)
        while (dataUrl.length > maxKB * 1365 && quality > 0.1) {
          quality -= 0.1
          dataUrl = canvas.toDataURL('image/jpeg', quality)
        }
        resolve(dataUrl)
      }
      img.onerror = reject
      img.src = e.target?.result as string
    }
    reader.readAsDataURL(file)
  })
}

export function ProfilePage() {
  const { t, language } = useTranslation()
  const { setLanguage } = useLanguageStore()
  const { user, logout } = useAuthStore()
  const [username, setUsername] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [profil, setProfil] = useState<{ gesamt_punkte: number; exakte_treffer: number; is_admin: boolean; rang: number | null; league_count: number } | null>(null)
  const [isLaden, setIsLaden] = useState(true)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const [notifyAnpfiff, setNotifyAnpfiff] = useState(true)
  const [notifyChat, setNotifyChat] = useState(false)
  const [bonusTipps, setBonusTipps] = useState<BonusTipp[]>([])
  const [antworten, setAntworten] = useState<Record<number, string>>({})
  const [gespeichert, setGespeichert] = useState(false)
  const [bonusGesperrt, setBonusGesperrt] = useState(false)
  const [userTips, setUserTips] = useState<TipDetails[]>([])

  // Level animation states
  const [animatedPoints, setAnimatedPoints] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  const [showLevelUpModal, setShowLevelUpModal] = useState(false)
  const [initialLevelRef, setInitialLevelRef] = useState(1)

  // Advanced Stats
  const [stats, setStats] = useState({
    total: 0,
    exact: 0,
    diff: 0,
    tend: 0,
    miss: 0,
    avg: 0,
    rate: 0
  })

  // Admin
  const [newUsername, setNewUsername] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [adminMsg, setAdminMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [creatingUser, setCreatingUser] = useState(false)
  const [selectedLeagueId, setSelectedLeagueId] = useState('')
  const [allLeagues, setAllLeagues] = useState<{ id: string; name: string }[]>([])
  const [batchCount, setBatchCount] = useState<number>(1)
  const [createdUsersList, setCreatedUsersList] = useState<{ username: string; password: string }[]>([])
  const [adminTab, setAdminTab] = useState<'overview' | 'create' | 'manage_users' | 'manage_leagues' | 'manage_matches'>('overview')
  const [adminCreateSubTab, setAdminCreateSubTab] = useState<'manual' | 'auto'>('manual')
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [totalUsers, setTotalUsers] = useState<number>(0)
  
  const { onlineUsers } = usePresenceStore()

  const [remainingPoints, setRemainingPoints] = useState({ sl: 0, cl: 0, total: 0 })

  // Profile Tabs
  const [activeTab, setActiveTab] = useState<'overview' | 'achievements' | 'bonus' | 'settings' | 'admin'>('overview')

  const { isInstallable, triggerInstall } = usePwaStore()
  const [isIosNotStandalone, setIsIosNotStandalone] = useState(false)

  useEffect(() => {
    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    if (isIos && !isStandalone) {
      setIsIosNotStandalone(true)
    }
  }, [])

  // Achievements Evaluation
  const userId = user?.id
  const unlockedSet = useMemo(() => {
    const evaluated = evaluateAchievements(userTips, profil, avatarUrl, username)
    if (!userId) return evaluated

    const storageKey = `superbet_unlocked_achievements_${userId}`
    const savedArr = JSON.parse(localStorage.getItem(storageKey) || '[]')
    
    // Union of evaluated and saved
    const union = new Set([...savedArr, ...evaluated])
    
    // Save union if it changed
    if (union.size > savedArr.length) {
      localStorage.setItem(storageKey, JSON.stringify(Array.from(union)))
      localStorage.setItem('superbet_achievements_count', union.size.toString())
      setTimeout(() => {
        window.dispatchEvent(new Event('achievements_updated'))
      }, 0)
    }
    
    return union
  }, [userTips, profil, avatarUrl, username, userId])

  const [newlyUnlockedCount, setNewlyUnlockedCount] = useState(0)
  const [newlyUnlockedSet, setNewlyUnlockedSet] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!user) return
    const seenStorageKey = `superbet_seen_achievements_${username}`
    const seenArr = JSON.parse(localStorage.getItem(seenStorageKey) || '[]')
    const seenSet = new Set<string>(seenArr)

    let newCount = 0
    const newSet = new Set<string>()
    unlockedSet.forEach((id: string) => {
      if (!seenSet.has(id)) {
        newCount++
        newSet.add(id)
      }
    })
    setNewlyUnlockedCount(newCount)
    setNewlyUnlockedSet(newSet)
  }, [unlockedSet, user, username])

  // Clear new achievements when tab is viewed
  useEffect(() => {
    if (activeTab === 'achievements' && newlyUnlockedCount > 0 && user) {
      const seenStorageKey = `superbet_seen_achievements_${username}`
      const seenArr = JSON.parse(localStorage.getItem(seenStorageKey) || '[]')
      const seenSet = new Set<string>(seenArr)
      unlockedSet.forEach((id: string) => seenSet.add(id))
      localStorage.setItem(seenStorageKey, JSON.stringify(Array.from(seenSet)))
      
      // Clear the red dots after 3 seconds of viewing
      setTimeout(() => {
        setNewlyUnlockedCount(0)
        setNewlyUnlockedSet(new Set())
      }, 3000)
    }
  }, [activeTab, newlyUnlockedCount, unlockedSet, user, username])

  const lade = useCallback(async () => {
    const { data } = await supabase.from('profiles')
      .select('username,avatar_url,gesamt_punkte,exakte_treffer,is_admin')
      .eq('id', user!.id).single()
    
    let dbPoints = 0

    if (data) {
      setUsername(data.username)
      setAvatarUrl(data.avatar_url || null)
      dbPoints = data.gesamt_punkte || 0
      const dbExacts = data.exakte_treffer || 0
      const dbIsAdmin = !!data.is_admin

      const { count } = await supabase.from('profiles')
        .select('*', { count: 'exact', head: true })
        .gt('gesamt_punkte', dbPoints)
      const calculatedRank = dbPoints > 0 ? (count || 0) + 1 : null
      
      const { count: leagueCount } = await supabase.from('league_members')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user!.id)

      setProfil({
        gesamt_punkte: dbPoints,
        exakte_treffer: dbExacts,
        is_admin: dbIsAdmin,
        rang: calculatedRank,
        league_count: leagueCount || 0
      })

      if (dbIsAdmin) {
        supabase.from('leagues').select('id, name').order('name', { ascending: true })
          .then(({ data: leaguesData }) => {
            if (leaguesData) setAllLeagues(leaguesData)
          })
          
        supabase.from('profiles').select('*', { count: 'exact', head: true })
          .then(({ count }) => {
            setTotalUsers(count || 0)
          })
      }
    }

    const { data: userTipsData } = await supabase.from('tips')
      .select(`
        id,
        tipp_heim,
        tipp_gast,
        punkte,
        created_at,
        updated_at,
        match:matches (
          id,
          spieltag,
          heim_team,
          gast_team,
          anpfiff,
          tore_heim,
          tore_gast,
          status
        )
      `)
      .eq('user_id', user!.id)
    const userTips = ((userTipsData || [])
      .filter((t) => t.match !== null) as unknown as TipDetails[]) || []
    setUserTips(userTips)

    let total = 0
    let exact = 0
    let diff = 0
    let tend = 0
    let miss = 0

    if (userTips && userTips.length > 0) {
      total = userTips.length
      userTips.forEach((t) => {
        if (t.punkte === 4) exact++
        else if (t.punkte === 3) diff++
        else if (t.punkte === 2 || t.punkte === 1) tend++
        else if (t.punkte <= 0) miss++
      })
    }

    const avg = total > 0 ? (dbPoints / total) : 0
    const rate = total > 0 ? Math.round(((exact + diff + tend) / total) * 100) : 0

    setStats({
      total,
      exact,
      diff,
      tend,
      miss,
      avg,
      rate
    })

    const { data: unplayedMatchesData } = await supabase
      .from('matches')
      .select('tournament')
      .neq('status', 'finished')
    
    let slUnplayed = 0;
    let clUnplayed = 0;
    
    if (unplayedMatchesData) {
      unplayedMatchesData.forEach(m => {
        if (m.tournament === 'Champions League') clUnplayed++;
        else slUnplayed++;
      })
    }
    
    setRemainingPoints({
      sl: slUnplayed * 4,
      cl: clUnplayed * 4,
      total: (slUnplayed + clUnplayed) * 4
    })

    const lastSeenStr = localStorage.getItem('superbet_last_seen_points')
    const lastSeen = lastSeenStr ? Number(lastSeenStr) : 0
    
    if (lastSeen < dbPoints) {
      setAnimatedPoints(lastSeen)
      setInitialLevelRef(calculateLevelDetails(lastSeen).level)
      setIsAnimating(true)
    } else {
      setAnimatedPoints(dbPoints)
      localStorage.setItem('superbet_last_seen_points', String(dbPoints))
    }

    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (authUser) {
      setNotifyAnpfiff(authUser.user_metadata?.notify_anpfiff !== false)
      setNotifyChat(!!authUser.user_metadata?.notify_chat)
    }

    const { data: bonusData } = await supabase.from('bonus_tipps')
      .select('*')
      .eq('user_id', user!.id)
    if (bonusData) {
      setBonusTipps(bonusData as BonusTipp[])
      const initialAntworten: Record<number, string> = {}
      bonusData.forEach(b => {
        initialAntworten[b.frage_id] = b.antwort
      })
      setAntworten(initialAntworten)
    }

    const { data: st2Matches } = await supabase.from('matches')
      .select('anpfiff')
      .eq('spieltag', 2)
      .limit(1)

    if (st2Matches && st2Matches.length > 0) {
      const st2Start = new Date(st2Matches[0].anpfiff)
      if (new Date() > st2Start) {
        setBonusGesperrt(true)
      }
    }

    setIsLaden(false)
  }, [user])

  useEffect(() => { if (!user) return; lade() }, [user, lade])

  useEffect(() => {
    if (localStorage.getItem('superbet_open_bonus') === 'true') {
      setActiveTab('bonus')
      localStorage.removeItem('superbet_open_bonus')
    }
  }, [])

  // Count-up animation for points & levels
  useEffect(() => {
    if (!isAnimating || !profil) return

    const start = animatedPoints
    const end = profil.gesamt_punkte
    if (start >= end) {
      setIsAnimating(false)
      localStorage.setItem('superbet_last_seen_points', String(end))
      return
    }

    const diff = end - start
    const duration = Math.min(2200, Math.max(900, diff * 60))
    const startTime = performance.now()

    let animationFrameId: number

    const tick = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const ease = progress * (2 - progress)
      const currentPoints = Math.floor(start + diff * ease)
      
      setAnimatedPoints(currentPoints)

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(tick)
      } else {
        setAnimatedPoints(end)
        setIsAnimating(false)
        localStorage.setItem('superbet_last_seen_points', String(end))
        
        const finalLvl = calculateLevelDetails(end).level
        if (finalLvl > initialLevelRef) {
          setShowLevelUpModal(true)
        }
      }
    }

    animationFrameId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(animationFrameId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAnimating, initialLevelRef])

  async function handleToggleAnpfiff() {
    const nextVal = !notifyAnpfiff
    setNotifyAnpfiff(nextVal)
    await supabase.auth.updateUser({
      data: { ...user?.user_metadata, notify_anpfiff: nextVal }
    })
    useToastStore.getState().toast(language === 'tr' ? 'Bildirim ayarları güncellendi' : language === 'en' ? 'Notification settings updated' : 'Benachrichtigungseinstellungen aktualisiert')
  }

  async function handleToggleChat() {
    const nextVal = !notifyChat
    setNotifyChat(nextVal)
    await supabase.auth.updateUser({
      data: { ...user?.user_metadata, notify_chat: nextVal }
    })
    useToastStore.getState().toast(language === 'tr' ? 'Bildirim ayarları güncellendi' : language === 'en' ? 'Notification settings updated' : 'Benachrichtigungseinstellungen aktualisiert')
  }

  async function handleUsernameUpdate() {
    if (!username.trim() || username.trim() === user?.user_metadata?.username) return
    try {
      const cleanUser = username.trim().toLowerCase()
      const { data } = await supabase.from('profiles').select('id').eq('username', cleanUser).limit(1)
      if (data && data.length > 0) {
        useToastStore.getState().toast(t('usernameTaken'), 'error')
        setUsername(user?.user_metadata?.username || '')
        return
      }

      await supabase.from('profiles').update({ username: cleanUser }).eq('id', user!.id)
      await supabase.auth.updateUser({ data: { ...user?.user_metadata, username: cleanUser } })
      useToastStore.getState().toast(t('usernameUpdated'))
    } catch {
      useToastStore.getState().toast(language === 'tr' ? 'Kullanıcı adı güncellenirken hata oluştu' : language === 'en' ? 'Error updating username' : 'Fehler beim Aktualisieren des Benutzernamens', 'error')
    }
  }

  async function handleBildUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !user) return

    if (!file.type.startsWith('image/')) {
      useToastStore.getState().toast(language === 'tr' ? 'Hata: Yalnızca resim dosyalarına (PNG, JPG, WEBP vb.) izin verilir!' : language === 'en' ? 'Error: Only image files (PNG, JPG, WEBP etc.) are allowed!' : 'Fehler: Nur Bilddateien (PNG, JPG, WEBP etc.) sind erlaubt!', 'error')
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      useToastStore.getState().toast(language === 'tr' ? 'Hata: Resim boyutu en fazla 2 MB olabilir!' : language === 'en' ? 'Error: The image must be maximum 2 MB in size!' : 'Fehler: Das Bild darf maximal 2 MB groß sein!', 'error')
      return
    }

    setUploading(true)
    try {
      const dataUrl = await komprimiereBild(file, 80)
      await supabase.from('profiles').update({ avatar_url: dataUrl }).eq('id', user.id)
      setAvatarUrl(dataUrl)
      useToastStore.getState().toast(t('avatarUpdated'))
    } catch (err) {
      console.error('Upload failed:', err)
      useToastStore.getState().toast(language === 'tr' ? 'Resim yüklenirken hata oluştu' : language === 'en' ? 'Error uploading image' : 'Fehler beim Hochladen des Bildes', 'error')
    } finally { setUploading(false) }
  }

  async function invokeAdminCreateUser(usr: string, pw: string, leagueId: string | null) {
    const { data, error } = await supabase.rpc('admin_create_user', {
      new_username: usr,
      new_password: pw,
      target_league_id: leagueId || null
    })

    if (error) {
      const isSigError = error.message.includes('function') || 
                         error.message.includes('parameter') || 
                         error.message.includes('does not exist') ||
                         error.message.includes('signature')

      if (isSigError) {
        const { data: fallbackData, error: fallbackError } = await supabase.rpc('admin_create_user', {
          new_username: usr,
          new_password: pw
        })
        if (fallbackError) throw fallbackError
        return fallbackData
      }
      throw error
    }
    return data
  }

  async function handleCreateUser() {
    if (!newUsername.trim() || !newPassword.trim()) return
    setCreatingUser(true)
    setAdminMsg(null)
    setCreatedUsersList([])
    try {
      await invokeAdminCreateUser(newUsername.trim(), newPassword, selectedLeagueId)
      setAdminMsg({ type: 'success', text: `Benutzer "${newUsername.trim()}" erstellt!` })
      useToastStore.getState().toast(`Benutzer "${newUsername.trim()}" erstellt`)
      setCreatedUsersList([{ username: newUsername.trim(), password: newPassword }])
      setNewUsername('')
      setNewPassword('')
    } catch (err) {
      const errorObj = err as Error
      setAdminMsg({ type: 'error', text: errorObj?.message || 'Fehler beim Erstellen' })
    } finally {
      setCreatingUser(false)
    }
  }

  function generateRandomCreds() {
    const randomNum = Math.floor(1000 + Math.random() * 9000)
    const randStr = Math.random().toString(36).substring(2, 7)
    return {
      username: `tipper_${randomNum}`,
      password: `Bet_${randStr}`
    }
  }

  async function handleQuickCreate() {
    setCreatingUser(true)
    setAdminMsg(null)
    setCreatedUsersList([])
    const creds = generateRandomCreds()
    try {
      await invokeAdminCreateUser(creds.username, creds.password, selectedLeagueId)
      setAdminMsg({ type: 'success', text: `Benutzer "${creds.username}" erstellt!` })
      useToastStore.getState().toast(`Benutzer "${creds.username}" erstellt`)
      setCreatedUsersList([creds])
    } catch (err) {
      const errorObj = err as Error
      setAdminMsg({ type: 'error', text: errorObj?.message || 'Fehler beim Erstellen' })
    } finally {
      setCreatingUser(false)
    }
  }

  async function handleBatchCreate() {
    if (batchCount < 1 || batchCount > 20) {
      useToastStore.getState().toast('Bitte wähle eine Anzahl zwischen 1 und 20', 'error')
      return
    }
    setCreatingUser(true)
    setAdminMsg(null)
    setCreatedUsersList([])
    
    const results: { username: string; password: string }[] = []
    let successCount = 0
    let lastError: Error | null = null

    for (let i = 0; i < batchCount; i++) {
      const creds = generateRandomCreds()
      try {
        await invokeAdminCreateUser(creds.username, creds.password, selectedLeagueId)
        results.push(creds)
        successCount++
      } catch (err) {
        lastError = err as Error
      }
    }

    setCreatedUsersList(results)
    if (successCount > 0) {
      setAdminMsg({ type: 'success', text: `${successCount} Benutzer erfolgreich erstellt!` })
      useToastStore.getState().toast(`${successCount} Benutzer erstellt`)
    }
    if (lastError && successCount < batchCount) {
      setAdminMsg({ type: 'error', text: lastError?.message || `Einige Benutzer konnten nicht erstellt werden (${successCount}/${batchCount} erfolgreich)` })
    }
    setCreatingUser(false)
  }

  async function handleAdminResetPassword(targetUser: string, newPass: string) {
    if (!targetUser.trim() || !newPass.trim()) return
    setCreatingUser(true)
    try {
      const { data, error } = await supabase.rpc('admin_reset_password', {
        target_username: targetUser.trim(),
        new_password: newPass.trim()
      })
      if (error) throw error
      useToastStore.getState().toast(data?.message || 'Passwort zurückgesetzt')
      setAdminMsg({ type: 'success', text: data?.message || 'Passwort zurückgesetzt' })
    } catch (err) {
      const errorObj = err as Error
      useToastStore.getState().toast(errorObj?.message || 'Fehler beim Passwort-Reset', 'error')
      setAdminMsg({ type: 'error', text: errorObj?.message || 'Fehler beim Reset' })
    } finally {
      setCreatingUser(false)
    }
  }

  async function handleAdminDeleteUser(targetUser: string) {
    if (!targetUser.trim()) return
    if (!window.confirm(`Möchtest du den User "${targetUser}" WIRKLICH löschen?`)) return
    setCreatingUser(true)
    try {
      const { data, error } = await supabase.rpc('admin_delete_user', {
        target_username: targetUser.trim()
      })
      if (error) throw error
      useToastStore.getState().toast(data?.message || 'Benutzer gelöscht')
      setAdminMsg({ type: 'success', text: data?.message || 'Benutzer gelöscht' })
    } catch (err) {
      const errorObj = err as Error
      useToastStore.getState().toast(errorObj?.message || 'Fehler beim Löschen', 'error')
      setAdminMsg({ type: 'error', text: errorObj?.message || 'Fehler beim Löschen' })
    } finally {
      setCreatingUser(false)
    }
  }

  async function handleAdminDeleteLeague(leagueId: string, leagueName: string) {
    if (!leagueId) return
    if (!window.confirm(`Möchtest du die Liga "${leagueName}" WIRKLICH löschen? Alle zugehörigen Verknüpfungen gehen verloren.`)) return
    setCreatingUser(true)
    try {
      const { data, error } = await supabase.rpc('admin_delete_league', {
        target_league_id: leagueId
      })
      if (error) throw error
      useToastStore.getState().toast(data?.message || 'Liga gelöscht')
      setAdminMsg({ type: 'success', text: data?.message || 'Liga gelöscht' })
      setAllLeagues(prev => prev.filter(l => l.id !== leagueId))
      if (selectedLeagueId === leagueId) setSelectedLeagueId('')
    } catch (err) {
      const errorObj = err as Error
      useToastStore.getState().toast(errorObj?.message || 'Fehler beim Löschen', 'error')
      setAdminMsg({ type: 'error', text: errorObj?.message || 'Fehler beim Löschen' })
    } finally {
      setCreatingUser(false)
    }
  }

  function handleCopyUserCreds(username: string, pass: string, index: number) {
    const text = `Username: ${username}\nPasswort: ${pass}\nLink: ${window.location.origin}`
    navigator.clipboard.writeText(text)
    setCopiedIndex(index)
    useToastStore.getState().toast('Zugangsdaten kopiert!')
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  function handleStartOnboarding() {
    if (user) {
      localStorage.removeItem(`superbet_onboarding_completed_${user.id}`)
    }
    window.dispatchEvent(new CustomEvent('trigger-onboarding'))
  }

  async function handleSpeichernBonus() {
    if (!user) return
    // Re-Check Deadline vor jedem Speicher-Versuch
    const { data: st3Check } = await supabase.from('matches')
      .select('anpfiff')
      .eq('spieltag', 3)
      .lte('anpfiff', new Date().toISOString())
      .limit(1)
    if (st3Check && st3Check.length > 0) {
      useToastStore.getState().toast('Bonus-Tipps sind nach dem 2. Spieltag gesperrt.', 'error')
      setBonusGesperrt(true)
      return
    }
    try {
      for (const [frageId, antwort] of Object.entries(antworten)) {
        const existing = bonusTipps.find(t => t.frage_id === Number(frageId))
        if (existing) {
          if (existing.antwort !== antwort) {
            await supabase.from('bonus_tipps')
              .update({ antwort })
              .match({ user_id: user.id, frage_id: Number(frageId) })
          }
        } else {
          await supabase.from('bonus_tipps').insert({
            user_id: user.id,
            frage_id: Number(frageId),
            antwort
          })
        }
      }
      setGespeichert(true)
      useToastStore.getState().toast('Bonus-Tipps erfolgreich abgegeben!')
      
      const { data: bonusData } = await supabase.from('bonus_tipps')
        .select('*')
        .eq('user_id', user.id)
      if (bonusData) setBonusTipps(bonusData as BonusTipp[])
    } catch {
      useToastStore.getState().toast('Fehler beim Speichern der Bonus-Tipps', 'error')
    }
  }

  const navigate = useNavigate()

  if (isLaden) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary-container border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-full px-3 md:px-6 lg:px-8 pt-4 md:pt-6 pb-24 md:pb-8 max-w-[1200px] mx-auto w-full animate-page-enter">
      
      {/* Profile Header (Always visible) */}
      <div className="mb-6">
        <UserInfoSettings
          username={username}
          setUsername={setUsername}
          avatarUrl={avatarUrl}
          uploading={uploading}
          fileRef={fileRef}
          handleBildUpload={handleBildUpload}
          handleUsernameUpdate={handleUsernameUpdate}
          isAdmin={!!profil?.is_admin}
          userRank={profil?.rang || null}
        />
      </div>

      {/* Tabs Navigation */}
      <div className="flex overflow-x-auto no-scrollbar gap-2 mb-6 border-b border-surface-container-high/60 pb-2">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex-shrink-0 px-4 py-2 rounded-full border text-[11px] font-mono font-medium transition-all ${
            activeTab === 'overview'
              ? 'bg-primary-container text-on-primary border-primary-container shadow-[0_0_15px_rgba(251,191,36,0.3)] font-bold'
              : 'border-white/10 text-on-surface hover:bg-white/5'
          }`}
        >
          📊 {t('profileOverview')}
        </button>
        <button
          onClick={() => setActiveTab('achievements')}
          className={`flex-shrink-0 relative px-4 py-2 rounded-full border text-[11px] font-mono font-medium transition-all ${
            activeTab === 'achievements'
              ? 'bg-primary-container text-on-primary border-primary-container shadow-[0_0_15px_rgba(251,191,36,0.3)] font-bold'
              : 'border-white/10 text-on-surface hover:bg-white/5'
          }`}
        >
          🏆 {t('myAchievements')}
          {newlyUnlockedCount > 0 && (
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-[#1E1E1E] animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('bonus')}
          className={`flex-shrink-0 px-4 py-2 rounded-full border text-[11px] font-mono font-medium transition-all ${
            activeTab === 'bonus'
              ? 'bg-primary-container text-on-primary border-primary-container shadow-[0_0_15px_rgba(251,191,36,0.3)] font-bold'
              : 'border-white/10 text-on-surface hover:bg-white/5'
          }`}
        >
          ⭐ {t('bonusTipsTab')}
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`flex-shrink-0 px-4 py-2 rounded-full border text-[11px] font-mono font-medium transition-all ${
            activeTab === 'settings'
              ? 'bg-primary-container text-on-primary border-primary-container shadow-[0_0_15px_rgba(251,191,36,0.3)] font-bold'
              : 'border-white/10 text-on-surface hover:bg-white/5'
          }`}
        >
          ⚙️ {t('profileSettings')}
        </button>
        {profil?.is_admin && (
          <button
            onClick={() => setActiveTab('admin')}
            className={`flex-shrink-0 px-4 py-2 rounded-full border text-[11px] font-mono font-medium transition-all ${
              activeTab === 'admin'
                ? 'bg-red-500/20 text-red-400 border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.2)] font-bold'
                : 'border-white/10 text-red-400/70 hover:bg-white/5'
            }`}
          >
            🛡️ {t('admin')}
          </button>
        )}
      </div>

      {/* Tab Content Areas */}
      <div className="space-y-6">
        
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-fade-in">
            <LevelProgressCard
              animatedPoints={animatedPoints}
              showLevelUpModal={showLevelUpModal}
              setShowLevelUpModal={setShowLevelUpModal}
            />
            <StatsGrid stats={stats} remainingPoints={remainingPoints} gesamtPunkte={profil?.gesamt_punkte || 0} />
          </div>
        )}

        {/* ACHIEVEMENTS TAB */}
        {activeTab === 'achievements' && (
          <div className="animate-fade-in space-y-6">
            <AchievementsSection 
              unlockedSet={unlockedSet}
              newlyUnlocked={newlyUnlockedSet}
            />
          </div>
        )}

        {/* BONUS TAB */}
        {activeTab === 'bonus' && (
          <div className="animate-fade-in">
            <BonusTippsCard
              bonusGesperrt={bonusGesperrt}
              bonusTipps={bonusTipps}
              antworten={antworten}
              setAntworten={setAntworten}
              handleSpeichernBonus={handleSpeichernBonus}
              gespeichert={gespeichert}
            />
          </div>
        )}

        {/* SETTINGS TAB */}
        {activeTab === 'settings' && (
          <div className="space-y-6 animate-fade-in max-w-2xl mx-auto">
            <NotificationSettings
              notifyAnpfiff={notifyAnpfiff}
              handleToggleAnpfiff={handleToggleAnpfiff}
              notifyChat={notifyChat}
              handleToggleChat={handleToggleChat}
            />

            {/* Language Selector Dropdown */}
            <div className="bg-surface-container-low border border-surface-container-high rounded-xl p-4 shadow-sm text-left">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-primary mb-3">
                {t('languageSelect')}
              </h3>
              <div className="relative">
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as 'de' | 'en' | 'tr')}
                  className="w-full bg-black/30 border border-outline-variant rounded-md px-3 py-2.5 text-on-surface
                             font-mono text-xs focus:border-primary-container focus:outline-none focus:shadow-[0_0_10px_rgba(251,191,36,0.2)]
                             transition-all duration-200 cursor-pointer"
                >
                  <option value="de" className="bg-surface-container text-on-surface">Deutsch (Standard)</option>
                  <option value="en" className="bg-surface-container text-on-surface">English</option>
                  <option value="tr" className="bg-surface-container text-on-surface">Türkçe</option>
                </select>
              </div>
            </div>

            <div className="bg-surface-container-low border border-surface-container-high rounded-xl overflow-hidden shadow-sm text-left">
              <button onClick={() => navigate('/rules')} className="w-full flex items-center gap-3 px-4 py-4 text-on-surface text-sm hover:bg-surface-container transition-colors font-medium border-b border-surface-container-high/60">
                <BookOpen size={18} className="text-primary" />
                <div className="flex-1 text-left">
                  <div className="font-bold">{t('rulesTitle')}</div>
                  <div className="text-[10px] text-on-surface-variant font-mono mt-0.5">
                    {language === 'tr' ? 'Puanların nasıl hesaplandığını inceleyin' : language === 'en' ? 'Read how points are calculated' : 'Lies nach, wie die Punkte berechnet werden'}
                  </div>
                </div>
              </button>
              <button onClick={handleStartOnboarding} className="w-full flex items-center gap-3 px-4 py-4 text-on-surface text-sm hover:bg-surface-container transition-colors font-medium">
                <Sparkles size={18} className="text-primary" />
                <div className="flex-1 text-left">
                  <div className="font-bold">
                    {language === 'tr' ? 'Tanıtımı ve yardımı başlat' : language === 'en' ? 'Start onboarding & help' : 'Onboarding & Hilfe starten'}
                  </div>
                  <div className="text-[10px] text-on-surface-variant font-mono mt-0.5">
                    {language === 'tr' ? 'Giriş turunu tekrar gösterir' : language === 'en' ? 'Shows the introductory tour again' : 'Zeigt die Einleitungs-Tour erneut an'}
                  </div>
                </div>
              </button>

              {isInstallable && (
                <button
                  onClick={async () => {
                    const success = await triggerInstall()
                    if (success) {
                      window.dispatchEvent(new CustomEvent('show-toast', { 
                        detail: { message: language === 'tr' ? '🎉 Uygulama başarıyla yüklendi!' : language === 'en' ? '🎉 App installed successfully!' : '🎉 App wurde erfolgreich installiert!', type: 'success' } 
                      }))
                    }
                  }}
                  className="w-full flex items-center gap-3 px-4 py-4 text-on-surface text-sm hover:bg-surface-container transition-colors font-medium border-t border-white/5 bg-primary/5 hover:bg-primary/10 group animate-pulse-slow cursor-pointer"
                >
                  <Download size={18} className="text-primary-fixed-dim group-hover:scale-110 transition-transform shrink-0" />
                  <div className="flex-1 text-left">
                    <div className="font-bold text-primary-fixed-dim">{t('pwaInstall')}</div>
                    <div className="text-[10px] text-primary-fixed-dim/75 font-mono mt-0.5">{t('pwaInstallDesc')}</div>
                  </div>
                </button>
              )}

              {isIosNotStandalone && (
                <div className="w-full flex items-center gap-3 px-4 py-4 text-on-surface text-sm border-t border-white/5 bg-primary/5">
                  <Download size={18} className="text-primary-fixed-dim shrink-0" />
                  <div className="flex-1 text-left">
                    <div className="font-bold text-primary-fixed-dim">{t('iosInstallGuide')}</div>
                    <div className="text-[10px] text-on-surface-variant/80 font-mono mt-0.5" dangerouslySetInnerHTML={{ __html: t('iosInstallDesc') }} />
                  </div>
                </div>
              )}
            </div>

            <div className="bg-surface-container-low border border-surface-container-high rounded-xl p-4 shadow-sm text-left mt-8">
              <button
                onClick={logout}
                className="w-full bg-red-500/10 hover:bg-red-500/15 border border-red-500/20 text-red-400 py-3.5 rounded-lg font-mono text-xs font-bold uppercase tracking-wider transition-all active:scale-[0.98] cursor-pointer text-center"
              >
                {t('logout')}
              </button>
            </div>
          </div>
        )}

        {/* ADMIN TAB */}
        {activeTab === 'admin' && profil?.is_admin && (
          <div className="animate-fade-in">
            <AdminSection
              allLeagues={allLeagues}
              selectedLeagueId={selectedLeagueId}
              setSelectedLeagueId={setSelectedLeagueId}
              newUsername={newUsername}
              setNewUsername={setNewUsername}
              newPassword={newPassword}
              setNewPassword={setNewPassword}
              creatingUser={creatingUser}
              adminMsg={adminMsg}
              setAdminMsg={setAdminMsg}
              createdUsersList={createdUsersList}
              adminTab={adminTab}
              setAdminTab={setAdminTab}
              adminCreateSubTab={adminCreateSubTab}
              setAdminCreateSubTab={setAdminCreateSubTab}
              copiedIndex={copiedIndex}
              handleCreateUser={handleCreateUser}
              handleQuickCreate={handleQuickCreate}
              handleBatchCreate={handleBatchCreate}
              handleAdminResetPassword={handleAdminResetPassword}
              handleAdminDeleteUser={handleAdminDeleteUser}
              handleAdminDeleteLeague={handleAdminDeleteLeague}
              handleCopyUserCreds={handleCopyUserCreds}
              batchCount={batchCount}
              setBatchCount={setBatchCount}
              totalUsers={totalUsers}
              onlineUsers={onlineUsers}
            />
          </div>
        )}

      </div>
    </div>
  )
}

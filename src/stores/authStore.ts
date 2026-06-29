import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import type { User, Session } from '@supabase/supabase-js'

interface AuthState {
  user: User | null
  session: Session | null
  isLaden: boolean
  isEingeloggt: boolean
  mussPasswortAendern: boolean
  isAdmin: boolean
  avatarUrl: string | null
  fehler: string | null
  login: (username: string, passwort: string) => Promise<void>
  passwortAendern: (neuesPasswort: string) => Promise<void>
  logout: () => Promise<void>
  ladeUser: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  isLaden: true,
  isEingeloggt: false,
  mussPasswortAendern: false,
  isAdmin: false,
  avatarUrl: null,
  fehler: null,

  login: async (username: string, passwort: string) => {
    set({ isLaden: true, fehler: null })
    const email = `${username}@gmail.com`

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Login-Verbindung abgebrochen (Timeout)')), 4000)
    )

    try {
      await Promise.race([
        (async () => {
          let email = `${username}@tipp.local`
          let authResult = await supabase.auth.signInWithPassword({ email, password: passwort })
          
          // Fallback für alte Accounts (@gmail.com), falls @tipp.local nicht existiert oder fehlschlägt
          if (authResult.error && authResult.error.message === 'Invalid login credentials') {
            email = `${username}@gmail.com`
            const fallbackResult = await supabase.auth.signInWithPassword({ email, password: passwort })
            if (!fallbackResult.error) {
              authResult = fallbackResult
            }
          }

          if (authResult.error) {
            const msg = authResult.error.message === 'Invalid login credentials'
              ? 'INVALID_CREDENTIALS'
              : authResult.error.message
            set({ fehler: msg, isLaden: false })
            throw authResult.error
          }

          // Profil-Status prüfen
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('muss_passwort_aendern, is_admin, username, avatar_url')
              .eq('id', user.id)
              .single()

            set({
              mussPasswortAendern: profile?.muss_passwort_aendern ?? false,
              isAdmin: profile?.is_admin ?? false,
              avatarUrl: profile?.avatar_url ?? null,
              isLaden: false,
            })
          } else {
            set({ isLaden: false })
          }
        })(),
        timeoutPromise
      ])
    } catch (err) {
      console.error('Fehler bei login:', err)
      const errorObj = err as Error
      const msg = errorObj.message?.includes('Timeout')
        ? 'Verbindung zum Server fehlgeschlagen (Timeout). Bitte prüfe deinen Adblocker oder dein VPN.'
        : (errorObj.message || 'Login fehlgeschlagen. Bitte versuche es erneut.')
      set({ fehler: msg, isLaden: false })
      throw err
    }
  },

  passwortAendern: async (neuesPasswort: string) => {
    set({ fehler: null })
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('Kein angemeldeter Benutzer gefunden.')
    }

    // 1. Update the profiles table FIRST to prevent race condition on auth update trigger
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ muss_passwort_aendern: false })
      .eq('id', user.id)

    if (profileError) {
      set({ fehler: profileError.message })
      throw profileError
    }

    // 2. Perform password update
    const { error: authError } = await supabase.auth.updateUser({ password: neuesPasswort })
    if (authError) {
      // Revert profile state if auth update failed
      await supabase
        .from('profiles')
        .update({ muss_passwort_aendern: true })
        .eq('id', user.id)
      set({ fehler: authError.message })
      throw authError
    }

    set({ mussPasswortAendern: false })
  },

  logout: async () => {
    await supabase.auth.signOut()
    localStorage.removeItem('match-store-cache')
    localStorage.removeItem('tip-store-cache')
    set({ user: null, session: null, isEingeloggt: false, mussPasswortAendern: false, isAdmin: false })
  },

  ladeUser: async () => {
    set({ isLaden: true, fehler: null })
    
    // Fallback-Timeout nach 3.5 Sekunden, um Hängenbleiben zu verhindern
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Supabase-Verbindung abgebrochen (Timeout)')), 3500)
    )

    try {
      await Promise.race([
        (async () => {
          const { data: { session } } = await supabase.auth.getSession()
          const { data: { user } } = await supabase.auth.getUser()

          const eingeloggt = !!user

          if (user) {
            const { data: profile, error: profileError } = await supabase
              .from('profiles')
              .select('muss_passwort_aendern, is_admin, username, avatar_url')
              .eq('id', user.id)
              .single()

            if (profileError) {
              console.error('Fehler beim Laden des Benutzerprofils:', profileError)
            }

            set({
              user,
              session,
              isEingeloggt: eingeloggt,
              mussPasswortAendern: profile?.muss_passwort_aendern ?? false,
              isAdmin: profile?.is_admin ?? false,
              avatarUrl: profile?.avatar_url ?? null,
              isLaden: false,
            })
          } else {
            set({ user: null, session: null, isEingeloggt: false, isLaden: false })
          }
        })(),
        timeoutPromise
      ])
    } catch (err) {
      console.error('Fehler in ladeUser:', err)
      set({ user: null, session: null, isEingeloggt: false, isLaden: false, fehler: 'Fehler beim Laden der Sitzung' })
    }
  },
}))

// One-time auth state listener — registered once at module load, never duplicated.
supabase.auth.onAuthStateChange((_event, session) => {
  if (session?.user) {
    useAuthStore.setState({
      user: session.user,
      session,
      isEingeloggt: true,
    })
    // Ensure profile attributes (isAdmin, etc) are fetched
    useAuthStore.getState().ladeUser()
  } else {
    useAuthStore.setState({ user: null, session: null, isEingeloggt: false, mussPasswortAendern: false, isAdmin: false })
  }
})

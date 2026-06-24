import { create } from 'zustand'

export type Language = 'de' | 'en' | 'tr'

interface LanguageState {
  language: Language
  setLanguage: (lang: Language) => void
}

export const useLanguageStore = create<LanguageState>((set) => ({
  language: (localStorage.getItem('superbet_language') as Language) || 'de',
  setLanguage: (lang: Language) => {
    localStorage.setItem('superbet_language', lang)
    set({ language: lang })
  }
}))

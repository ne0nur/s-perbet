import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type AppTheme = 'default' | 'blue' | 'red' | 'pink' | 'teal'

interface ThemeState {
  theme: AppTheme
  setTheme: (theme: AppTheme) => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'default',
      setTheme: (theme) => {
        set({ theme })
        if (theme === 'default') {
          document.documentElement.removeAttribute('data-theme')
        } else {
          document.documentElement.setAttribute('data-theme', theme)
        }
      },
    }),
    {
      name: 'superbet-theme-storage',
      onRehydrateStorage: () => (state) => {
        if (state) {
          if (state.theme === 'default') {
            document.documentElement.removeAttribute('data-theme')
          } else {
            document.documentElement.setAttribute('data-theme', state.theme)
          }
        }
      },
    }
  )
)

import { create } from 'zustand'

interface PwaState {
  deferredPrompt: any | null
  isInstallable: boolean
  setDeferredPrompt: (prompt: any | null) => void
  setIsInstallable: (installable: boolean) => void
  triggerInstall: () => Promise<boolean>
}

export const usePwaStore = create<PwaState>((set, get) => ({
  deferredPrompt: null,
  isInstallable: false,
  setDeferredPrompt: (prompt) => set({ deferredPrompt: prompt, isInstallable: !!prompt }),
  setIsInstallable: (installable) => set({ isInstallable: installable }),
  triggerInstall: async () => {
    const prompt = get().deferredPrompt
    if (!prompt) return false
    
    // Show the install prompt
    prompt.prompt()
    
    // Wait for the user to respond to the prompt
    const { outcome } = await prompt.userChoice
    console.log(`PWA install prompt outcome: ${outcome}`)
    
    // We've used the prompt, and can't use it again
    set({ deferredPrompt: null, isInstallable: false })
    return outcome === 'accepted'
  }
}))

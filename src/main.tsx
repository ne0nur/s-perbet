import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Synchronous theme initialization to prevent flash of default theme
try {
  const persisted = localStorage.getItem('superbet-theme-storage')
  if (persisted) {
    const { state } = JSON.parse(persisted)
    if (state && state.theme && state.theme !== 'default') {
      document.documentElement.setAttribute('data-theme', state.theme)
    }
  }
} catch (e) {
  console.error('Theme initialization error:', e)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

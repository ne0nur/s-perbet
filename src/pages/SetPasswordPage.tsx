import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { Lock, Eye, EyeOff, Check } from 'lucide-react'
import { useTranslation } from '../utils/translations'

export function SetPasswordPage() {
  const [passwort, setPasswort] = useState('')
  const [bestaetigung, setBestaetigung] = useState('')
  const [zeigePasswort, setZeigePasswort] = useState(false)
  const [erfolg, setErfolg] = useState(false)
  const { passwortAendern, fehler } = useAuthStore()
  const { t } = useTranslation()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (passwort.length < 6 || passwort !== bestaetigung) return
    try {
      await passwortAendern(passwort)
      setErfolg(true)
      setTimeout(() => navigate('/dashboard'), 1500)
    } catch (err) {
      console.error('Fehler beim Passwortändern:', err)
    }
  }

  if (erfolg) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="glass-panel rounded-xl p-8 max-w-sm w-full text-center">
          <div className="w-16 h-16 rounded-full bg-primary-container/10 flex items-center justify-center mx-auto mb-4">
            <Check size={32} className="text-emerald-400" />
          </div>
          <h2 className="text-xl font-bold text-on-surface mb-2">{t('passwordChanged')}</h2>
          <p className="text-on-surface-variant text-sm">{t('redirecting')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="mb-6 text-center">
        <Lock size={28} className="text-primary-fixed-dim mx-auto mb-3" />
        <h1 className="text-xl font-bold text-on-surface">{t('newPassword')}</h1>
        <p className="text-on-surface-variant text-sm mt-1">{t('minCharacters')}</p>
      </div>

      <form onSubmit={handleSubmit} className="glass-panel rounded-xl p-6 max-w-sm w-full space-y-4">
        <div>
          <label className="block text-[11px] font-mono text-on-surface-variant mb-1.5 uppercase tracking-wider">
            {t('newPassword')}
          </label>
          <div className="relative">
            <input
              type={zeigePasswort ? 'text' : 'password'}
              value={passwort} onChange={(e) => setPasswort(e.target.value)}
              className="w-full bg-black/30 border border-outline-variant rounded-md px-4 py-2.5 text-on-surface
                         font-mono text-sm focus:border-primary-container focus:outline-none focus:shadow-[0_0_10px_rgba(251,191,36,0.2)]"
              placeholder="••••••" required minLength={6} autoFocus
            />
            <button type="button" onClick={() => setZeigePasswort(!zeigePasswort)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
              {zeigePasswort ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
        <div>
          <label className="block text-[11px] font-mono text-on-surface-variant mb-1.5 uppercase tracking-wider">
            {t('confirmPasswordLabel')}
          </label>
          <input type="password" value={bestaetigung} onChange={(e) => setBestaetigung(e.target.value)}
            className={`w-full bg-black/30 border rounded-md px-4 py-2.5 text-on-surface font-mono text-sm
              focus:outline-none ${bestaetigung && passwort !== bestaetigung ? 'border-error' : 'border-outline-variant'}`}
            placeholder="••••••" required />
          {bestaetigung && passwort !== bestaetigung && (
            <p className="text-error text-[11px] mt-1">{t('passwordsMismatch')}</p>
          )}
        </div>
        {fehler && <p className="text-error text-[11px] font-mono bg-error-container/20 rounded-md px-3 py-2">{fehler}</p>}
        <button type="submit" disabled={passwort.length < 6 || passwort !== bestaetigung}
          className="w-full bg-primary-container text-on-primary font-bold text-sm py-3 rounded-md
                     shadow-[0_0_15px_rgba(251,191,36,0.15)] active:scale-95 transition-transform
                     disabled:opacity-50 disabled:cursor-not-allowed">
          {t('savePassword')}
        </button>
      </form>
    </div>
  )
}

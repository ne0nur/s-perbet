# Profil-Einstellungen: Account-Info + Passwort ändern

> **Goal:** Login-Hinweis aus UserInfoSettings in kompakte Settings-Card verschieben, Login-Namen anzeigen, Passwort-ändern-Funktion hinzufügen.

**Architecture:** 
- UserInfoSettings: Login-Hinweis entfernen
- ProfilePage Settings: Neue „Account"-Sektion mit Login-Name + kompaktem Hinweis + Passwort-Button
- Supabase `resetPasswordForEmail` für Passwort-Reset

**Files:**
- Modify: `src/components/profile/UserInfoSettings.tsx` — Hinweis-Block entfernen
- Modify: `src/pages/ProfilePage.tsx` — Account-Card + Passwort-Logik einbauen
- Modify: `src/utils/translations.ts` — Neue Keys (DE/EN/TR)

---

## Task 1: Login-Hinweis aus UserInfoSettings entfernen

**Files:** `src/components/profile/UserInfoSettings.tsx`

Entferne den `{/* Login vs Nickname clarification */}` Block (lines ~148-155).

---

## Task 2: Translations für Account-Section

**Files:** `src/utils/translations.ts`

Neue Keys in allen 3 Sprachen:
- `accountSection`: "Account" / "Account" / "Hesap"
- `loginNameLabel`: "Anmeldename" / "Login Name" / "Giriş Adı"  
- `loginNameHint`: "Dein Anmeldename ist dauerhaft. Der Benutzername oben ist dein öffentlicher Anzeigename."
- `changePassword`: "Passwort ändern" / "Change Password" / "Şifre Değiştir"
- `changePasswordDesc`: "Du erhältst eine E-Mail zum Zurücksetzen deines Passworts."
- `passwordResetSent`: "E-Mail gesendet — prüfe dein Postfach" (Toast)

---

## Task 3: Account-Card + Passwort-Reset in ProfilePage

**Files:** `src/pages/ProfilePage.tsx`

1. **State** hinzufügen: `const [resettingPw, setResettingPw] = useState(false)`

2. **Handler** hinzufügen:
```tsx
const handlePasswordReset = async () => {
  if (!user?.email) return
  setResettingPw(true)
  const { error } = await supabase.auth.resetPasswordForEmail(user.email)
  if (!error) {
    useToastStore.getState().toast(t('passwordResetSent'), 'success')
  } else {
    useToastStore.getState().toast(error.message, 'error')
  }
  setResettingPw(false)
}
```

3. **Account-Card** in den Settings-Bereich einfügen (zwischen Update-Button und Regeln-Button):
```tsx
<div className="bg-surface-container-low/50 border border-white/[0.04] rounded-xl p-4 mt-2">
  <h3 className="text-[10px] font-mono font-bold text-on-surface-variant/60 uppercase tracking-wider mb-3">
    {t('accountSection')}
  </h3>
  
  {/* Login Name */}
  <div className="flex items-center justify-between mb-2">
    <span className="text-[10px] text-on-surface-variant/50 font-mono">{t('loginNameLabel')}</span>
    <span className="text-xs font-mono font-bold text-on-surface">{user?.email || '—'}</span>
  </div>
  
  {/* Hinweis */}
  <p className="text-[9px] text-on-surface-variant/40 font-mono leading-relaxed mb-3">
    {t('loginNameHint')}
  </p>
  
  {/* Passwort ändern */}
  <button
    onClick={handlePasswordReset}
    disabled={resettingPw}
    className="w-full flex items-center gap-3 px-3 py-2.5 bg-surface-container border border-surface-container-high rounded-lg text-on-surface text-xs hover:bg-surface-container-high transition-colors font-medium disabled:opacity-50"
  >
    <Lock size={14} className="text-on-surface-variant" />
    <div className="flex-1 text-left">
      <div className="font-bold text-xs">{t('changePassword')}</div>
      <div className="text-[9px] text-on-surface-variant/50 font-mono">{t('changePasswordDesc')}</div>
    </div>
    {resettingPw && <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />}
  </button>
</div>
```

---

## Task 4: Build + Commit + Push

```bash
npm run build
git add -A
git commit -m "feat: move account info to settings card, add password reset"
git push origin main
```

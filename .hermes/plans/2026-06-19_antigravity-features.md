# Antigravity Features — Implementation Plan

> **For Hermes:** Execute tasks sequentially. Each task is self-contained.

**Goal:** Fix/complete 5 features that were planned or partially implemented: PWA install UX, Share button, League invite sharing, GlobalPage badge overlap fix, Admin push notifications.

**Architecture:** Most fixes are frontend-only (React/TSX/CSS). Admin push notifications require a new Supabase table + admin UI component. No backend Edge Functions needed — use in-app toast delivery.

**Tech Stack:** React 19, Vite, Tailwind CSS, Supabase, Zustand

---

## Investigation Summary

| # | Feature | Status | Issue |
|---|---------|--------|-------|
| 1 | PWA Install button + help | ✅ Done | Already in AppShell sidebar + ProfilePage settings + iOS guide |
| 2 | Share button | ✅ Done | In AppShell desktop sidebar, Web Share API + clipboard |
| 3 | League invite share link | ⚠️ Partial | Only copy-to-clipboard, no share button |
| 4 | GlobalPage badge overlap | ❌ Bug | `absolute -bottom-1 -right-1` LevelBadge overlaps username text |
| 5 | Admin push notifications | ❌ Missing | No infrastructure exists |

---

### Task 1: League invite — add Share button next to Copy

**Objective:** Add a share button alongside the existing copy button in the league invite section.

**Files:**
- Modify: `src/pages/LeaguePage.tsx` (around line 710–718)

**Step 1: Add share handler and button**

In `LeaguePage.tsx`, in the invite-code section, add a share button next to the copy button. The share button uses the Web Share API to share a join link (`https://ne0nur.github.io/s-perbet?join=<code>`).

Replace the existing invite-code block (lines 710–718) with:

```tsx
{/* Einladungs-Code */}
<div className="bg-surface-container-low border border-surface-container-high rounded-xl px-4 py-3 flex items-center gap-2 shrink-0">
  <span className="text-[10px] text-on-surface-variant/60 shrink-0">{t('shareThisCode')}</span>
  <span className="text-[11px] font-mono font-bold text-primary-fixed-dim tracking-wider truncate">{aktiveLiga.invite_code}</span>
  <div className="flex items-center gap-1.5 shrink-0 ml-auto">
    <button onClick={() => handleCodeKopieren(aktiveLiga.invite_code)}
      className="btn-press bg-primary-container text-on-primary-container px-3 py-1.5 rounded-lg font-mono text-[10px] font-bold uppercase tracking-wider hover:opacity-90 flex items-center gap-1.5 border border-primary-container/20">
      {codeKopiert ? <Check size={12} /> : <Copy size={12} />}
      {codeKopiert ? t('copied') : t('copy')}
    </button>
    <button onClick={async () => {
      const joinUrl = `${window.location.origin}${import.meta.env.BASE_URL}?join=${aktiveLiga.invite_code}`
      const text = language === 'tr'
        ? `SüperBET ligime katıl! Kod: ${aktiveLiga.invite_code}`
        : language === 'en'
        ? `Join my SüperBET league! Code: ${aktiveLiga.invite_code}`
        : `Tritt meiner SüperBET-Liga bei! Code: ${aktiveLiga.invite_code}`
      if (navigator.share) {
        try { await navigator.share({ title: 'SüperBET Liga', text, url: joinUrl }) } catch {}
      } else {
        try { await navigator.clipboard.writeText(joinUrl) } catch {}
        useToastStore.getState().toast(language === 'tr' ? 'Link kopyalandı!' : language === 'en' ? 'Link copied!' : 'Link kopiert!')
      }
    }}
      className="btn-press bg-surface-container-high text-on-surface-variant px-3 py-1.5 rounded-lg font-mono text-[10px] font-bold uppercase tracking-wider hover:bg-primary-container/10 hover:text-primary border border-white/10 flex items-center gap-1.5">
      <Share2 size={12} />
      {language === 'tr' ? 'Paylaş' : language === 'en' ? 'Share' : 'Teilen'}
    </button>
  </div>
</div>
```

**Step 2: Add imports**

Add `Share2` to the lucide-react import at the top of LeaguePage.tsx, and add `useToastStore` import if not already present.

**Verification:** Build passes. Share button appears next to Copy in league view.

---

### Task 2: Fix GlobalPage level badge overlap on usernames

**Objective:** Level badges on the Global leaderboard and podium overlap with usernames. Fix by adding proper margin to the avatar container.

**Files:**
- Modify: `src/components/AvatarLightbox.tsx` — add `overflow-visible` and right margin when `showLevel` is true
- Modify: `src/pages/GlobalPage.tsx` — add `mr-2` to AvatarLightbox in list rows

**Step 1: Fix AvatarLightbox to not clip badges**

In `AvatarLightbox.tsx`, the avatar container div (line 33–44) needs `overflow-visible` so the absolute badge isn't clipped. Also add a right margin when showing a level badge.

Change the container div from:
```tsx
<div
  onClick={(e) => { e.stopPropagation(); if (src) setIsOpen(true) }}
  className={`relative ${sizeClasses[size]} shrink-0 ${src ? 'cursor-pointer' : ''} ${className}`}
>
```
To:
```tsx
<div
  onClick={(e) => { e.stopPropagation(); if (src) setIsOpen(true) }}
  className={`relative ${sizeClasses[size]} shrink-0 ${src ? 'cursor-pointer' : ''} ${showLevel ? 'mr-2' : ''} ${className}`}
  style={showLevel ? { overflow: 'visible' } : undefined}
>
```

**Step 2: Verify podium badges**

Podium avatars (lines 87-91, 121-123, 154-156) already use `AvatarLightbox` with `showLevel` — they'll inherit the fix.

**Verification:** Build passes. Level badges on GlobalPage no longer overlap usernames.

---

### Task 3: Admin push notification system

**Objective:** Admin can compose and send a message that appears as a toast to all online users.

**Architecture:**
- New DB table: `admin_broadcasts` (id, message, created_at, created_by)
- Admin UI: textarea + send button in AdminSection
- Delivery: save to DB, then poll via existing realtime or simple interval. For MVP, use localStorage-based "last seen broadcast" pattern — each user checks on next page load.

**Files:**
- Create: `supabase/migrations/028_admin_broadcasts.sql`
- Modify: `src/components/profile/AdminSection.tsx` — add broadcast UI
- Modify: `src/App.tsx` — check for unread broadcasts on mount
- Modify: `src/utils/translations.ts` — add translation keys

**Step 1: Create DB migration**

Create `supabase/migrations/028_admin_broadcasts.sql`:

```sql
-- Admin broadcast messages
CREATE TABLE IF NOT EXISTS admin_broadcasts (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT NOT NULL
);

-- RLS: all authenticated users can read
ALTER TABLE admin_broadcasts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read broadcasts"
  ON admin_broadcasts FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can insert
CREATE POLICY "Admins can create broadcasts"
  ON admin_broadcasts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );
```

**Step 2: Add broadcast UI to AdminSection**

In `AdminSection.tsx`, add a new sub-tab or section for broadcasts. The component already has `adminTab` state — add a `'broadcasts'` tab. Or simpler: add a card at the bottom of the admin overview.

Add a new card in the admin overview:

```tsx
{/* ── Broadcast Message ── */}
<div className="bg-surface-container-low border border-surface-container-high rounded-xl p-4 shadow-sm">
  <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-red-400 mb-3">
    📢 {language === 'tr' ? 'Duyuru Gönder' : language === 'en' ? 'Send Broadcast' : 'Broadcast senden'}
  </h3>
  <textarea
    value={broadcastMessage}
    onChange={e => setBroadcastMessage(e.target.value)}
    placeholder={language === 'tr' ? 'Tüm kullanıcılara mesaj...' : language === 'en' ? 'Message to all users...' : 'Nachricht an alle User...'}
    className="w-full bg-black/30 border border-outline-variant rounded-lg px-3 py-2.5 text-on-surface font-mono text-xs focus:border-red-500/50 focus:outline-none resize-none h-20 mb-3"
  />
  <button
    onClick={handleSendBroadcast}
    disabled={!broadcastMessage.trim() || sendingBroadcast}
    className="w-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 py-2.5 rounded-lg font-mono text-xs font-bold uppercase tracking-wider transition-all active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed"
  >
    {sendingBroadcast
      ? (language === 'tr' ? 'Gönderiliyor...' : language === 'en' ? 'Sending...' : 'Sende...')
      : (language === 'tr' ? 'Herkese Gönder' : language === 'en' ? 'Send to All' : 'An Alle senden')}
  </button>
  {broadcastResult && (
    <p className={`text-[10px] font-mono mt-2 ${broadcastResult.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
      {broadcastResult.text}
    </p>
  )}
</div>
```

Add state variables:
```tsx
const [broadcastMessage, setBroadcastMessage] = useState('')
const [sendingBroadcast, setSendingBroadcast] = useState(false)
const [broadcastResult, setBroadcastResult] = useState<{type: 'success'|'error', text: string} | null>(null)
```

Add handler:
```tsx
async function handleSendBroadcast() {
  if (!broadcastMessage.trim()) return
  setSendingBroadcast(true)
  setBroadcastResult(null)
  try {
    const { error } = await supabase.from('admin_broadcasts').insert({
      message: broadcastMessage.trim(),
      created_by: user?.user_metadata?.username || 'admin'
    })
    if (error) throw error
    setBroadcastMessage('')
    setBroadcastResult({ type: 'success', text: language === 'tr' ? 'Duyuru gönderildi!' : language === 'en' ? 'Broadcast sent!' : 'Broadcast gesendet!' })
  } catch (err) {
    setBroadcastResult({ type: 'error', text: (err as Error).message })
  } finally {
    setSendingBroadcast(false)
  }
}
```

**Step 3: Check for broadcasts on app load**

In `App.tsx`, after auth is confirmed, poll for the latest broadcast and show as toast:

```tsx
// Check for admin broadcasts
useEffect(() => {
  if (!user) return
  const storageKey = `superbet_last_broadcast_${user.id}`
  const lastSeenId = localStorage.getItem(storageKey)

  supabase.from('admin_broadcasts')
    .select('id, message')
    .order('id', { ascending: false })
    .limit(1)
    .single()
    .then(({ data }) => {
      if (data && String(data.id) !== lastSeenId) {
        useToastStore.getState().toast(`📢 ${data.message}`, 'info', 8000)
        localStorage.setItem(storageKey, String(data.id))
      }
    })
}, [user])
```

**Verification:** 
1. Run migration on Supabase
2. Admin types a message and clicks send
3. Other users see the toast on next page load

---

### Translation Keys

Add to `src/utils/translations.ts` (all 3 languages):

```ts
// DE
broadcastSent: 'Broadcast gesendet!',
broadcastPlaceholder: 'Nachricht an alle User...',
sendBroadcast: 'Broadcast senden',
sendToAll: 'An Alle senden',
sending: 'Sende...',

// EN
broadcastSent: 'Broadcast sent!',
broadcastPlaceholder: 'Message to all users...',
sendBroadcast: 'Send Broadcast',
sendToAll: 'Send to All',
sending: 'Sending...',

// TR
broadcastSent: 'Duyuru gönderildi!',
broadcastPlaceholder: 'Tüm kullanıcılara mesaj...',
sendBroadcast: 'Duyuru Gönder',
sendToAll: 'Herkese Gönder',
sending: 'Gönderiliyor...',
```

---

### Execution Order

1. **Task 2** first (quick fix, no deps)
2. **Task 1** second (LeaguePage share button)
3. **Task 3** last (requires DB migration)
4. Verify PWA/Share already working (Task 1 & 2 status confirmed ✅)

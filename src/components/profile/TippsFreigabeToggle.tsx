import { useSettingsStore } from '../../stores/settingsStore'
import { useToastStore } from '../../stores/toastStore'

export function TippsFreigabeToggle() {
  const tippsFreigeschaltet = useSettingsStore(s => s.tippsFreigeschaltet)
  const setTippsFreigeschaltet = useSettingsStore(s => s.setTippsFreigeschaltet)
  const isLaden = useSettingsStore(s => s.isLaden)

  const handleToggle = async () => {
    const neuerWert = !tippsFreigeschaltet
    await setTippsFreigeschaltet(neuerWert)
    const msg = neuerWert ? '🟢 Tipps jetzt freigegeben' : '🔴 Tipps gesperrt'
    useToastStore.getState().toast(msg)
  }

  if (isLaden) return (
    <div className="bg-surface-container border border-surface-container-high rounded-lg p-3 animate-pulse">
      <div className="h-5 w-32 bg-surface-container-high rounded mb-2" />
      <div className="h-4 w-48 bg-surface-container-high rounded" />
    </div>
  )

  return (
    <div className="bg-surface-container border border-surface-container-high rounded-lg p-3 flex items-center justify-between">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-on-surface">
          {tippsFreigeschaltet ? '🟢 Tipps freigegeben' : '🔴 Tipps gesperrt'}
        </p>
        <p className="text-[10px] text-on-surface-variant font-mono mt-0.5">
          {tippsFreigeschaltet
            ? 'Spieler können Tipps & Bonus-Tipps abgeben'
            : 'Alle Tipp-Funktionen sind deaktiviert'}
        </p>
      </div>
      <button
        onClick={handleToggle}
        className={`relative w-12 h-7 rounded-full transition-colors duration-200 shrink-0 ${
          tippsFreigeschaltet
            ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.3)]'
            : 'bg-surface-container-highest border border-surface-container-high'
        }`}
      >
        <span
          className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${
            tippsFreigeschaltet ? 'left-6' : 'left-1'
          }`}
        />
      </button>
    </div>
  )
}

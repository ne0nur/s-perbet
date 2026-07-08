import { useReducer, useCallback, useRef } from 'react'

// ─── State Machine für den Save-Indikator ───
export type SaveStatus = 'idle' | 'dirty' | 'saving' | 'saved' | 'offline' | 'kodraw'

type Action =
  | { type: 'CHANGE' }
  | { type: 'SAVE_START' }
  | { type: 'SAVE_SPINNER' }
  | { type: 'SAVE_DONE' }
  | { type: 'SAVE_ERROR' }
  | { type: 'OFFLINE' }
  | { type: 'ONLINE' }
  | { type: 'KODRAW' }
  | { type: 'RESET' }

interface SaveState {
  status: SaveStatus
  tick: number // zum Key-Wechsel für Ring-Remount
}

function reducer(state: SaveState, action: Action): SaveState {
  switch (action.type) {
    case 'CHANGE':
      return { status: 'dirty', tick: state.tick + 1 }
    case 'SAVE_START':
      return { ...state, status: 'dirty' } // Ring bleibt während Save
    case 'SAVE_SPINNER':
      return { status: 'saving', tick: state.tick }
    case 'SAVE_DONE':
      return { status: 'saved', tick: state.tick }
    case 'SAVE_ERROR':
      return { status: 'idle', tick: state.tick }
    case 'OFFLINE':
      return { status: 'offline', tick: state.tick }
    case 'ONLINE':
      return { status: 'idle', tick: state.tick }
    case 'KODRAW':
      return { status: 'kodraw', tick: state.tick }
    case 'RESET':
      return { status: 'idle', tick: 0 }
    default:
      return state
  }
}

export function useSaveState() {
  const [state, dispatch] = useReducer(reducer, { status: 'idle', tick: 0 })
  const spinnerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const markDirty = useCallback(() => dispatch({ type: 'CHANGE' }), [])
  const markSaveStart = useCallback(() => {
    dispatch({ type: 'SAVE_START' })
    // Spinner erst nach 300ms
    spinnerTimerRef.current = setTimeout(() => dispatch({ type: 'SAVE_SPINNER' }), 300)
  }, [])
  const markSaveDone = useCallback(() => {
    if (spinnerTimerRef.current) { clearTimeout(spinnerTimerRef.current); spinnerTimerRef.current = null }
    dispatch({ type: 'SAVE_DONE' })
  }, [])
  const markSaveError = useCallback(() => {
    if (spinnerTimerRef.current) { clearTimeout(spinnerTimerRef.current); spinnerTimerRef.current = null }
    dispatch({ type: 'SAVE_ERROR' })
  }, [])
  const markOffline = useCallback(() => dispatch({ type: 'OFFLINE' }), [])
  const markOnline = useCallback(() => dispatch({ type: 'ONLINE' }), [])
  const markKoDraw = useCallback(() => dispatch({ type: 'KODRAW' }), [])
  const reset = useCallback(() => {
    if (spinnerTimerRef.current) { clearTimeout(spinnerTimerRef.current); spinnerTimerRef.current = null }
    dispatch({ type: 'RESET' })
  }, [])

  return {
    status: state.status,
    tick: state.tick,
    markDirty,
    markSaveStart,
    markSaveDone,
    markSaveError,
    markOffline,
    markOnline,
    markKoDraw,
    reset,
  }
}

import { Component, type ReactNode } from 'react'

interface Props { children: ReactNode }
interface State { hasError: boolean; error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-surface-container-low border border-surface-container-high rounded-xl p-8 text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-red-500/10 rounded-full flex items-center justify-center border border-red-500/20">
              <span className="text-2xl">⚠️</span>
            </div>
            <h1 className="text-lg font-bold text-on-surface">Etwas ist schiefgelaufen</h1>
            <p className="text-sm text-on-surface-variant font-mono">
              {this.state.error?.message || 'Unbekannter Fehler'}
            </p>
            <button
              onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload() }}
              className="px-6 py-2.5 bg-primary-container/20 text-primary border border-primary-container/30 rounded-lg font-bold hover:bg-primary-container/30 transition-colors"
            >
              Neu laden
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

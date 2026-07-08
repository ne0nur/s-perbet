import { Component, type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'
import { useLanguageStore } from '../stores/languageStore'
import { translations } from '../utils/translations'

interface Props { children: ReactNode }
interface State { hasError: boolean; error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      const language = useLanguageStore.getState().language || 'de'
      const dict = (translations[language] || translations['de']) as Record<string, string>

      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6 animate-page-enter">
          <div className="max-w-md w-full bg-surface-container-low border border-surface-container-high rounded-xl p-8 text-center space-y-4 shadow-xl" role="alert">
            <div className="w-16 h-16 mx-auto bg-error-container/20 rounded-full flex items-center justify-center border border-error/30">
              <AlertTriangle className="text-error" size={28} />
            </div>
            <h1 className="text-lg font-bold text-on-surface">
              {dict.errorSomethingWentWrong || 'Etwas ist schiefgelaufen'}
            </h1>
            <p className="text-sm text-on-surface-variant font-mono">
              {this.state.error?.message || dict.errorUnknown || 'Unbekannter Fehler'}
            </p>
            <button
              onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload() }}
              aria-label={dict.errorReload || 'Neu laden'}
              className="px-6 py-3 bg-primary-container/20 text-primary border border-primary-container/30 rounded-lg font-bold hover:bg-primary-container/30 transition-colors cursor-pointer min-h-[44px] flex items-center justify-center mx-auto"
            >
              {dict.errorReload || 'Neu laden'}
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

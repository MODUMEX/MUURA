import { Component, type ReactNode } from 'react'

export class Falla extends Component<{ children: ReactNode }, { error: string | null }> {
  state = { error: null as string | null }

  static getDerivedStateFromError(e: unknown) {
    return { error: e instanceof Error ? `${e.name}: ${e.message}` : String(e) }
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="login">
        <div className="login-caja">
          <b>Algo falló al mostrar la página.</b>
          <div className="alerta" style={{ wordBreak: 'break-word' }}>{this.state.error}</div>
          <p className="nota">Mandale este mensaje a Sistemas. Podés intentar de nuevo con el botón.</p>
          <button onClick={() => { try { sessionStorage.clear() } catch { } location.reload() }}>Volver a cargar</button>
        </div>
      </div>
    )
  }
}

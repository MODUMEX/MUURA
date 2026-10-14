import { useState } from 'react'
import { LOGO_MUURA } from '../assets/imagenes'
import { entrar, pedirCuenta } from '../nube'

export function Login({ aviso, onEntrar }: { aviso?: string; onEntrar: () => void }) {
  const [modo, setModo] = useState<'entrar' | 'pedir'>('entrar')
  const [nombre, setNombre] = useState('')
  const [correo, setCorreo] = useState('')
  const [clave, setClave] = useState('')
  const [ver, setVer] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [mensaje, setMensaje] = useState<{ tipo: 'error' | 'ok'; texto: string } | null>(aviso ? { tipo: 'error', texto: aviso } : null)

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault()
    setMensaje(null)
    if (!correo.includes('@')) return setMensaje({ tipo: 'error', texto: 'Escribí un correo válido.' })
    if (clave.length < 6) return setMensaje({ tipo: 'error', texto: 'La contraseña debe tener al menos 6 caracteres.' })
    if (modo === 'pedir' && !nombre.trim()) return setMensaje({ tipo: 'error', texto: 'Escribí tu nombre.' })
    setOcupado(true)
    try {
      if (modo === 'entrar') {
        await entrar(correo, clave)
        onEntrar()
      } else {
        await pedirCuenta(nombre, correo, clave)
        setModo('entrar')
        setClave('')
        setMensaje({ tipo: 'ok', texto: 'Listo. Tu cuenta queda pendiente hasta que un administrador la apruebe.' })
      }
    } catch (err) {
      setMensaje({ tipo: 'error', texto: (err as Error).message })
    } finally {
      setOcupado(false)
    }
  }

  return (
    <div className="login">
      <form className="login-caja" onSubmit={enviar}>
        <img src={LOGO_MUURA} alt="MUURA" className="login-logo" />
        <p className="login-sub">Constructor de muros móviles</p>
        {modo === 'pedir' && (
          <label className="campo">
            <span>Nombre</span>
            <input id="login-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} autoComplete="name" />
          </label>
        )}
        <label className="campo">
          <span>Correo</span>
          <input id="login-correo" type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} autoComplete="username" />
        </label>
        <label className="campo">
          <span>Contraseña</span>
          <div className="clave">
            <input id="login-clave" type={ver ? 'text' : 'password'} value={clave} onChange={(e) => setClave(e.target.value)} autoComplete={modo === 'entrar' ? 'current-password' : 'new-password'} />
            <button type="button" className="ojo" onClick={() => setVer(!ver)} aria-label={ver ? 'Ocultar contraseña' : 'Mostrar contraseña'} title={ver ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
                <circle cx="12" cy="12" r="3" />
                {ver && <path d="M3 3l18 18" />}
              </svg>
            </button>
          </div>
        </label>
        {mensaje && <div className={mensaje.tipo === 'error' ? 'alerta' : 'exito'}>{mensaje.texto}</div>}
        <button type="submit" disabled={ocupado}>{ocupado ? 'Un momento…' : modo === 'entrar' ? 'Entrar' : 'Pedir cuenta'}</button>
        <button type="button" className="enlace" onClick={() => { setModo(modo === 'entrar' ? 'pedir' : 'entrar'); setMensaje(null) }}>
          {modo === 'entrar' ? '¿No tenés cuenta? Pedila acá' : 'Ya tengo cuenta'}
        </button>
      </form>
    </div>
  )
}

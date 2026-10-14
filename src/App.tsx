import { useCallback, useEffect, useState } from 'react'
import { LOGO_MUURA } from './assets/imagenes'
import { Ajustes } from './components/Ajustes'
import { Editor } from './components/Editor'
import { Login } from './components/Login'
import { Proyectos } from './components/Proyectos'
import { Usuarios } from './components/Usuarios'
import { cargarParametrosNube, miPerfil, nube, nubeConfigurada, salir, type Perfil } from './nube'
import { PARAMETROS_BASE } from './parametros'
import type { Parametros, Proyecto } from './types'

type Pantalla = { t: 'proyectos' } | { t: 'editor'; pr: Proyecto } | { t: 'ajustes' } | { t: 'usuarios' }

export default function App() {
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [estado, setEstado] = useState<'cargando' | 'fuera' | 'dentro'>('cargando')
  const [aviso, setAviso] = useState('')
  const [p, setP] = useState<Parametros>(PARAMETROS_BASE)
  const [pantalla, setPantalla] = useState<Pantalla>({ t: 'proyectos' })

  const revisar = useCallback(async () => {
    try {
      const yo = await miPerfil()
      if (!yo) {
        setEstado('fuera')
        return
      }
      if (!yo.activo) {
        await salir()
        setAviso('Tu cuenta todavía no tiene acceso. Pedile a un administrador que la active.')
        setEstado('fuera')
        return
      }
      setP(await cargarParametrosNube())
      setPerfil(yo)
      setAviso('')
      setEstado('dentro')
    } catch (e) {
      setAviso((e as Error).message)
      setEstado('fuera')
    }
  }, [])

  useEffect(() => {
    void revisar()
    const { data } = nube.auth.onAuthStateChange((evento) => {
      if (evento === 'SIGNED_OUT') {
        setPerfil(null)
        setEstado('fuera')
        setPantalla({ t: 'proyectos' })
      }
    })
    return () => data.subscription.unsubscribe()
  }, [revisar])

  if (!nubeConfigurada) return <div className="login"><div className="login-caja"><div className="alerta">Falta configurar la conexión con Supabase (.env).</div></div></div>
  if (estado === 'cargando') return <div className="login"><p className="vacio">Cargando…</p></div>
  if (estado === 'fuera' || !perfil) return <Login aviso={aviso} onEntrar={() => void revisar()} />

  const admin = perfil.rol === 'admin'
  return (
    <div className="app">
      <header className="barra">
        <img src={LOGO_MUURA} alt="MUURA" className="logo" />
        <span className="nombre-app">Constructor de muros móviles</span>
        <nav>
          <button className={pantalla.t === 'proyectos' || pantalla.t === 'editor' ? 'activa' : ''} onClick={() => setPantalla({ t: 'proyectos' })}>Proyectos</button>
          {admin && <button className={pantalla.t === 'ajustes' ? 'activa' : ''} onClick={() => setPantalla({ t: 'ajustes' })}>Precios y parámetros</button>}
          {admin && <button className={pantalla.t === 'usuarios' ? 'activa' : ''} onClick={() => setPantalla({ t: 'usuarios' })}>Usuarios</button>}
        </nav>
        <span className="usuario">{perfil.nombre || perfil.correo}<small>{admin ? 'Administrador' : 'Proyectista'}</small></span>
        <button className="salir" onClick={() => void salir()}>Salir</button>
        <span className="version">v{__VERSION_APP__}</span>
      </header>
      {pantalla.t === 'proyectos' && <Proyectos p={p} yo={perfil} onAbrir={(pr) => setPantalla({ t: 'editor', pr })} />}
      {pantalla.t === 'editor' && <Editor key={pantalla.pr.id} inicial={pantalla.pr} p={p} onSalir={() => setPantalla({ t: 'proyectos' })} />}
      {pantalla.t === 'ajustes' && admin && <Ajustes p={p} onGuardar={setP} />}
      {pantalla.t === 'usuarios' && admin && <Usuarios yo={perfil} />}
    </div>
  )
}

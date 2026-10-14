import { useEffect, useState } from 'react'
import { editarPerfil, listarPerfiles, type Perfil } from '../nube'
import type { Rol } from '../types'

export function Usuarios({ yo }: { yo: Perfil }) {
  const [lista, setLista] = useState<Perfil[]>([])
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(true)

  const cargar = async () => {
    setCargando(true)
    try {
      setLista(await listarPerfiles())
      setError('')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setCargando(false)
    }
  }
  useEffect(() => { void cargar() }, [])

  const cambiar = async (u: Perfil, c: Partial<Pick<Perfil, 'nombre' | 'rol' | 'activo'>>) => {
    try {
      await editarPerfil(u.id, c)
      setLista((l) => l.map((x) => (x.id === u.id ? { ...x, ...c } : x)))
      setError('')
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const pendientes = lista.filter((u) => !u.activo)

  return (
    <div className="pagina angosta">
      <div className="titulo-seccion">
        <h2>Usuarios</h2>
        <button className="secundario" onClick={() => void cargar()}>Actualizar</button>
      </div>
      {error && <div className="alerta">{error}</div>}
      {pendientes.length > 0 && <div className="nota-muro">{pendientes.length === 1 ? 'Hay 1 cuenta' : `Hay ${pendientes.length} cuentas`} sin acceso. Activala para que pueda entrar.</div>}
      {cargando ? (
        <p className="vacio">Cargando usuarios…</p>
      ) : (
        <table className="tabla">
          <thead><tr><th>Nombre</th><th>Correo</th><th>Rol</th><th>Acceso</th></tr></thead>
          <tbody>
            {lista.map((u) => {
              const soyYo = u.id === yo.id
              return (
                <tr key={u.id}>
                  <td><input defaultValue={u.nombre} onBlur={(e) => e.target.value !== u.nombre && void cambiar(u, { nombre: e.target.value })} /></td>
                  <td>{u.correo}</td>
                  <td>
                    <select value={u.rol} disabled={soyYo} title={soyYo ? 'No podés cambiar tu propio rol' : ''} onChange={(e) => void cambiar(u, { rol: e.target.value as Rol })}>
                      <option value="proyectista">Proyectista</option>
                      <option value="admin">Administrador</option>
                    </select>
                  </td>
                  <td>
                    {soyYo ? (
                      <span className="estado">Activo (vos)</span>
                    ) : (
                      <button className={u.activo ? 'chico peligro' : 'chico'} onClick={() => void cambiar(u, { activo: !u.activo })}>
                        {u.activo ? 'Quitar acceso' : 'Dar acceso'}
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
      <p className="nota">Administrador: cambia precios y parámetros y maneja las cuentas. Proyectista: hace planos y cotizaciones y ve todos los proyectos. Las cuentas nuevas se piden desde la pantalla de entrada.</p>
    </div>
  )
}

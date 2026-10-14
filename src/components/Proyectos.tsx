import { useEffect, useState } from 'react'
import { id, normalizar, proyectoNuevo } from '../almacen'
import { resumenProyecto } from '../calculo'
import { cotizar, dinero } from '../cotizacion'
import { borrarProyectoNube, guardarProyectoNube, listarProyectos, type FilaProyecto, type Perfil } from '../nube'
import type { Parametros, Proyecto } from '../types'

export function Proyectos({ p, yo, onAbrir }: { p: Parametros; yo: Perfil; onAbrir: (pr: Proyecto) => void }) {
  const [lista, setLista] = useState<FilaProyecto[]>([])
  const [filtro, setFiltro] = useState('')
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [porBorrar, setPorBorrar] = useState<string | null>(null)

  const cargar = async () => {
    setCargando(true)
    try {
      setLista((await listarProyectos()).map((f) => ({ ...f, datos: normalizar(f.datos) })))
      setError('')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setCargando(false)
    }
  }
  useEffect(() => { void cargar() }, [])

  const intentar = async (accion: () => Promise<void>) => {
    try {
      await accion()
      setError('')
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const nuevo = () => intentar(async () => {
    const pr = proyectoNuevo(p)
    await guardarProyectoNube(pr)
    onAbrir(pr)
  })
  const duplicar = (pr: Proyecto) => intentar(async () => {
    await guardarProyectoNube({ ...structuredClone(pr), id: id(), folio: '', desarrollo: `${pr.desarrollo} (copia)` })
    await cargar()
  })
  const borrar = (idp: string) => intentar(async () => {
    await borrarProyectoNube(idp)
    setPorBorrar(null)
    await cargar()
  })

  const f = filtro.trim().toLowerCase()
  const visibles = lista.filter(({ datos: x }) => !f || [x.folio, x.desarrollo, x.cliente].some((s) => s.toLowerCase().includes(f)))
  const puedeBorrar = (fila: FilaProyecto) => yo.rol === 'admin' || fila.creado_por === yo.id

  return (
    <div className="pagina">
      <div className="titulo-seccion">
        <h2>Proyectos</h2>
        <input className="buscar" placeholder="Buscar por cotización, desarrollo o cliente" value={filtro} onChange={(e) => setFiltro(e.target.value)} />
        <button className="secundario" onClick={() => void cargar()}>Actualizar</button>
        <button onClick={() => void nuevo()}>+ Proyecto nuevo</button>
      </div>
      {error && <div className="alerta">{error}</div>}
      {cargando ? (
        <p className="vacio">Cargando proyectos…</p>
      ) : visibles.length === 0 ? (
        <p className="vacio">{lista.length ? 'Nada coincide con la búsqueda.' : 'Todavía no hay proyectos. Creá el primero con "Proyecto nuevo".'}</p>
      ) : (
        <table className="tabla">
          <thead>
            <tr><th>Cotización</th><th>Desarrollo</th><th>Cliente</th><th className="der">Muros</th><th className="der">Paneles</th><th className="der">Total</th><th>Modificado</th><th /></tr>
          </thead>
          <tbody>
            {visibles.map((fila) => {
              const x = fila.datos
              return (
                <tr key={x.id} className="clic" onDoubleClick={() => onAbrir(x)}>
                  <td>{x.folio || '—'}</td>
                  <td>{x.desarrollo || <i>sin nombre</i>}</td>
                  <td>{x.cliente}</td>
                  <td className="der">{x.muros.length}</td>
                  <td className="der">{resumenProyecto(x, p).paneles}</td>
                  <td className="der">{dinero(cotizar(x, p).total, x.moneda)}</td>
                  <td>{new Date(fila.modificado).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}</td>
                  <td className="acciones">
                    {porBorrar === x.id ? (
                      <>
                        <span className="estado">¿Borrar?</span>
                        <button className="chico peligro" onClick={() => void borrar(x.id)}>Sí, borrar</button>
                        <button className="chico secundario" onClick={() => setPorBorrar(null)}>No</button>
                      </>
                    ) : (
                      <>
                        <button className="chico" onClick={() => onAbrir(x)}>Abrir</button>
                        <button className="chico secundario" onClick={() => void duplicar(x)}>Duplicar</button>
                        {puedeBorrar(fila) && <button className="chico peligro" onClick={() => setPorBorrar(x.id)}>Borrar</button>}
                      </>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}

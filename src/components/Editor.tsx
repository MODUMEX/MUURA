import { useEffect, useMemo, useRef, useState } from 'react'
import { hoy, muroNuevo } from '../almacen'
import { guardarProyectoNube } from '../nube'
import { acabadoLargo, calcularMuro, metros, NOMBRE_PANEL, resumenProyecto, textoDiferencia } from '../calculo'
import { convertir, cotizar, dinero, textoSemanas, tipoCambio, tramoInstalacion } from '../cotizacion'
import { nombreArchivo, pdfCotizacion, pdfPlanos } from '../exportar/pdf'
import { hojasDelProyecto } from '../hojas'
import type { Muro, Parametros, Proyecto } from '../types'
import { GUARDADOS } from '../assets/guardados'
import { CampoNumero, Etiqueta } from './Campo'
import { VistaHoja } from './VistaHoja'

type Pestana = 'plano' | 'cotizacion' | 'calculo'

export function Editor({ inicial, p, onSalir }: { inicial: Proyecto; p: Parametros; onSalir: () => void }) {
  const [pr, setPr] = useState(inicial)
  const [pestana, setPestana] = useState<Pestana>('plano')
  const [hojaSel, setHojaSel] = useState(0)
  const [estado, setEstado] = useState<{ texto: string; error?: boolean }>({ texto: 'Guardado' })
  const primera = useRef(true)
  const cola = useRef<Promise<void>>(Promise.resolve())
  const turno = useRef(0)
  const sucio = useRef(false)

  const guardarYa = (datos: Proyecto) => {
    const n = ++turno.current
    sucio.current = false
    setEstado({ texto: 'Guardando…' })
    cola.current = cola.current.then(async () => {
      try {
        await guardarProyectoNube(datos)
        if (n === turno.current) setEstado({ texto: 'Guardado' })
      } catch (e) {
        sucio.current = true
        if (n === turno.current) setEstado({ texto: `No se guardó: ${(e as Error).message}`, error: true })
      }
    })
    return cola.current
  }

  useEffect(() => {
    if (primera.current) { primera.current = false; return }
    sucio.current = true
    setEstado({ texto: 'Cambios sin guardar' })
    const t = setTimeout(() => void guardarYa(pr), 900)
    return () => clearTimeout(t)
  }, [pr])

  const volver = async () => {
    if (sucio.current) await guardarYa(pr)
    if (!sucio.current) onSalir()
  }

  const hojas = useMemo(() => hojasDelProyecto(pr, p), [pr, p])
  const cot = useMemo(() => cotizar(pr, p), [pr, p])
  const resumen = useMemo(() => resumenProyecto(pr, p), [pr, p])
  const altoMax = Math.max(0, ...pr.muros.filter((m) => m.instalacion).map((m) => m.alto))
  const tramo = altoMax ? tramoInstalacion(altoMax, p) : null
  const instalacionSugerida = tramo ? convertir(tramo.precio, pr, p) : null
  const hoja = hojas[Math.min(hojaSel, hojas.length - 1)]

  const cambiarMoneda = (moneda: Proyecto['moneda']) =>
    setPr((x) => {
      if (x.moneda === moneda) return x
      const tc = tipoCambio(x, p)
      const pasar = (v: number) => (tc ? Math.round((moneda === 'USD' ? v / tc : v * tc) * 100) / 100 : v)
      return { ...x, moneda, flete: pasar(x.flete), instalacion: x.instalacion === null ? null : pasar(x.instalacion) }
    })
  const set = <K extends keyof Proyecto>(k: K, v: Proyecto[K]) => setPr((x) => ({ ...x, [k]: v }))
  const setMuro = (idm: string, cambios: Partial<Muro>) =>
    setPr((x) => ({ ...x, muros: x.muros.map((m) => (m.id === idm ? { ...m, ...cambios } : m)) }))
  const agregarMuro = () =>
    setPr((x) => ({ ...x, muros: [...x.muros, muroNuevo(x.muros.length + 1, p.lineas[0]?.linea ?? 'A')] }))
  const quitarMuro = (idm: string) => {
    if (pr.muros.length === 1) return
    if (!confirm('¿Quitar este muro del proyecto?')) return
    setPr((x) => ({ ...x, muros: x.muros.filter((m) => m.id !== idm) }))
  }
  const nuevaRevision = () =>
    setPr((x) => ({ ...x, revisiones: [...x.revisiones, { letra: `V${x.revisiones.length + 1}`, autor: x.revisiones.at(-1)?.autor ?? '', fecha: hoy() }] }))

  const bajarPlanos = () => pdfPlanos(pr, p).save(nombreArchivo(pr, 'Planos'))
  const bajarCotizacion = () => {
    if (cot.faltantes.length) return alert(`No se puede bajar la cotización:\n\n${cot.faltantes.join('\n')}`)
    pdfCotizacion(pr, p).save(nombreArchivo(pr, 'Cotización'))
  }

  return (
    <div className="editor">
      <header className="barra-editor">
        <button className="secundario" onClick={() => void volver()}>← Proyectos</button>
        <h2>{pr.desarrollo || 'Proyecto sin nombre'}{pr.folio && <small> · {pr.folio}</small>}</h2>
        <span className={estado.error ? 'estado error' : 'estado'}>{estado.texto}</span>
        {estado.error && <button className="chico" onClick={() => void guardarYa(pr)}>Reintentar</button>}
        <button onClick={bajarPlanos}>Planos PDF</button>
        <button onClick={bajarCotizacion}>Cotización PDF</button>
      </header>
      <div className="cuerpo">
        <aside className="lateral">
          <section>
            <h3>Proyecto</h3>
            <div className="rejilla">
              <Etiqueta texto="N° de cotización"><input value={pr.folio} onChange={(e) => set('folio', e.target.value)} placeholder="S00000" /></Etiqueta>
              <Etiqueta texto="Fecha"><input type="date" value={pr.fecha} onChange={(e) => set('fecha', e.target.value)} /></Etiqueta>
              <Etiqueta texto="Nombre del desarrollo"><input value={pr.desarrollo} onChange={(e) => set('desarrollo', e.target.value)} /></Etiqueta>
              <Etiqueta texto="Cliente"><input value={pr.cliente} onChange={(e) => set('cliente', e.target.value)} /></Etiqueta>
              <Etiqueta texto="Dirección"><input value={pr.direccion} onChange={(e) => set('direccion', e.target.value)} /></Etiqueta>
              <Etiqueta texto="Color"><input value={pr.color} onChange={(e) => set('color', e.target.value)} placeholder="S/E" /></Etiqueta>
              <Etiqueta texto="Contacto"><input value={pr.contacto} onChange={(e) => set('contacto', e.target.value)} /></Etiqueta>
              <Etiqueta texto="Teléfono"><input value={pr.telefono} onChange={(e) => set('telefono', e.target.value)} /></Etiqueta>
              <Etiqueta texto="Vendedor"><input value={pr.vendedor} onChange={(e) => set('vendedor', e.target.value)} /></Etiqueta>
            </div>
          </section>

          <section>
            <div className="titulo-seccion">
              <h3>Revisiones</h3>
              <button className="chico" onClick={nuevaRevision}>+ Revisión</button>
            </div>
            {pr.revisiones.map((r, i) => (
              <div className="fila-rev" key={i}>
                <b>{r.letra}</b>
                <input value={r.autor} placeholder="Elaboró" onChange={(e) => set('revisiones', pr.revisiones.map((x, j) => (j === i ? { ...x, autor: e.target.value } : x)))} />
                <input type="date" value={r.fecha} onChange={(e) => set('revisiones', pr.revisiones.map((x, j) => (j === i ? { ...x, fecha: e.target.value } : x)))} />
              </div>
            ))}
            {pr.revisiones.length > 3 && <p className="nota">En el cajetín salen las últimas 3.</p>}
          </section>

          <section>
            <div className="titulo-seccion">
              <h3>Muros</h3>
              <button className="chico" onClick={agregarMuro}>+ Muro</button>
            </div>
            {pr.muros.map((m) => (
              <TarjetaMuro key={m.id} m={m} p={p} onCambio={(c) => setMuro(m.id, c)} onQuitar={pr.muros.length > 1 ? () => quitarMuro(m.id) : undefined} />
            ))}
          </section>

          <section>
            <h3>Cotización y embarque</h3>
            <div className="rejilla">
              <Etiqueta texto="Moneda">
                <select value={pr.moneda} onChange={(e) => cambiarMoneda(e.target.value as Proyecto['moneda'])}>
                  <option value="MXN">Pesos (MXN)</option>
                  <option value="USD">Dólares (USD)</option>
                </select>
              </Etiqueta>
              {pr.moneda === 'USD' && (
                <Etiqueta texto="Tipo de cambio (MXN por USD)" ayuda="En blanco = el de Precios y parámetros">
                  <CampoNumero valor={pr.tipoCambio} vacio min={0} decimales={4} placeholder={p.tipoCambio ? String(p.tipoCambio) : 'Falta'} onCambio={(v) => set('tipoCambio', v)} />
                </Etiqueta>
              )}
              <Etiqueta texto={`Flete especial (${pr.moneda})`}><CampoNumero valor={pr.flete} onCambio={(v) => set('flete', v ?? 0)} min={0} /></Etiqueta>
              <Etiqueta texto={`Instalación (${pr.moneda})`} ayuda="En blanco = precio sugerido según el alto"><CampoNumero valor={pr.instalacion} vacio min={0} placeholder={String(instalacionSugerida ?? '')} onCambio={(v) => set('instalacion', v)} /></Etiqueta>
              <Etiqueta texto="Tiempo de entrega" ayuda="En blanco = 1 panel por día hábil"><input value={pr.entrega} placeholder={textoSemanas(resumen.semanas)} onChange={(e) => set('entrega', e.target.value.toUpperCase())} /></Etiqueta>
              <Etiqueta texto="Tarimas"><CampoNumero valor={pr.tarimas} onCambio={(v) => set('tarimas', Math.round(v ?? 0))} decimales={0} min={0} /></Etiqueta>
              <Etiqueta texto="Módulos"><CampoNumero valor={pr.modulos} onCambio={(v) => set('modulos', Math.round(v ?? 0))} decimales={0} min={0} /></Etiqueta>
            </div>
            {pr.moneda === 'USD' && !tipoCambio(pr, p) && <div className="aviso">Falta el tipo de cambio. El flete y la instalación se escriben en dólares.</div>}
            <Etiqueta texto="Observaciones de la cotización">
              <textarea rows={3} value={pr.notas} onChange={(e) => set('notas', e.target.value)} />
            </Etiqueta>
            <dl className="resumen">
              <dt>Paneles totales</dt><dd>{resumen.paneles}</dd>
              <dt>Entrega</dt><dd>{resumen.dias} días hábiles · {resumen.semanas} {resumen.semanas === 1 ? 'semana' : 'semanas'}</dd>
              <dt>M² cotización</dt><dd>{resumen.m2Cotizacion.toFixed(2)}</dd>
              <dt>Peso de embarque</dt><dd>{resumen.pesoEmbarque.toLocaleString('es-MX')} kg</dd>
            </dl>
          </section>
        </aside>

        <main className="principal">
          <nav className="pestanas">
            <button className={pestana === 'plano' ? 'activa' : ''} onClick={() => setPestana('plano')}>Plano</button>
            <button className={pestana === 'cotizacion' ? 'activa' : ''} onClick={() => setPestana('cotizacion')}>Cotización</button>
            <button className={pestana === 'calculo' ? 'activa' : ''} onClick={() => setPestana('calculo')}>Cálculo</button>
          </nav>

          {pestana === 'plano' && hoja && (
            <div className="area-plano">
              <div className="selector-hojas">
                {hojas.map((h, i) => (
                  <button key={h.numero} className={i === hojaSel ? 'activa' : ''} onClick={() => setHojaSel(i)}>
                    <b>{h.numero}</b> {h.titulo}
                  </button>
                ))}
              </div>
              <VistaHoja hoja={hoja} />
            </div>
          )}

          {pestana === 'cotizacion' && (
            <div className="area-tabla">
              {cot.faltantes.length > 0 && <div className="alerta">{cot.faltantes.map((f) => <div key={f}>{f}</div>)}</div>}
              <table className="tabla">
                <thead>
                  <tr><th>Descripción</th><th className="der">Cantidad</th><th className="der">Precio unitario</th><th className="der">Importe</th></tr>
                </thead>
                <tbody>
                  {cot.secciones.map((sec) => [
                    <tr key={sec.titulo} className="seccion"><td colSpan={3}>{sec.titulo}</td><td className="der">{dinero(sec.subtotal)}</td></tr>,
                    ...sec.partidas.map((x, i) => (
                      <tr key={sec.titulo + i} className={x.falta ? 'falta' : ''}>
                        <td><b>{x.codigo && `[${x.codigo}] `}{x.concepto}</b>{x.descripcion && <div className="desc">{x.descripcion}</div>}</td>
                        <td className="der">{x.cantidad.toFixed(2)} {x.unidad}</td>
                        <td className="der">{dinero(x.precio)}</td>
                        <td className="der">{dinero(x.importe)}</td>
                      </tr>
                    )),
                  ])}
                </tbody>
                <tfoot>
                  <tr><td colSpan={3} className="der">Subtotal</td><td className="der">{dinero(cot.subtotal, cot.moneda)}</td></tr>
                  <tr><td colSpan={3} className="der">IVA {Math.round(p.iva * 100)}%</td><td className="der">{dinero(cot.iva, cot.moneda)}</td></tr>
                  <tr className="total"><td colSpan={3} className="der">Total</td><td className="der">{dinero(cot.total, cot.moneda)}</td></tr>
                </tfoot>
              </table>
              <p className="nota">Tiempo de entrega: {cot.entrega}.{cot.moneda === 'USD' && cot.tipoCambio ? ` Precios en dólares, tipo de cambio ${cot.tipoCambio}.` : ''}</p>
            </div>
          )}

          {pestana === 'calculo' && (
            <div className="area-tabla">
              {pr.muros.map((m) => <TablaCalculo key={m.id} m={m} p={p} />)}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

function TarjetaMuro({ m, p, onCambio, onQuitar }: { m: Muro; p: Parametros; onCambio: (c: Partial<Muro>) => void; onQuitar?: () => void }) {
  const c = calcularMuro(m, p)
  return (
    <div className="tarjeta-muro">
      <div className="titulo-seccion">
        <input className="nombre-muro" value={m.nombre} onChange={(e) => onCambio({ nombre: e.target.value })} />
        {onQuitar && <button className="chico peligro" onClick={onQuitar}>Quitar</button>}
      </div>
      <div className="rejilla">
        <Etiqueta texto="Largo del muro (m)"><CampoNumero valor={m.largo} escala={100} decimales={3} onCambio={(v) => v && onCambio({ largo: v })} /></Etiqueta>
        <Etiqueta texto="Alto del panel N.B.L (m)"><CampoNumero valor={m.alto} escala={100} decimales={3} onCambio={(v) => v && onCambio({ alto: v })} /></Etiqueta>
        <Etiqueta texto="Número de paneles"><CampoNumero valor={m.paneles} decimales={0} min={1} onCambio={(v) => v && onCambio({ paneles: Math.round(v) })} /></Etiqueta>
        <Etiqueta texto="Espacio de nivelación (m)" ayuda={`Entre ${metros(p.nivelacionMinima)} y ${metros(p.nivelacionMaxima)} m; estándar ${metros(p.nivelacionEstandar)}`}><CampoNumero valor={m.nivelacion} escala={100} decimales={3} onCambio={(v) => v !== null && onCambio({ nivelacion: v })} /></Etiqueta>
        <Etiqueta texto="PTR del cliente a (m)" ayuda="En blanco = alto del panel + nivelación"><CampoNumero valor={m.alturaPTR} escala={100} decimales={3} vacio placeholder={metros(c.nivelAlto)} onCambio={(v) => onCambio({ alturaPTR: v })} /></Etiqueta>
        <Etiqueta texto="Área de guardado">
          <select value={m.guardado} onChange={(e) => onCambio({ guardado: e.target.value as Muro['guardado'] })}>
            <option value="der">A la derecha</option>
            <option value="izq">A la izquierda</option>
          </select>
        </Etiqueta>
        <Etiqueta texto="Cara A da hacia" ayuda="Área o salón que queda del lado de la cara A"><input value={m.areaA} placeholder="Ej. Aula 1" onChange={(e) => onCambio({ areaA: e.target.value })} /></Etiqueta>
        <Etiqueta texto="Cara B da hacia"><input value={m.areaB} placeholder="Ej. Aula 2" onChange={(e) => onCambio({ areaB: e.target.value })} /></Etiqueta>
        <Etiqueta texto="Cara A">
          <select value={m.caraA} onChange={(e) => onCambio({ caraA: e.target.value })}>
            {opcionesMaterial(p, m.caraA)}
          </select>
        </Etiqueta>
        <Etiqueta texto="Cara B">
          <select value={m.caraB} onChange={(e) => onCambio({ caraB: e.target.value })}>
            {opcionesMaterial(p, m.caraB)}
          </select>
        </Etiqueta>
        <Etiqueta texto="Línea">
          <select value={m.linea} onChange={(e) => onCambio({ linea: e.target.value })}>
            {p.lineas.map((l) => <option key={l.linea} value={l.linea}>Línea {l.linea}</option>)}
            {!p.lineas.some((l) => l.linea === m.linea) && <option value={m.linea}>Línea {m.linea} (sin precio)</option>}
          </select>
        </Etiqueta>
        <Etiqueta texto="M² a cobrar" ayuda="En blanco = largo × alto, redondeado hacia arriba"><CampoNumero valor={m.m2Cobrado} vacio placeholder={c.m2Cotizacion.toFixed(2)} onCambio={(v) => onCambio({ m2Cobrado: v })} /></Etiqueta>
      </div>
      <div className="rejilla" style={{ marginTop: 8 }}>
        <Etiqueta texto="Ancho del área de guardado (m)" ayuda={`En blanco = ${p.guardadoPorPanel} cm por panel. Conviene dejar espacio entre el último panel y la unión del riel.`}><CampoNumero valor={m.guardadoAncho} escala={100} decimales={3} vacio placeholder={metros(c.piezas.length * p.guardadoPorPanel)} onCambio={(v) => onCambio({ guardadoAncho: v })} /></Etiqueta>
      </div>
      <div className="tipos-guardado">
        <span>Tipo de almacenamiento</span>
        <div>
          {GUARDADOS.map((src, i) => (
            <button key={i} type="button" className={m.tipoGuardado === i + 1 ? 'activo' : ''} title={`Tipo ${i + 1}`} onClick={() => onCambio({ tipoGuardado: i + 1 })}>
              <img src={src} alt={`Almacenamiento tipo ${i + 1}`} />
            </button>
          ))}
        </div>
      </div>
      <div className="checks">
        <label><input type="checkbox" checked={m.repelente} onChange={(e) => onCambio({ repelente: e.target.checked })} /> Repelente anti manchas</label>
        <label><input type="checkbox" checked={m.instalacion} onChange={(e) => onCambio({ instalacion: e.target.checked })} /> Instalación</label>
        <label><input type="checkbox" checked={m.registro} onChange={(e) => onCambio({ registro: e.target.checked })} /> Registro 80×80</label>
      </div>
      <div className="resultado">
        <span>Modelo <b>{c.modelo ?? 'fuera de ficha'}</b> · <b>{c.piezas.length}</b> paneles de <b>{metros(c.anchoPanel)}</b> m</span>
        <span>{textoDiferencia(c.diferencia)}</span>
        <span>Carga puntual <b>{c.cargaPuntual} kg</b></span>
      </div>
      {c.avisos.map((a) => <div className="aviso" key={a}>{a}</div>)}
      {c.notas.map((a) => <div className="nota-muro" key={a}>{a}</div>)}
    </div>
  )
}

function TablaCalculo({ m, p }: { m: Muro; p: Parametros }) {
  const c = calcularMuro(m, p)
  const filas: [string, string][] = [
    ['Largo del muro', `${m.largo.toFixed(1)} cm`],
    ['Alto del panel (N.B.L)', `${m.alto.toFixed(1)} cm`],
    ['Lengüeta', `${p.lengueta} cm`],
    ['Largo − lengüeta', `${c.anchoUtil.toFixed(1)} cm`],
    ['Número de paneles', String(c.piezas.length)],
    ['Ancho de panel (redondeado)', `${c.anchoPanel} cm`],
    ['Paneles + lengüeta', `${c.total} cm`],
    ['Diferencia', `${c.diferencia.toFixed(1)} cm · ${textoDiferencia(c.diferencia)}`],
    ['Modelo (por altura)', c.modelo ?? 'Fuera de los modelos de la ficha'],
    ['Tipo de almacenamiento', `Tipo ${m.tipoGuardado}`],
    ['Acabado', acabadoLargo(m)],
    ['Peso por panel', `${c.pesoPanel.toFixed(3)} kg (${c.kgM2.toFixed(2)} kg/m²)`],
    ['Peso panel de ajuste', `${c.pesoAjuste.toFixed(3)} kg (+${c.contrapeso} kg de contrapeso)`],
    ['Carga puntual', `${c.cargaPuntual} kg`],
    ['M² del muro', c.m2.toFixed(2)],
    ['M² cotización', `${c.m2Cotizacion.toFixed(2)}${m.m2Cobrado === null ? ` (×${p.factorM2})` : ' (a mano)'}`],
    ['Ancho del área de guardado', `${c.anchoGuardado} cm (${p.guardadoPorPanel} cm por panel)`],
    ['Ancho del riel', `${c.anchoRiel} cm (panel − ${p.distanciaRuedas})`],
    ['Ancho total paneles + herraje', `${c.anchoTotalHerraje} cm`],
    ['Nivel bajo del riel (N.P.T)', `${metros(c.nivelAlto)} m`],
    ['Entrega de este muro', `${c.dias} días hábiles · ${c.semanas} sem.`],
  ]
  return (
    <div className="bloque-calculo">
      <h3>{m.nombre}</h3>
      <table className="tabla compacta">
        <tbody>{filas.map(([a, b]) => <tr key={a}><td>{a}</td><td>{b}</td></tr>)}</tbody>
      </table>
      <table className="tabla compacta">
        <thead><tr><th>#</th><th>Pieza</th><th className="der">Ancho</th><th className="der">Alto</th><th className="der">Peso</th></tr></thead>
        <tbody>
          {c.piezas.map((z, i) => (
            <tr key={i}><td>{i + 1}</td><td>{NOMBRE_PANEL[z.tipo]}</td><td className="der">{metros(z.ancho)}</td><td className="der">{metros(z.alto)}</td><td className="der">{z.peso.toFixed(3)}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function opcionesMaterial(p: Parametros, actual: string) {
  const lista = p.materiales.map((x) => <option key={x.nombre} value={x.nombre}>{x.nombre}</option>)
  if (!p.materiales.some((x) => x.nombre === actual)) lista.push(<option key={actual} value={actual}>{actual} (sin peso)</option>)
  return lista
}

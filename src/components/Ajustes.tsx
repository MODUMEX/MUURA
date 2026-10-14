import { useState } from 'react'
import { guardarParametrosNube } from '../nube'
import { PARAMETROS_BASE } from '../parametros'
import type { Parametros } from '../types'
import { CampoNumero, Etiqueta } from './Campo'

type Numerico = { [K in keyof Parametros]: Parametros[K] extends number ? K : never }[keyof Parametros]

const TECNICOS: [Numerico, string, string?][] = [
  ['lengueta', 'Lengüeta (cm)'],
  ['anchoMinimo', 'Ancho mínimo de panel (cm)', 'Ficha técnica Línea A: 70'],
  ['anchoMaximo', 'Ancho máximo normal de panel (cm)', 'Ficha técnica Línea A: 120'],
  ['anchoExtendido', 'Ancho máximo extendido (cm)', 'Por modulación se ha llegado a 123'],
  ['pesoExtraAjuste', 'Contrapeso si el material no tiene uno (kg)'],
  ['guardadoPorPanel', 'Área de guardado por panel (cm)'],
  ['distanciaRuedas', 'Distancia de ruedas (cm)', 'Ancho del riel = ancho del panel − esto'],
  ['holguraHerraje', 'Holgura panel + herraje (cm)'],
  ['nivelacionMinima', 'Espacio de nivelación mínimo (cm)'],
  ['nivelacionMaxima', 'Espacio de nivelación máximo (cm)'],
  ['nivelacionEstandar', 'Espacio de nivelación estándar (cm)', 'Es el que se pide en el plano'],
  ['espesorPanel', 'Espesor del panel en el dibujo (cm)'],
  ['panelesPorDia', 'Paneles fabricados por día hábil'],
]

const COTIZACION: [Numerico, string, string?][] = [
  ['factorM2', 'Factor de m² a cobrar', '1 = largo × alto redondeado hacia arriba, como las cotizaciones'],
  ['repelentePieza', 'Repelente anti manchas ($ por pieza)'],
  ['fleteBase', 'Flete especial por defecto ($)'],
  ['iva', 'IVA', '0.16 = 16%'],
  ['kgM2Embarque', 'Peso de embarque (kg/m²)'],
  ['kgTarima', 'Peso por tarima (kg)'],
  ['kgModulo', 'Peso por módulo (kg)'],
]

export function Ajustes({ p, onGuardar }: { p: Parametros; onGuardar: (p: Parametros) => void }) {
  const [x, setX] = useState(p)
  const [msg, setMsg] = useState('')
  const set = <K extends keyof Parametros>(k: K, v: Parametros[K]) => { setX((a) => ({ ...a, [k]: v })); setMsg('') }

  const guardar = async () => {
    if (!confirm('Esto cambia el cálculo y los precios de TODOS los proyectos. ¿Guardar?')) return
    const limpio = { ...x, notasGenerales: x.notasGenerales.filter((s) => s.trim()), requerimientosObra: x.requerimientosObra.filter((s) => s.trim()) }
    try {
      setMsg('Guardando…')
      await guardarParametrosNube(limpio)
      setX(limpio)
      onGuardar(limpio)
      setMsg('Guardado para todos')
    } catch (e) {
      setMsg((e as Error).message)
    }
  }

  const lista = (campos: [Numerico, string, string?][]) => (
    <div className="rejilla">
      {campos.map(([k, t, a]) => (
        <Etiqueta key={k} texto={t} ayuda={a}>
          <CampoNumero valor={x[k]} decimales={4} min={0} onCambio={(v) => v !== null && set(k, v)} />
        </Etiqueta>
      ))}
    </div>
  )

  return (
    <div className="pagina angosta">
      <div className="titulo-seccion">
        <h2>Precios y parámetros</h2>
        <span className="estado">{msg}</span>
        <button className="secundario" onClick={() => { setX(PARAMETROS_BASE); setMsg('Valores del Excel cargados, falta guardar') }}>Volver a los del Excel</button>
        <button onClick={() => void guardar()}>Guardar</button>
      </div>

      <section>
        <div className="titulo-seccion">
          <h3>Precio del m² por línea</h3>
          <button className="chico" onClick={() => set('lineas', [...x.lineas, { linea: '', precioM2: 0, precioUSD: null }])}>+ Línea</button>
        </div>
        <table className="tabla compacta">
          <thead><tr><th>Línea</th><th className="der">MXN por m²</th><th className="der">USD por m²</th><th /></tr></thead>
          <tbody>
            {x.lineas.map((l, i) => (
              <tr key={i}>
                <td><input value={l.linea} onChange={(e) => set('lineas', x.lineas.map((y, j) => (j === i ? { ...y, linea: e.target.value.toUpperCase() } : y)))} /></td>
                <td className="der"><CampoNumero valor={l.precioM2} min={0} onCambio={(v) => v !== null && set('lineas', x.lineas.map((y, j) => (j === i ? { ...y, precioM2: v } : y)))} /></td>
                <td className="der"><CampoNumero valor={l.precioUSD} vacio min={0} placeholder={x.tipoCambio ? (l.precioM2 / x.tipoCambio).toFixed(2) : 'Con tipo de cambio'} onCambio={(v) => set('lineas', x.lineas.map((y, j) => (j === i ? { ...y, precioUSD: v } : y)))} /></td>
                <td><button className="chico peligro" onClick={() => set('lineas', x.lineas.filter((_, j) => j !== i))}>Quitar</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="rejilla" style={{ marginTop: 10 }}>
          <Etiqueta texto="Tipo de cambio por defecto (MXN por USD)" ayuda="Se usa cuando una línea no tiene precio en dólares. Cada proyecto lo puede cambiar.">
            <CampoNumero valor={x.tipoCambio} vacio min={0} decimales={4} onCambio={(v) => set('tipoCambio', v)} />
          </Etiqueta>
        </div>
        <p className="nota">Si la línea tiene precio en USD se usa ese; si no, el precio en pesos entre el tipo de cambio.</p>
      </section>

      <section>
        <div className="titulo-seccion">
          <h3>Materiales de las caras</h3>
          <button className="chico" onClick={() => set('materiales', [...x.materiales, { nombre: '', kgM2: 0, contrapeso: 25, color: '#999999' }])}>+ Material</button>
        </div>
        <table className="tabla compacta">
          <thead><tr><th>Material</th><th className="der">Peso del panel (kg/m²)</th><th className="der">Contrapeso del ajuste (kg)</th><th>Color en el plano</th><th /></tr></thead>
          <tbody>
            {x.materiales.map((t, i) => (
              <tr key={i}>
                <td><input value={t.nombre} onChange={(e) => set('materiales', x.materiales.map((y, j) => (j === i ? { ...y, nombre: e.target.value.toUpperCase() } : y)))} /></td>
                <td className="der"><CampoNumero valor={t.kgM2} min={0} onCambio={(v) => v !== null && set('materiales', x.materiales.map((y, j) => (j === i ? { ...y, kgM2: v } : y)))} /></td>
                <td className="der"><CampoNumero valor={t.contrapeso} min={0} onCambio={(v) => v !== null && set('materiales', x.materiales.map((y, j) => (j === i ? { ...y, contrapeso: v } : y)))} /></td>
                <td><input type="color" value={t.color} onChange={(e) => set('materiales', x.materiales.map((y, j) => (j === i ? { ...y, color: e.target.value } : y)))} /></td>
                <td><button className="chico peligro" onClick={() => set('materiales', x.materiales.filter((_, j) => j !== i))}>Quitar</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="nota">Si las caras son de material distinto, se usa el peso y el contrapeso de la cara más pesada. El contrapeso compensa el peso de la lengüeta: a más peso, más contrapeso.</p>
      </section>

      <section>
        <div className="titulo-seccion">
          <h3>Instalación por alto del panel</h3>
          <button className="chico" onClick={() => set('instalacion', [...x.instalacion, { hastaM: 0, precio: 0, codigo: '', concepto: '', descripcion: '' }])}>+ Rango</button>
        </div>
        <table className="tabla compacta">
          <thead><tr><th>Código</th><th className="der">Hasta (m)</th><th className="der">Precio sugerido ($)</th><th>Concepto y descripción</th><th /></tr></thead>
          <tbody>
            {x.instalacion.map((t, i) => {
              const cambiar = (c: Partial<typeof t>) => set('instalacion', x.instalacion.map((y, j) => (j === i ? { ...y, ...c } : y)))
              return (
                <tr key={i}>
                  <td style={{ width: 90 }}><input value={t.codigo} onChange={(e) => cambiar({ codigo: e.target.value })} /></td>
                  <td className="der" style={{ width: 90 }}><CampoNumero valor={t.hastaM} min={0} onCambio={(v) => v !== null && cambiar({ hastaM: v })} /></td>
                  <td className="der" style={{ width: 120 }}><CampoNumero valor={t.precio} min={0} onCambio={(v) => v !== null && cambiar({ precio: v })} /></td>
                  <td>
                    <input value={t.concepto} onChange={(e) => cambiar({ concepto: e.target.value })} />
                    <textarea rows={2} value={t.descripcion} onChange={(e) => cambiar({ descripcion: e.target.value })} />
                  </td>
                  <td><button className="chico peligro" onClick={() => set('instalacion', x.instalacion.filter((_, j) => j !== i))}>Quitar</button></td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <p className="nota">El precio se puede cambiar en cada proyecto (el flete y la instalación varían según la obra).</p>
      </section>

      <section>
        <h3>Cálculo del muro</h3>
        {lista(TECNICOS)}
      </section>

      <section>
        <h3>Cotización y embarque</h3>
        {lista(COTIZACION)}
      </section>

      <section>
        <h3>Notas de la cotización</h3>
        <Etiqueta texto="Notas generales (una por renglón; {semanas} se reemplaza solo)">
          <textarea rows={5} value={x.notasGenerales.join('\n')} onChange={(e) => set('notasGenerales', e.target.value.split('\n'))} />
        </Etiqueta>
        <Etiqueta texto="Requerimientos a pie de obra (uno por renglón)">
          <textarea rows={6} value={x.requerimientosObra.join('\n')} onChange={(e) => set('requerimientosObra', e.target.value.split('\n'))} />
        </Etiqueta>
        <Etiqueta texto="Condiciones de pago">
          <textarea rows={2} value={x.condicionesPago} onChange={(e) => set('condicionesPago', e.target.value)} />
        </Etiqueta>
      </section>
    </div>
  )
}

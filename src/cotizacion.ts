import { acabadoLargo, calcularMuro, resumenProyecto } from './calculo'
import type { Moneda, Muro, Parametros, PrecioLinea, Proyecto, TramoInstalacion } from './types'

export interface Partida {
  codigo: string
  concepto: string
  descripcion: string
  cantidad: number
  unidad: string
  precio: number
  importe: number
  falta?: string
}

export interface Seccion {
  titulo: string
  partidas: Partida[]
  subtotal: number
}

export interface Cotizacion {
  secciones: Seccion[]
  partidas: Partida[]
  subtotal: number
  iva: number
  total: number
  semanas: number
  entrega: string
  moneda: Moneda
  tipoCambio: number | null
  faltantes: string[]
}

const r2 = (v: number) => Math.round(v * 100) / 100
const m = (cm: number) => (cm / 100).toFixed(2)
const dos = (n: number) => String(n).padStart(2, '0')

export function tramoInstalacion(alto: number, p: Parametros): TramoInstalacion | null {
  const tramos = [...p.instalacion].sort((a, b) => a.hastaM - b.hastaM)
  return tramos.find((t) => alto / 100 <= t.hastaM + 1e-9) ?? null
}

export function descripcionMuro(mu: Muro, p: Parametros): string {
  const c = calcularMuro(mu, p)
  const centrales = c.piezas.length - 1
  const partes: string[] = []
  if (centrales > 0) partes.push(`${dos(centrales)} PANELES CENTRALES CON MEDIDA DE ${m(c.anchoPanel)} MT X ${m(mu.alto)} MT`)
  partes.push(`01 PANEL DE AJUSTE CON MEDIDA DE ${m(c.anchoPanel)} MT + ${p.lengueta} CM X ${m(mu.alto)} MT`)
  return (
    `PARA FORMAR MURO SONOAISLANTE CON MEDIDA DE ${m(mu.largo)} MT DE LARGO POR ${m(mu.alto)} MT DE ALTO, ` +
    `(CONFORMADO POR ${partes.join(' Y ')}) CON INTERIOR DE FIBRA DE VIDRIO DE 3.5", ACABADO EN ${acabadoLargo(mu)} ` +
    `(COLOR DE LÍNEA A ELEGIR), MASCARONES PERIMETRALES DE ALUMINIO ANODIZADO NATURAL`
  )
}

export function tipoCambio(pr: Proyecto, p: Parametros): number | null {
  const tc = pr.tipoCambio ?? p.tipoCambio
  return tc && tc > 0 ? tc : null
}

export function convertir(mxn: number, pr: Proyecto, p: Parametros): number | null {
  if (pr.moneda === 'MXN') return mxn
  const tc = tipoCambio(pr, p)
  return tc ? r2(mxn / tc) : null
}

export function precioDeLinea(l: PrecioLinea, pr: Proyecto, p: Parametros): number | null {
  if (pr.moneda === 'USD' && l.precioUSD !== null && l.precioUSD > 0) return l.precioUSD
  return convertir(l.precioM2, pr, p)
}

export function textoSemanas(s: number): string {
  return `${s} ${s === 1 ? 'SEMANA' : 'SEMANAS'}`
}

export function cotizar(pr: Proyecto, p: Parametros): Cotizacion {
  const secciones: Seccion[] = []
  const faltantes: string[] = []
  for (const mu of pr.muros) {
    const c = calcularMuro(mu, p)
    const linea = p.lineas.find((l) => l.linea === mu.linea)
    const enMoneda = linea ? precioDeLinea(linea, pr, p) : null
    const precio = enMoneda ?? 0
    const falta = !linea || linea.precioM2 <= 0
      ? `${mu.nombre}: la línea "${mu.linea}" no tiene precio (se carga en Precios y parámetros)`
      : enMoneda === null
        ? `${mu.nombre}: la línea "${mu.linea}" no tiene precio en dólares y falta el tipo de cambio`
        : undefined
    if (falta) faltantes.push(falta)
    const partidas: Partida[] = [
      {
        codigo: 'MM-M2',
        concepto: `M2 DE PANEL MÓVIL LÍNEA "${mu.linea}"`,
        descripcion: descripcionMuro(mu, p),
        cantidad: c.m2Cotizacion,
        unidad: 'M2',
        precio,
        importe: r2(c.m2Cotizacion * precio),
        falta,
      },
    ]
    const repelente = convertir(p.repelentePieza, pr, p)
    if (mu.repelente)
      partidas.push({
        codigo: '',
        concepto: 'REPELENTE ANTI MANCHAS',
        descripcion: '',
        cantidad: c.m2,
        unidad: 'Pieza',
        precio: repelente ?? 0,
        importe: r2(c.m2 * (repelente ?? 0)),
        falta: p.repelentePieza <= 0 ? 'El repelente no tiene precio (se carga en Precios y parámetros)' : repelente === null ? 'Falta el tipo de cambio para el repelente' : undefined,
      })
    secciones.push({ titulo: `MURO MOVIL (${mu.nombre.toUpperCase()})`, partidas, subtotal: 0 })
  }

  const servicios: Partida[] = []
  if (pr.flete > 0)
    servicios.push({
      codigo: 'F-1',
      concepto: 'FLETE ESPECIAL',
      descripcion: 'VIAJE TERRESTRES POR AUTOPISTAS (CUANDO APLIQUE), ENTREGA A DOMICILIO, NO INCLUYE MANIOBRAS DE DESCARGA',
      cantidad: 1,
      unidad: 'Servicio',
      precio: pr.flete,
      importe: pr.flete,
    })
  const conInstalacion = pr.muros.filter((x) => x.instalacion)
  if (conInstalacion.length) {
    const alto = Math.max(...conInstalacion.map((x) => x.alto))
    const t = tramoInstalacion(alto, p)
    const sugerido = t ? convertir(t.precio, pr, p) : null
    const precio = pr.instalacion ?? sugerido ?? 0
    const falta = pr.instalacion !== null
      ? undefined
      : !t || t.precio <= 0
        ? `No hay precio de instalación para ${m(alto)} m de alto: escribilo en el proyecto o cargalo en Precios y parámetros`
        : sugerido === null
          ? 'Falta el tipo de cambio para la instalación (o escribí el precio en dólares)'
          : undefined
    if (falta) faltantes.push(falta)
    servicios.push({
      codigo: t?.codigo ?? '',
      concepto: t?.concepto ?? 'INSTALACIÓN DE MUROS MÓVILES',
      descripcion: t?.descripcion ?? 'SERVICIO DE MANO DE OBRA POR LA INSTALACIÓN DE MUROS MOVILES.',
      cantidad: 1,
      unidad: 'Servicio',
      precio,
      importe: precio,
      falta,
    })
  }
  if (servicios.length) secciones.push({ titulo: 'FLETE, INSTALACIÓN Y MANO DE OBRA', partidas: servicios, subtotal: 0 })

  for (const s of secciones) for (const x of s.partidas) if (x.falta && !faltantes.includes(x.falta)) faltantes.push(x.falta)
  for (const s of secciones) s.subtotal = r2(s.partidas.reduce((a, x) => a + x.importe, 0))
  const subtotal = r2(secciones.reduce((a, s) => a + s.subtotal, 0))
  const iva = r2(subtotal * p.iva)
  const semanas = resumenProyecto(pr, p).semanas
  return {
    secciones,
    partidas: secciones.flatMap((s) => s.partidas),
    subtotal,
    iva,
    total: r2(subtotal + iva),
    semanas,
    entrega: pr.entrega.trim() || textoSemanas(semanas),
    moneda: pr.moneda,
    tipoCambio: tipoCambio(pr, p),
    faltantes,
  }
}

export function dinero(v: number, moneda?: Moneda): string {
  return `$ ${v.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${moneda ? ' ' + moneda : ''}`
}

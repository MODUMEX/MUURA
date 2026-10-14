import type { Material, Muro, Parametros, Proyecto } from './types'

export type TipoPanel = 'PLANO' | 'ESTANDAR' | 'AJUSTE'

export interface Pieza {
  tipo: TipoPanel
  ancho: number
  alto: number
  peso: number
}

export interface CalculoMuro {
  anchoUtil: number
  anchoPanel: number
  totalPaneles: number
  total: number
  diferencia: number
  piezas: Pieza[]
  pesoPanel: number
  pesoAjuste: number
  cargaPuntual: number
  kgM2: number
  modelo: string | null
  m2: number
  m2Cotizacion: number
  nivelAlto: number
  alturaPTR: number
  anchoRiel: number
  anchoTotalHerraje: number
  anchoGuardado: number
  dias: number
  semanas: number
  avisos: string[]
  notas: string[]
  contrapeso: number
}

export const NOMBRE_PANEL: Record<TipoPanel, string> = {
  PLANO: 'PANEL - PLANO',
  ESTANDAR: 'PANEL - ESTÁNDAR',
  AJUSTE: 'PANEL - AJUSTE',
}

const r2 = (v: number) => Math.round(v * 100) / 100
const r3 = (v: number) => Math.round(v * 1000) / 1000
const arriba2 = (v: number) => Math.ceil(v * 100 - 1e-6) / 100

export function material(nombre: string, p: Parametros): Material | undefined {
  return p.materiales.find((x) => x.nombre === nombre)
}

export function modeloDeAltura(alto: number, p: Parametros): string | null {
  const exacto = p.modelos.find((x) => alto >= x.desde && alto <= x.hasta)
  if (exacto) return exacto.nombre
  const menor = [...p.modelos].sort((a, b) => a.desde - b.desde)[0]
  if (menor && alto < menor.desde) return `${menor.nombre} ADAPTADO`
  return null
}

export function caraPesada(m: Muro, p: Parametros): Material | undefined {
  const a = material(m.caraA, p)
  const b = material(m.caraB, p)
  if (!a || !b) return a ?? b
  if (a.kgM2 !== b.kgM2) return a.kgM2 > b.kgM2 ? a : b
  return a.contrapeso >= b.contrapeso ? a : b
}

export function kgM2Muro(m: Muro, p: Parametros): number {
  return caraPesada(m, p)?.kgM2 ?? 0
}

export function acabadoCorto(m: Muro): string {
  return m.caraA === m.caraB ? m.caraA : `${m.caraA} / ${m.caraB}`
}

export function acabadoLargo(m: Muro): string {
  return m.caraA === m.caraB ? `${m.caraA} POR AMBOS LADOS` : `${m.caraA} POR UN LADO Y ${m.caraB} POR EL OTRO`
}

export function tiposDePanel(n: number): TipoPanel[] {
  if (n <= 0) return []
  if (n === 1) return ['AJUSTE']
  return ['PLANO', ...Array<TipoPanel>(n - 2).fill('ESTANDAR'), 'AJUSTE']
}

export function calcularMuro(m: Muro, p: Parametros): CalculoMuro {
  const n = Math.max(0, Math.floor(m.paneles))
  const avisos: string[] = []
  const notas: string[] = []
  const anchoUtil = m.largo - p.lengueta
  const anchoPanel = n > 0 ? Math.round(anchoUtil / n) : 0
  const totalPaneles = anchoPanel * n
  const total = totalPaneles + p.lengueta
  const diferencia = r2(m.largo - total)
  const kgM2 = kgM2Muro(m, p)
  const pesoPanel = r3((anchoPanel / 100) * (m.alto / 100) * kgM2)
  const contrapeso = caraPesada(m, p)?.contrapeso ?? p.pesoExtraAjuste
  const pesoAjuste = r3(pesoPanel + contrapeso)
  const piezas: Pieza[] = tiposDePanel(n).map((tipo) => ({
    tipo,
    ancho: anchoPanel,
    alto: m.alto,
    peso: tipo === 'AJUSTE' ? pesoAjuste : pesoPanel,
  }))
  const cargaPuntual = Math.round(pesoPanel) * n + (n > 0 ? contrapeso : 0)
  const m2Exacto = (m.largo / 100) * (m.alto / 100)
  const m2 = r2(m2Exacto)
  const m2Cotizacion = m.m2Cobrado ?? arriba2(m2Exacto * p.factorM2)
  const nivelAlto = m.alto + m.nivelacion
  const alturaPTR = m.alturaPTR ?? nivelAlto
  const anchoGuardado = m.guardadoAncho ?? n * p.guardadoPorPanel
  const dias = Math.ceil(n / Math.max(1, p.panelesPorDia))
  const semanas = Math.ceil(dias / 5)

  if (!material(m.caraA, p) || !material(m.caraB, p)) avisos.push('Falta el peso de uno de los materiales de las caras.')
  const modelo = modeloDeAltura(m.alto, p)
  if (n > 0 && anchoPanel > p.anchoExtendido) avisos.push(`El panel queda de ${anchoPanel} cm; el máximo es ${p.anchoExtendido}. Poné más paneles.`)
  else if (n > 0 && anchoPanel > p.anchoMaximo) notas.push(`Panel de ${anchoPanel} cm: pasa de ${p.anchoMaximo} (rango normal), se acepta hasta ${p.anchoExtendido}.`)
  if (n > 0 && anchoPanel < p.anchoMinimo) avisos.push(`El panel queda de ${anchoPanel} cm; la ficha pide mínimo ${p.anchoMinimo}. Poné menos paneles.`)
  if (!modelo) avisos.push(`La altura de ${(m.alto / 100).toFixed(2)} m pasa del modelo más alto de la ficha (${p.modelos.map((x) => x.nombre).join(', ')}).`)
  if (n < 1) avisos.push('El muro necesita al menos 1 panel.')
  if (m.largo <= p.lengueta) avisos.push(`El largo tiene que ser mayor que la lengüeta (${p.lengueta} cm).`)
  if (m.nivelacion < p.nivelacionMinima || m.nivelacion > p.nivelacionMaxima)
    avisos.push(`El espacio de nivelación es ${m.nivelacion} cm; tiene que estar entre ${p.nivelacionMinima} y ${p.nivelacionMaxima} cm (estándar ${p.nivelacionEstandar}).`)
  if (alturaPTR < nivelAlto)
    avisos.push(`El PTR del cliente (${(alturaPTR / 100).toFixed(2)} m) queda más bajo que el riel (${(nivelAlto / 100).toFixed(2)} m).`)

  return {
    anchoUtil,
    anchoPanel,
    totalPaneles,
    total,
    diferencia,
    piezas,
    pesoPanel,
    pesoAjuste,
    cargaPuntual,
    kgM2,
    modelo,
    contrapeso,
    notas,
    m2,
    m2Cotizacion,
    nivelAlto,
    alturaPTR,
    anchoRiel: anchoPanel - p.distanciaRuedas,
    anchoTotalHerraje: anchoPanel + p.holguraHerraje,
    anchoGuardado,
    dias,
    semanas,
    avisos,
  }
}

export function textoDiferencia(dif: number): string {
  if (dif === 0) return 'Cierra exacto con la lengüeta'
  if (dif < 0) return `${Math.abs(dif).toFixed(1)} cm que se mete el panel a la lengüeta`
  return `${dif.toFixed(1)} cm que faltan para llegar a la lengüeta`
}

export interface ResumenProyecto {
  paneles: number
  dias: number
  semanas: number
  m2: number
  m2Cotizacion: number
  pesoEmbarque: number
}

export function resumenProyecto(pr: Proyecto, p: Parametros): ResumenProyecto {
  const calc = pr.muros.map((m) => calcularMuro(m, p))
  const paneles = pr.muros.reduce((s, m) => s + Math.max(0, Math.floor(m.paneles)), 0)
  const dias = Math.ceil(paneles / Math.max(1, p.panelesPorDia))
  const m2Cotizacion = r2(calc.reduce((s, c) => s + c.m2Cotizacion, 0))
  return {
    paneles,
    dias,
    semanas: Math.ceil(dias / 5),
    m2: r2(calc.reduce((s, c) => s + c.m2, 0)),
    m2Cotizacion,
    pesoEmbarque: Math.round(m2Cotizacion * p.kgM2Embarque + pr.tarimas * p.kgTarima + pr.modulos * p.kgModulo),
  }
}

export function metros(cm: number, dec = 2): string {
  return (cm / 100).toFixed(dec)
}

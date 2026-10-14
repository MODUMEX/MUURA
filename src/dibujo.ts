import { calcularMuro, material, metros, NOMBRE_PANEL, type CalculoMuro, type TipoPanel } from './calculo'
import type { Muro, Parametros } from './types'

export type Relleno = 'muro' | 'panel' | 'guardado' | 'riel' | 'ptr' | 'losa' | 'lengueta' | 'lenguetaC' | 'blanco' | 'nucleo'
export type Trazo = 'grueso' | 'fino' | 'punteado' | 'ninguno'
export type Color = 'negro' | 'azul' | 'rojo' | 'gris'

export type Figura =
  | { t: 'rect'; x: number; y: number; w: number; h: number; relleno?: Relleno; trazo?: Trazo; tinte?: string }
  | { t: 'linea'; x1: number; y1: number; x2: number; y2: number; trazo?: Trazo; color?: Color }
  | { t: 'texto'; x: number; y: number; s: string[]; tam: number; ancla?: 'start' | 'middle' | 'end'; color?: Color; negrita?: boolean; dy?: number; dx?: number; rot?: number }
  | { t: 'cota'; x1: number; y1: number; x2: number; y2: number; off: number; texto: string; titulo?: string }
  | { t: 'nota'; x: number; y: number; dx: number; dy: number; s: string[]; color?: Color }
  | { t: 'nivel'; x: number; y: number; dx: number; texto: string }

export interface Caja { x0: number; y0: number; x1: number; y1: number }

export interface Vista {
  figuras: Figura[]
  caja: Caja
  margen: { arriba: number; abajo: number; izq: number; der: number }
}

export interface Encaje { k: number; ox: number; oy: number }

export interface Marco { x: number; y: number; w: number; h: number }

export const COLORES: Record<Color, string> = {
  negro: '#111111',
  azul: '#1f3fbf',
  rojo: '#e0201b',
  gris: '#6b6b6b',
}

export const RELLENOS: Record<Relleno, { fondo: string; raya?: string; paso?: number }> = {
  muro: { fondo: '#bdbdbd' },
  panel: { fondo: '#fbe7c6', raya: '#e59a3a', paso: 2.2 },
  guardado: { fondo: '#f2f2f2', raya: '#a8a8a8', paso: 1.6 },
  riel: { fondo: '#3b5bdb' },
  ptr: { fondo: '#5c5c5c' },
  losa: { fondo: '#d9d9d9', raya: '#8a8a8a', paso: 1.2 },
  lengueta: { fondo: '#ffffff' },
  lenguetaC: { fondo: '#dfe5ff', raya: '#3b5bdb', paso: 1 },
  nucleo: { fondo: '#f4f4f4' },
  blanco: { fondo: '#ffffff' },
}

export function encajar(v: Vista, m: Marco, kMax = Infinity): Encaje {
  const bw = Math.max(1, v.caja.x1 - v.caja.x0)
  const bh = Math.max(1, v.caja.y1 - v.caja.y0)
  const aw = m.w - v.margen.izq - v.margen.der
  const ah = m.h - v.margen.arriba - v.margen.abajo
  const k = Math.min(aw / bw, ah / bh, kMax)
  const ox = m.x + v.margen.izq + (aw - bw * k) / 2 - v.caja.x0 * k
  const oy = m.y + v.margen.arriba + (ah - bh * k) / 2 - v.caja.y0 * k
  return { k, ox, oy }
}

export function escalaTexto(k: number): string {
  return `1 : ${Math.round(10 / k)}`
}

export function rayado(x: number, y: number, w: number, h: number, paso: number): [number, number, number, number][] {
  const seg: [number, number, number, number][] = []
  if (w <= 0 || h <= 0) return seg
  for (let c = -h + paso / 2; c < w; c += paso) {
    let ax = x + c, ay = y + h
    let bx = x + c + h, by = y
    if (ax < x) { ay -= x - ax; ax = x }
    if (bx > x + w) { by += bx - (x + w); bx = x + w }
    if (ay - by > 0.01) seg.push([ax, ay, bx, by])
  }
  return seg
}

const TEXTO_PANEL: Record<TipoPanel, string> = {
  PLANO: 'PANEL - PLANO',
  ESTANDAR: 'PANEL - ESTÁNDAR',
  AJUSTE: 'PANEL - AJUSTE',
}

interface Tramo { x: number; w: number; tipo: TipoPanel }
interface Disposicion { paneles: Tramo[]; lengueta: { x: number; w: number } }

function disposicion(m: Muro, c: CalculoMuro, p: Parametros): Disposicion {
  const der = m.guardado === 'der'
  const lg = Math.min(p.lengueta, m.largo)
  let x = 0
  const paneles = c.piezas.map((pz) => {
    const t = { x: der ? x : m.largo - x - pz.ancho, w: pz.ancho, tipo: pz.tipo }
    x += pz.ancho
    return t
  })
  return { paneles, lengueta: { x: der ? m.largo - lg : 0, w: lg } }
}

function tinte(nombre: string, p: Parametros): string {
  return material(nombre, p)?.color ?? '#e59a3a'
}

export function textoAcabado(m: Muro): string[] {
  if (m.caraA !== m.caraB) return [`CARA A: ${m.caraA}`, `CARA B: ${m.caraB}`]
  return [m.caraA === 'TELA' ? 'TAPIZADO EN TELA' : m.caraA, 'POR AMBOS', 'LADOS']
}

export function vistaPlanta(m: Muro, p: Parametros): Vista {
  const c = calcularMuro(m, p)
  const d = disposicion(m, c, p)
  const L = m.largo
  const e = p.espesorPanel
  const cara = 2
  const f: Figura[] = []
  const H = c.anchoPanel
  const alto = Math.max(m.registro ? 45 : 25, H / 2 + 6)
  f.push({ t: 'rect', x: -12, y: -alto, w: 12, h: alto * 2, relleno: 'muro', trazo: 'fino' })
  f.push({ t: 'rect', x: L, y: -alto, w: 12, h: alto * 2, relleno: 'muro', trazo: 'fino' })
  const der = m.guardado === 'der'
  const g = Math.min(c.anchoGuardado, L)
  const gx = der ? L - g : 0
  const n = c.piezas.length
  f.push({ t: 'rect', x: gx, y: -H / 2, w: g, h: H, relleno: 'blanco', trazo: 'punteado' })
  if (n > 0) {
    const paso = g / n
    const grueso = Math.max(1, Math.min(paso - 1, e))
    for (let i = 0; i < n; i++) f.push({ t: 'rect', x: gx + i * paso + (paso - grueso) / 2, y: -H / 2, w: grueso, h: H, relleno: 'panel', trazo: 'fino', tinte: tinte(m.caraA, p) })
  }
  f.push({ t: 'cota', x1: gx, y1: H / 2, x2: gx + g, y2: H / 2, off: -6, texto: metros(g), titulo: 'ÁREA DE GUARDADO' })
  if (m.registro) {
    const rx = der ? gx - 80 : gx + g
    f.push({ t: 'rect', x: rx, y: -40, w: 80, h: 80, relleno: 'blanco', trazo: 'punteado' })
    f.push({ t: 'texto', x: rx + 40, y: 25, s: ['REGISTRO', 'DESMONTABLE', '0.80 X 0.80'], tam: 1.5, ancla: 'middle', color: 'azul' })
  }
  const yc = -Math.max(m.registro ? 40 : e / 2, H / 2) - 2
  for (const t of d.paneles) {
    f.push({ t: 'rect', x: t.x, y: -e / 2, w: t.w, h: e, relleno: 'nucleo', trazo: 'ninguno' })
    f.push({ t: 'rect', x: t.x, y: -e / 2, w: t.w, h: cara, relleno: 'panel', trazo: 'ninguno', tinte: tinte(m.caraA, p) })
    f.push({ t: 'rect', x: t.x, y: e / 2 - cara, w: t.w, h: cara, relleno: 'panel', trazo: 'ninguno', tinte: tinte(m.caraB, p) })
    f.push({ t: 'rect', x: t.x, y: -e / 2, w: t.w, h: e, trazo: 'grueso' })
    f.push({ t: 'cota', x1: t.x, y1: yc, x2: t.x + t.w, y2: yc, off: 7, texto: metros(t.w), titulo: NOMBRE_PANEL[t.tipo] })
  }
  const lx = d.lengueta.x, lw = d.lengueta.w, ce = 2
  const fondo = der ? lx + lw - ce : lx
  f.push({ t: 'rect', x: fondo, y: -e / 2 - ce, w: ce, h: e + ce * 2, relleno: 'lenguetaC', trazo: 'fino' })
  f.push({ t: 'rect', x: lx, y: -e / 2 - ce, w: lw, h: ce, relleno: 'lenguetaC', trazo: 'fino' })
  f.push({ t: 'rect', x: lx, y: e / 2, w: lw, h: ce, relleno: 'lenguetaC', trazo: 'fino' })
  f.push({ t: 'cota', x1: lx, y1: yc, x2: lx + lw, y2: yc, off: 14, texto: metros(lw), titulo: 'LENGÜETA' })
  const medio = d.paneles[Math.floor(d.paneles.length / 2)]
  if (medio) {
    f.push({ t: 'texto', x: medio.x + medio.w / 2, y: -e / 2, s: [`CARA A: ${m.caraA}${m.areaA ? ' HACIA ' + m.areaA.toUpperCase() : ''}`], tam: 1.8, ancla: 'middle', color: 'gris', dy: -1.4 })
    f.push({ t: 'texto', x: medio.x + medio.w / 2, y: e / 2, s: [`CARA B: ${m.caraB}${m.areaB ? ' HACIA ' + m.areaB.toUpperCase() : ''}`], tam: 1.8, ancla: 'middle', color: 'gris', dy: 2 })
  }
  f.push({ t: 'cota', x1: 0, y1: yc, x2: L, y2: yc, off: 23, texto: metros(L), titulo: 'LONGITUD MURO' })
  return {
    figuras: f,
    caja: { x0: -12, y0: -alto, x1: L + 12, y1: alto },
    margen: { arriba: 30, abajo: 9, izq: 4, der: 4 },
  }
}

export function vistaGuardado(m: Muro, p: Parametros): Vista {
  const c = calcularMuro(m, p)
  const f: Figura[] = []
  const n = c.piezas.length
  const W = c.anchoGuardado
  const paso = n > 0 ? W / n : p.guardadoPorPanel
  const H = c.anchoPanel
  const der = m.guardado === 'der'
  const entrada = m.registro ? 95 : 70
  const xm = der ? W : -14
  f.push({ t: 'rect', x: xm, y: -15, w: 14, h: H + 30, relleno: 'muro', trazo: 'fino' })
  const r0 = H / 2 - 3
  const rx0 = der ? -entrada : 0
  const rx1 = der ? W : W + entrada
  f.push({ t: 'rect', x: rx0, y: r0, w: rx1 - rx0, h: 6, relleno: 'riel', trazo: 'ninguno' })
  for (let i = 0; i < n; i++) {
    const x = i * paso + (paso - Math.min(paso - 1, p.espesorPanel)) / 2
    f.push({ t: 'rect', x, y: 0, w: Math.min(paso - 1, p.espesorPanel), h: H, relleno: 'panel', trazo: 'fino', tinte: tinte(m.caraA, p) })
  }
  const sx = der ? -entrada : W
  for (let i = 0; i <= 4; i++) {
    const x = sx + (entrada / 4) * i
    f.push({ t: 'linea', x1: x, y1: r0 - 5, x2: x, y2: r0 + 11, trazo: 'grueso', color: 'negro' })
  }
  if (m.registro) {
    const rx = der ? -80 : W
    f.push({ t: 'rect', x: rx, y: H / 2 - 40, w: 80, h: 80, trazo: 'punteado' })
    f.push({ t: 'texto', x: rx + 40, y: H / 2 + 28, s: ['REGISTRO', 'DESMONTABLE', '0.80 X 0.80'], tam: 1.5, ancla: 'middle', color: 'azul' })
  }
  f.push({ t: 'cota', x1: 0, y1: 0, x2: W, y2: 0, off: 8, texto: metros(W), titulo: 'ÁREA DE GUARDADO' })
  const xc = der ? W + 14 : -14
  const s = der ? 1 : -1
  f.push({ t: 'cota', x1: xc, y1: H, x2: xc, y2: 0, off: 8 * s, texto: metros(H), titulo: 'ANCHO PANEL' })
  f.push({ t: 'cota', x1: xc, y1: H - p.distanciaRuedas / 2, x2: xc, y2: p.distanciaRuedas / 2, off: 20 * s, texto: metros(c.anchoRiel), titulo: 'ANCHO RIEL' })
  return {
    figuras: f,
    caja: { x0: der ? -entrada : -14, y0: -15, x1: der ? W + 14 : W + entrada, y1: H + 15 },
    margen: { arriba: 16, abajo: 4, izq: der ? 4 : 30, der: der ? 30 : 4 },
  }
}

export function vistaAlzado(m: Muro, p: Parametros): Vista {
  const c = calcularMuro(m, p)
  const L = m.largo
  const A = m.alto
  const N = c.nivelAlto
  const f: Figura[] = []
  const techo = N + 12
  f.push({ t: 'rect', x: -14, y: 8, w: L + 28, h: 8, relleno: 'losa', trazo: 'fino' })
  f.push({ t: 'linea', x1: -14, y1: 8, x2: L + 14, y2: 8, trazo: 'grueso' })
  f.push({ t: 'rect', x: -14, y: -techo, w: 14, h: techo + 8, relleno: 'muro', trazo: 'fino' })
  f.push({ t: 'rect', x: L, y: -techo, w: 14, h: techo + 8, relleno: 'muro', trazo: 'fino' })
  f.push({ t: 'rect', x: 0, y: -N - 10, w: L, h: 10, relleno: 'ptr', trazo: 'fino' })
  f.push({ t: 'rect', x: 0, y: -A - 6, w: L, h: 6, relleno: 'riel', trazo: 'fino' })
  const nEsp = Math.max(2, Math.round(L / 60))
  for (let i = 0; i <= nEsp; i++) {
    const x = 4 + ((L - 8) / nEsp) * i
    f.push({ t: 'linea', x1: x, y1: -N, x2: x, y2: -A - 6, trazo: 'grueso' })
    f.push({ t: 'rect', x: x - 2.5, y: -A - 9, w: 5, h: 3, relleno: 'blanco', trazo: 'fino' })
  }
  const d = disposicion(m, c, p)
  for (const t of d.paneles) {
    f.push({ t: 'rect', x: t.x, y: -A, w: t.w, h: A, relleno: 'panel', trazo: 'grueso', tinte: tinte(m.caraA, p) })
    f.push({ t: 'texto', x: t.x + t.w / 2, y: -A * 0.74, s: textoAcabado(m), tam: 2, ancla: 'middle' })
    f.push({ t: 'texto', x: t.x + t.w / 2, y: -A * 0.24, s: [TEXTO_PANEL[t.tipo]], tam: 2, ancla: 'middle' })
    f.push({ t: 'cota', x1: t.x, y1: 8, x2: t.x + t.w, y2: 8, off: -7, texto: metros(t.w), titulo: 'ANCHO PANEL' })
  }
  const lg = d.lengueta
  f.push({ t: 'rect', x: lg.x, y: -A - 2, w: lg.w, h: A + 4, relleno: 'lenguetaC', trazo: 'fino' })
  f.push({ t: 'texto', x: lg.x + lg.w / 2, y: -A / 2, s: ['LENGÜETA'], tam: 2, ancla: 'middle', color: 'azul', rot: -90 })
  f.push({ t: 'cota', x1: lg.x, y1: 8, x2: lg.x + lg.w, y2: 8, off: -14, texto: metros(lg.w), titulo: 'LENGÜETA' })
  f.push({ t: 'cota', x1: 0, y1: 8, x2: L, y2: 8, off: -24, texto: metros(L), titulo: 'LONGITUD MURO' })
  const xd = L + 14
  f.push({ t: 'cota', x1: xd, y1: 0, x2: xd, y2: -A, off: 6, texto: metros(A) })
  f.push({ t: 'cota', x1: xd, y1: 0, x2: xd, y2: -N, off: 14, texto: metros(N) })
  f.push({ t: 'cota', x1: xd, y1: -A, x2: xd, y2: -N, off: 6, texto: metros(N - A) })
  f.push({ t: 'nivel', x: xd, y: -N, dx: 22, texto: `+${metros(N)} N.P.T` })
  f.push({ t: 'nivel', x: xd, y: -A, dx: 22, texto: `+${metros(A)} N.B.L` })
  f.push({ t: 'nivel', x: xd, y: 0, dx: 22, texto: '+0.00 NPT' })
  f.push({ t: 'nota', x: L * 0.16, y: -N - 5, dx: -18, dy: 3, color: 'azul', s: ['PTR, IPS O IPR SUMINISTRADO', `COLOCADO Y NIVELADO A ${metros(c.alturaPTR)}`, 'MTRS DE NPT A LECHO BAJO DE', 'PTR, IPS O IPR POR CLIENTE EN OBRA'] })
  f.push({ t: 'nota', x: L * 0.4, y: -A - 3, dx: 0, dy: 3, s: ['RIEL DE ALUMINIO', 'ANODIZADO NATURAL Y', 'TEMPLADO SUMINISTRADO', 'POR MUURA'] })
  f.push({ t: 'nota', x: L * 0.62, y: -(A + N) / 2, dx: 0, dy: 3, s: ['SISTEMA DE NIVELACION', 'A BASE DE ESPARRAGO', 'ROSCADO Y PTR', 'CUADRADO POR MUURA'] })
  f.push({ t: 'nota', x: L * 0.86, y: -(A + N) / 2 - 2, dx: 0, dy: 3, s: [`ESPACIO MINIMO DE ${metros(p.nivelacionEstandar)} MTRS`, 'REQUERIDO ENTRE ESTRUCTURA DEL', 'CLIENTE Y LECHO BAJO DE PLAFON', 'PARA COLOCACION DE SISTEMA DE', 'NIVELACIÓN'] })
  return {
    figuras: f,
    caja: { x0: -14, y0: -techo, x1: L + 14, y1: 16 },
    margen: { arriba: 30, abajo: 28, izq: 4, der: 40 },
  }
}

import { DETALLE_PANEL, DETALLE_PROPORCION, ESPARRAGO, ESPARRAGO_PROPORCION, LOGO_MUURA, LOGO_PROPORCION } from './assets/imagenes'
import { GUARDADOS } from './assets/guardados'
import { acabadoCorto, acabadoLargo, calcularMuro, metros, NOMBRE_PANEL } from './calculo'
import { COLORES, encajar, escalaTexto, vistaAlzado, vistaGuardado, vistaPlanta, type Marco, type Vista } from './dibujo'
import { trazarVista, type Lienzo } from './render'
import type { Muro, Parametros, Proyecto } from './types'

export const ANCHO_HOJA = 297
export const ALTO_HOJA = 210

export interface Hoja {
  numero: string
  titulo: string
  dibujar(l: Lienzo): void
}

const NEGRO = COLORES.negro

export function hojasDelProyecto(pr: Proyecto, p: Parametros): Hoja[] {
  const hojas: Hoja[] = []
  let i = 101
  const sig = () => `A-${i++}`
  for (const m of pr.muros) {
    const a = sig()
    hojas.push({ numero: a, titulo: `${m.nombre} · Planta`, dibujar: (l) => { hojaPlanta(l, p, m); cajetin(l, pr, a, m) } })
    const b = sig()
    hojas.push({ numero: b, titulo: `${m.nombre} · Alzado`, dibujar: (l) => { hojaAlzado(l, p, m); cajetin(l, pr, b, m) } })
  }
  if (pr.muros.length) {
    const c = sig()
    hojas.push({ numero: c, titulo: 'Alzado tipo', dibujar: (l) => { hojaDetalle(l, pr, p); cajetin(l, pr, c) } })
  }
  return hojas
}

function vista(l: Lienzo, v: Vista, m: Marco, num: number, titulo: string, kMax?: number): void {
  const e = encajar(v, { ...m, h: m.h - 13 }, kMax)
  trazarVista(v, e, l)
  titulo_(l, m.x + 4, m.y + m.h - 6, num, titulo, escalaTexto(e.k))
}

function titulo_(l: Lienzo, x: number, y: number, num: number, titulo: string, escala?: string): void {
  circulo(l, x + 3, y - 1.4, 3)
  l.texto(x + 3, y + 0.2, String(num), 3.6, NEGRO, 'middle')
  l.texto(x + 8, y + 0.4, titulo, 5, NEGRO, 'start')
  if (escala) l.texto(x + 8, y + 4.6, escala, 2.6, NEGRO, 'start')
}

function circulo(l: Lienzo, cx: number, cy: number, r: number): void {
  const seg = 28
  for (let i = 0; i < seg; i++) {
    const a1 = (i / seg) * Math.PI * 2, a2 = ((i + 1) / seg) * Math.PI * 2
    l.linea(cx + r * Math.cos(a1), cy + r * Math.sin(a1), cx + r * Math.cos(a2), cy + r * Math.sin(a2), NEGRO, 0.2)
  }
}

function marcoPunteado(l: Lienzo, m: Marco): void {
  l.rect(m.x, m.y, m.w, m.h, null, NEGRO, 0.4, true)
}

function hojaPlanta(l: Lienzo, p: Parametros, m: Muro): void {
  const c = calcularMuro(m, p)
  const mp: Marco = { x: 14, y: 13, w: 269, h: 94 }
  marcoPunteado(l, mp)
  vista(l, vistaPlanta(m, p), mp, 1, `PLANO GENERAL - ${m.nombre.toUpperCase()}`)
  const mg: Marco = { x: 14, y: 111, w: 136, h: 66 }
  marcoPunteado(l, mg)
  vista(l, vistaGuardado(m, p), mg, 2, `ÁREA DE GUARDADO (TIPO ${m.tipoGuardado})`, 1.2)
  const fin = tablaPesos(l, 158, 114, m, p)
  l.texto(158, fin + 6, `ACABADO: ${acabadoLargo(m)}`, 2.6, NEGRO, 'start')
  l.texto(158, fin + 11, `PESO X PANEL: ${Math.round(c.pesoPanel)} KG (${c.kgM2.toFixed(2)} KG/M²)`, 2.6, NEGRO, 'start')
  l.texto(158, fin + 17, `CARGA PUNTUAL DE ÁREA DE GUARDADO: ${c.cargaPuntual} KG (${c.piezas.length} PANELES)`, 2.8, COLORES.rojo, 'start')
  c.avisos.forEach((a, i) => l.texto(158, fin + 22 + i * 3.6, `AVISO: ${a}`, 2.2, COLORES.rojo, 'start'))
  const img = GUARDADOS[m.tipoGuardado - 1]
  if (img) {
    l.imagen(img, 255, fin + 2, 28, 28 * (136 / 175))
    l.texto(269, fin + 2 + 28 * (136 / 175) + 3, `ALMACENAMIENTO TIPO ${m.tipoGuardado}`, 1.7, NEGRO, 'middle')
  }
}

function tablaPesos(l: Lienzo, x: number, y: number, m: Muro, p: Parametros): number {
  const c = calcularMuro(m, p)
  const cols = [16, 36, 24, 24, 25]
  const w = cols.reduce((s, v) => s + v, 0)
  const h = 5
  l.rect(x, y, w, h, '#f1f1f1', NEGRO, 0.2)
  l.texto(x + w / 2, y + 3.6, `MURO MOVIL${c.modelo ? ' ' + c.modelo : ''} (L=${metros(m.largo)} X H=${metros(m.alto)})`, 2.8, NEGRO, 'middle', true)
  fila(l, x, y + h, cols, ['Recuento', 'TIPO PANEL', 'ANCHO_PANEL', 'ALTURA_PANEL', 'PESO X PANEL'], 2.1)
  const cuenta = (t: string) => c.piezas.filter((z) => z.tipo === t).length
  const filas: string[][] = []
  if (cuenta('AJUSTE')) filas.push([String(cuenta('AJUSTE')), NOMBRE_PANEL.AJUSTE, metros(c.anchoPanel, 3), metros(m.alto, 3), `${Math.round(c.pesoAjuste)} KG`])
  if (cuenta('ESTANDAR')) filas.push([String(cuenta('ESTANDAR')), NOMBRE_PANEL.ESTANDAR, metros(c.anchoPanel, 3), metros(m.alto, 3), `${Math.round(c.pesoPanel)} KG`])
  if (cuenta('PLANO')) filas.push([String(cuenta('PLANO')), NOMBRE_PANEL.PLANO, metros(c.anchoPanel, 3), metros(m.alto, 3), `${Math.round(c.pesoPanel)} KG`])
  filas.push(['1', 'LENGÜETA', metros(p.lengueta, 3), metros(m.alto, 3), ''])
  filas.forEach((f, i) => fila(l, x, y + h + 4.2 + i * 4.2, cols, f, 2.3))
  const fy = y + h + 4.2 * (filas.length + 1)
  l.rect(x, fy, w, 4.2, null, NEGRO, 0.15)
  l.texto(x + 1.5, fy + 3, `Paneles Totales: ${c.piezas.length}`, 2.3, NEGRO, 'start')
  return fy + 4.2
}

function fila(l: Lienzo, x: number, y: number, cols: number[], vals: string[], tam: number, h = 4.2): void {
  let cx = x
  cols.forEach((w, i) => {
    l.rect(cx, y, w, h, null, NEGRO, 0.15)
    l.texto(cx + w / 2, y + h / 2 + tam * 0.35, vals[i] ?? '', tam, NEGRO, 'middle')
    cx += w
  })
}

function hojaAlzado(l: Lienzo, p: Parametros, m: Muro): void {
  const c = calcularMuro(m, p)
  const ma: Marco = { x: 14, y: 13, w: 269, h: 164 }
  vista(l, vistaAlzado(m, p), ma, 3, `ALZADO MURO - ${m.nombre.toUpperCase()}`)
  l.texto(ma.x + ma.w - 4, ma.y + ma.h - 4, `CARGA PUNTUAL DE ÁREA DE GUARDADO: ${c.cargaPuntual} KG`, 3, COLORES.rojo, 'end')
}

function hojaDetalle(l: Lienzo, pr: Proyecto, p: Parametros): void {
  const altura = Math.max(...pr.muros.map((m) => calcularMuro(m, p).alturaPTR))
  const h = 158
  const w = h * DETALLE_PROPORCION
  const x = 26, y = 14
  l.imagen(DETALLE_PANEL, x, y, w, h)
  const s = h / 806
  const tx = x + w + 1.5
  const etiquetas: [number, string[], boolean?][] = [
    [22, ['TRABE DE CONCRETO', 'EXISTENTE EN OBRA']],
    [122, ['PTR, IPS O IPR SUMINISTRADO', `COLOCADO Y NIVELADO A ${metros(altura)}`, 'MTRS DE NPT A LECHO BAJO', 'DE PTR, IPS O IPR POR CLIENTE', 'EN OBRA SUJETO A TECHUMBRE'], true],
    [252, ['SISTEMA DE NIVELACION', 'A BASE DE ESPARRAGO', 'Y PTR CUADRADO POR', 'MUURA.']],
    [362, ['RIEL DE ALUMINIO ANODIZADO', 'NATURAL Y TEMPLADO', 'SUMINISTRADO POR MUURA.']],
    [468, ['PLAFON COLOCADO SOBRE', 'PESTAÑA DE RIEL DE ALUMINIO', 'POR PARTE DEL CLIENTE.']],
    [557, ['PANEL.']],
    [632, ['LENGUETA TELESCOPICA', 'EN LA PARTE INFERIOR Y', 'SUPERIOR.']],
    [728, ['ZOCLO Y GUARDAPOLVO', 'FEXIBLE DE ALTA RESISTENCIA.']],
  ]
  for (const [py, lineas, azul] of etiquetas) {
    const lh = 3.3
    const y0 = y + py * s - ((lineas.length - 1) * lh) / 2 + 1
    lineas.forEach((t, i) => l.texto(tx, y0 + i * lh, t, 2.7, azul ? COLORES.azul : NEGRO, 'start'))
  }
  const ew = 62
  l.texto(200 + ew / 2, 40, 'ESPARRAGOS', 3, NEGRO, 'middle')
  l.imagen(ESPARRAGO, 200, 44, ew, ew / ESPARRAGO_PROPORCION)
  l.texto(x, y + h + 6, 'ALZADO TIPO - PANEL', 3, NEGRO, 'start')
}

function cajetin(l: Lienzo, pr: Proyecto, numero: string, muro?: Muro): void {
  const X0 = 10, X1 = 287, Y0 = 8, Y1 = 202
  l.rect(X0, Y0, X1 - X0, Y1 - Y0, null, NEGRO, 0.5)
  const y = 181
  const h = Y1 - y
  l.rect(X0, y, X1 - X0, h, '#ffffff', NEGRO, 0.35)
  const col = [X0, 58, 106, 186, 216, 246, X1]
  for (const cx of col.slice(1, -1)) l.linea(cx, y, cx, Y1, NEGRO, 0.25)
  const mitad = y + h / 2
  for (let i = 0; i < 2; i++) l.linea(col[i], mitad, col[i + 1], mitad, NEGRO, 0.2)
  l.linea(col[4], mitad, col[5], mitad, NEGRO, 0.2)
  rotulo(l, col[0], y, 'NOMBRE DEL DESARROLLO:', pr.desarrollo)
  rotulo(l, col[0], mitad, 'CLIENTE:', pr.cliente)
  rotulo(l, col[1], y, 'DIRECCIÓN:', pr.direccion)
  const acabado = muro ? acabadoCorto(muro) : [...new Set(pr.muros.map(acabadoCorto))].join(', ')
  const medio = (col[1] + col[2]) / 2
  l.linea(medio, mitad, medio, Y1, NEGRO, 0.2)
  rotulo(l, col[1], mitad, 'ACABADO:', acabado, 15)
  rotulo(l, medio, mitad, 'COLOR:', pr.color || 'S/E', 15)
  const revs = pr.revisiones.slice(-3)
  const rh = h / 3
  for (let i = 0; i < 3; i++) {
    const ry = y + i * rh
    if (i) l.linea(col[2], ry, col[3], ry, NEGRO, 0.15)
    const r = revs[i]
    if (r) {
      l.texto(col[2] + 1.5, ry + rh / 2 + 0.9, r.letra, 2.4, NEGRO, 'start')
      l.texto(col[2] + 9, ry + rh / 2 + 0.9, r.autor, 2.4, NEGRO, 'start')
      l.texto(col[2] + 52, ry + rh / 2 + 0.9, fechaLarga(r.fecha), 2.4, NEGRO, 'start')
    }
  }
  l.linea(col[2] + 7, y, col[2] + 7, Y1, NEGRO, 0.15)
  l.linea(col[2] + 50, y, col[2] + 50, Y1, NEGRO, 0.15)
  l.texto(col[3] + 1.5, y + 3.5, 'FIRMA DEL CLIENTE:', 1.9, NEGRO, 'start', true)
  rotulo(l, col[4], y, 'ESCALA:', 'INDICADA')
  rotulo(l, col[4], mitad, 'ACOTACIÓN:', 'METROS')
  const lw = 34
  l.imagen(LOGO_MUURA, col[5] + (col[6] - col[5] - lw) / 2, y + 1.2, lw, lw / LOGO_PROPORCION)
  l.linea(col[5], y + 11, col[6], y + 11, NEGRO, 0.2)
  l.texto(col[5] + 1.5, y + 13.4, 'No. PLANO:', 1.9, NEGRO, 'start', true)
  l.texto((col[5] + col[6]) / 2 + 3, Y1 - 2.2, numero, 5.5, NEGRO, 'middle')
}

function rotulo(l: Lienzo, x: number, y: number, titulo: string, valor: string, max = 30): void {
  l.texto(x + 1.5, y + 3, titulo, 1.9, NEGRO, 'start', true)
  const tam = valor.length > max ? Math.max(1.5, (2.6 * max) / valor.length) : 2.6
  l.texto(x + 1.5, y + 7.8, valor, tam, NEGRO, 'start')
}

const MESES = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE']

export function fechaLarga(iso: string): string {
  const [a, m, d] = iso.split('-').map(Number)
  if (!a || !m || !d) return iso
  return `${String(d).padStart(2, '0')} DE ${MESES[m - 1]} ${a}`
}

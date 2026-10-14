import { jsPDF } from 'jspdf'
import { LOGO_MUURA, LOGO_PROPORCION } from '../assets/imagenes'
import { cotizar, dinero } from '../cotizacion'
import { ALTO_HOJA, ANCHO_HOJA, fechaLarga, hojasDelProyecto } from '../hojas'
import type { Lienzo } from '../render'
import type { Parametros, Proyecto } from '../types'

const PT = 72 / 25.4

function hex(c: string): [number, number, number] {
  const v = c.replace('#', '')
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)]
}

class LienzoPdf implements Lienzo {
  constructor(private d: jsPDF) {}
  rect(x: number, y: number, w: number, h: number, fondo: string | null, borde: string | null, grosor: number, punteado?: boolean) {
    if (fondo) this.d.setFillColor(...hex(fondo))
    if (borde) {
      this.d.setDrawColor(...hex(borde))
      this.d.setLineWidth(grosor)
      if (punteado) this.d.setLineDashPattern([1.2, 0.8], 0)
    }
    const estilo = fondo && borde ? 'FD' : fondo ? 'F' : 'S'
    if (fondo || borde) this.d.rect(x, y, w, h, estilo)
    if (punteado) this.d.setLineDashPattern([], 0)
  }
  linea(x1: number, y1: number, x2: number, y2: number, color: string, grosor: number, punteado?: boolean) {
    this.d.setDrawColor(...hex(color))
    this.d.setLineWidth(grosor)
    if (punteado) this.d.setLineDashPattern([1.2, 0.8], 0)
    this.d.line(x1, y1, x2, y2)
    if (punteado) this.d.setLineDashPattern([], 0)
  }
  texto(x: number, y: number, s: string, tam: number, color: string, ancla: 'start' | 'middle' | 'end', negrita?: boolean, rot?: number) {
    this.d.setFont('helvetica', negrita ? 'bold' : 'normal')
    this.d.setFontSize(tam * PT)
    this.d.setTextColor(...hex(color))
    const w = this.d.getTextWidth(s)
    const off = ancla === 'middle' ? w / 2 : ancla === 'end' ? w : 0
    const ang = -(rot ?? 0)
    const rad = (ang * Math.PI) / 180
    const dx = Math.cos(rad), dy = -Math.sin(rad)
    this.d.text(s, x - dx * off, y - dy * off, ang ? { angle: ang } : undefined)
  }
  poligono(pts: [number, number][], fondo: string) {
    this.d.setFillColor(...hex(fondo))
    const [x0, y0] = pts[0]
    const rel = pts.slice(1).map((p, i) => [p[0] - pts[i][0], p[1] - pts[i][1]])
    this.d.lines(rel, x0, y0, [1, 1], 'F', true)
  }
  imagen(src: string, x: number, y: number, w: number, h: number) {
    this.d.addImage(src, src.startsWith('data:image/png') ? 'PNG' : 'JPEG', x, y, w, h)
  }
}

export function pdfPlanos(pr: Proyecto, p: Parametros): jsPDF {
  const d = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [ANCHO_HOJA, ALTO_HOJA] })
  const l = new LienzoPdf(d)
  hojasDelProyecto(pr, p).forEach((h, i) => {
    if (i) d.addPage([ANCHO_HOJA, ALTO_HOJA], 'landscape')
    h.dibujar(l)
  })
  d.setProperties({ title: `Planos ${pr.folio} ${pr.desarrollo}`.trim() })
  return d
}

export function pdfCotizacion(pr: Proyecto, p: Parametros): jsPDF {
  const d = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' })
  const W = 215.9, H = 279.4, M = 16
  const c = cotizar(pr, p)
  const negro: [number, number, number] = [17, 17, 17]
  const gris: [number, number, number] = [107, 107, 107]
  let pagina = 1
  const encabezado = () => {
    d.addImage(LOGO_MUURA, 'PNG', M, 12, 46, 46 / LOGO_PROPORCION)
    d.setFont('helvetica', 'normal').setFontSize(8.5).setTextColor(...gris)
    p.direccionEmpresa.forEach((t, i) => d.text(t, W - M, 14 + i * 4, { align: 'right' }))
    d.setFont('helvetica', 'bold').setFontSize(9).setTextColor(...negro)
    d.text(p.empresa, M, 36)
  }
  const pie = () => {
    d.setDrawColor(200, 200, 200).setLineWidth(0.2).line(M, H - 14, W - M, H - 14)
    d.setFont('helvetica', 'normal').setFontSize(8).setTextColor(...gris)
    d.text(`${p.telefonoEmpresa}    ${p.web}`, M, H - 9)
    d.text(`Página ${pagina}`, W - M, H - 9, { align: 'right' })
  }
  const nueva = () => {
    pie()
    d.addPage('letter', 'portrait')
    pagina++
    encabezado()
    return 44
  }
  encabezado()
  d.setFont('helvetica', 'bold').setFontSize(16).setTextColor(...negro)
  d.text(`Cotización ${pr.folio || ''}`.trim(), M, 46)
  if (pr.cliente) d.setFont('helvetica', 'bold').setFontSize(10).setTextColor(...gris).text(pr.cliente.toUpperCase(), W - M, 46, { align: 'right' })
  let y = 56
  const datos: [string, string][] = [
    ['Fecha de cotización', fechaCorta(pr.fecha)],
    ['Vencimiento', fechaCorta(sumarDias(pr.fecha, 30))],
    ['Vendedor', pr.vendedor],
    ['Moneda', c.moneda === 'USD' ? `Dólares (USD)${c.tipoCambio ? ` · T.C. ${c.tipoCambio}` : ''}` : 'Pesos (MXN)'],
  ]
  const cw = (W - 2 * M) / 4
  datos.forEach(([t, v], i) => {
    d.setFont('helvetica', 'bold').setFontSize(8.5).setTextColor(...gris).text(t, M + i * cw, y)
    d.setFont('helvetica', 'normal').setFontSize(10).setTextColor(...negro).text(v || '-', M + i * cw, y + 5)
  })
  y += 14
  const cols = { desc: M, cant: 128, precio: 165, imp: W - M }
  const cabecera = () => {
    d.setFillColor(17, 17, 17).rect(M, y - 4.5, W - 2 * M, 7, 'F')
    d.setFont('helvetica', 'bold').setFontSize(8.5).setTextColor(255, 255, 255)
    d.text('Descripción', cols.desc + 2, y)
    d.text('Cantidad', cols.cant, y, { align: 'right' })
    d.text('Precio unitario', cols.precio, y, { align: 'right' })
    d.text('Importe', cols.imp - 2, y, { align: 'right' })
    y += 7
  }
  cabecera()
  for (const sec of c.secciones) {
  if (y + 22 > H - 24) { y = nueva(); cabecera() }
  d.setFillColor(241, 241, 241).rect(M, y - 4, W - 2 * M, 6.5, 'F')
  d.setFont('helvetica', 'bold').setFontSize(9).setTextColor(...negro)
  d.text(sec.titulo, cols.desc + 2, y)
  d.text(dinero(sec.subtotal), cols.imp - 2, y, { align: 'right' })
  y += 7.5
  for (const pa of sec.partidas) {
    d.setFont('helvetica', 'normal').setFontSize(8)
    const lineas = pa.descripcion ? (d.splitTextToSize(pa.descripcion, cols.cant - 30 - M) as string[]) : []
    const alto = 5 + lineas.length * 3.6 + 3
    if (y + alto > H - 24) { y = nueva(); cabecera() }
    d.setFont('helvetica', 'bold').setFontSize(9).setTextColor(...negro)
    d.text(`${pa.codigo ? `[${pa.codigo}] ` : ''}${pa.concepto}`, cols.desc + 2, y)
    d.setFont('helvetica', 'normal').setFontSize(9)
    d.text(`${pa.cantidad.toFixed(2)} ${pa.unidad}`, cols.cant, y, { align: 'right' })
    d.text(dinero(pa.precio), cols.precio, y, { align: 'right' })
    d.text(dinero(pa.importe), cols.imp - 2, y, { align: 'right' })
    d.setFontSize(8).setTextColor(...gris)
    d.text(lineas, cols.desc + 2, y + 4.5, { lineHeightFactor: 1.25 })
    y += alto
    d.setDrawColor(225, 225, 225).setLineWidth(0.2).line(M, y - 3, W - M, y - 3)
  }
  }
  const notas = [`TIEMPO DE ENTREGA: ${c.entrega.replace(/\.$/, '')}.`, ...p.notasGenerales.map((t) => t.replace('{semanas}', String(c.semanas)))]
  const bloqueNotas = 8 + notas.length * 4.5 + 6 + p.requerimientosObra.length * 8
  if (y + 30 > H - 30) y = nueva()
  y += 2
  const tx = 140
  const totales: [string, number, boolean][] = [['Subtotal', c.subtotal, false], [`IVA ${Math.round(p.iva * 100)}%`, c.iva, false], [`Total ${c.moneda}`, c.total, true]]
  totales.forEach(([t, v, b]) => {
    d.setFont('helvetica', b ? 'bold' : 'normal').setFontSize(b ? 11 : 9.5).setTextColor(...negro)
    d.text(t, tx, y)
    d.text(dinero(v), W - M - 2, y, { align: 'right' })
    y += b ? 7 : 5.5
  })
  if (y + bloqueNotas > H - 20) y = nueva()
  y += 4
  d.setFont('helvetica', 'bold').setFontSize(9.5).setTextColor(...negro).text('NOTAS GENERALES', M, y)
  y += 5
  d.setFont('helvetica', 'normal').setFontSize(8.5)
  notas.forEach((t, i) => { d.text(`${i + 1}. ${t}`, M + 2, y); y += 4.5 })
  y += 2
  d.setFont('helvetica', 'bold').setFontSize(9.5).text('REQUERIMIENTOS A PIE DE OBRA', M, y)
  y += 5
  d.setFont('helvetica', 'normal').setFontSize(8.5)
  p.requerimientosObra.forEach((t, i) => {
    const ls = d.splitTextToSize(`${i + 1}. ${t}`, W - 2 * M - 4) as string[]
    d.text(ls, M + 2, y, { lineHeightFactor: 1.25 })
    y += ls.length * 4 + 0.8
  })
  if (pr.notas.trim()) {
    y += 2
    const ls = d.splitTextToSize(pr.notas.trim(), W - 2 * M - 4) as string[]
    if (y + ls.length * 4 > H - 40) y = nueva()
    d.setFont('helvetica', 'bold').setFontSize(9.5).text('OBSERVACIONES', M, y)
    y += 5
    d.setFont('helvetica', 'normal').setFontSize(8.5).text(ls, M + 2, y, { lineHeightFactor: 1.25 })
    y += ls.length * 4
  }
  if (y + 36 > H - 20) y = nueva()
  y += 5
  const proyecto: [string, string][] = [
    ['Proyecto', pr.desarrollo],
    ['Cliente', pr.cliente],
    ['Nombre de contacto', pr.contacto],
    ['Teléfono de contacto', pr.telefono],
    ['Dirección', pr.direccion],
  ]
  d.setFontSize(8.5)
  proyecto.forEach(([t, v]) => {
    d.setFont('helvetica', 'bold').text(`${t}:`, M, y)
    d.setFont('helvetica', 'normal').text(v || '', M + 38, y)
    y += 4.5
  })
  y += 2
  d.setFont('helvetica', 'bold').text('Condiciones de pago:', M, y)
  d.setFont('helvetica', 'normal').text(d.splitTextToSize(p.condicionesPago, W - 2 * M - 38) as string[], M + 38, y)
  pie()
  d.setProperties({ title: `Cotización ${pr.folio} ${pr.desarrollo}`.trim() })
  return d
}

function sumarDias(iso: string, n: number): string {
  const f = new Date(iso + 'T12:00:00')
  if (isNaN(f.getTime())) return iso
  f.setDate(f.getDate() + n)
  return f.toISOString().slice(0, 10)
}

function fechaCorta(iso: string): string {
  const [a, m, d] = iso.split('-')
  return a && m && d ? `${d}/${m}/${a}` : iso
}

export function nombreArchivo(pr: Proyecto, tipo: string): string {
  const base = `${tipo} - ${pr.folio || 'sin folio'}_${pr.desarrollo || 'proyecto'}`
  return base.replace(/[\\/:*?"<>|]/g, '').trim() + '.pdf'
}

export { fechaLarga }

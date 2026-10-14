import { COLORES, RELLENOS, rayado, type Encaje, type Trazo, type Vista } from './dibujo'

export interface Lienzo {
  rect(x: number, y: number, w: number, h: number, fondo: string | null, borde: string | null, grosor: number, punteado?: boolean): void
  linea(x1: number, y1: number, x2: number, y2: number, color: string, grosor: number, punteado?: boolean): void
  texto(x: number, y: number, s: string, tam: number, color: string, ancla: 'start' | 'middle' | 'end', negrita?: boolean, rot?: number): void
  poligono(pts: [number, number][], fondo: string): void
  imagen(src: string, x: number, y: number, w: number, h: number): void
}

const GROSOR: Record<Trazo, number> = { grueso: 0.35, fino: 0.18, punteado: 0.25, ninguno: 0 }
const INTERLINEA = 1.25

export function trazarVista(v: Vista, e: Encaje, l: Lienzo): void {
  const X = (x: number) => e.ox + x * e.k
  const Y = (y: number) => e.oy + y * e.k
  const tope = Y(v.caja.y0)
  for (const f of v.figuras) {
    switch (f.t) {
      case 'rect': {
        const x = X(f.x), y = Y(f.y), w = f.w * e.k, h = f.h * e.k
        const base = f.relleno ? RELLENOS[f.relleno] : null
        const delgado = Math.min(w, h) < 1.2
        const r = base && f.tinte ? (delgado ? { fondo: f.tinte } : { ...base, fondo: aclarar(f.tinte, 0.72), raya: f.tinte }) : base
        if (r) l.rect(x, y, w, h, r.fondo, null, 0)
        if (r?.raya) for (const s of rayado(x, y, w, h, r.paso ?? 2)) l.linea(s[0], s[1], s[2], s[3], r.raya, 0.12)
        const tr = f.trazo ?? 'fino'
        if (tr !== 'ninguno') l.rect(x, y, w, h, null, COLORES.negro, GROSOR[tr], tr === 'punteado')
        break
      }
      case 'linea': {
        const tr = f.trazo ?? 'fino'
        l.linea(X(f.x1), Y(f.y1), X(f.x2), Y(f.y2), COLORES[f.color ?? 'negro'], GROSOR[tr], tr === 'punteado')
        break
      }
      case 'texto': {
        const x = X(f.x) + (f.dx ?? 0)
        const lh = f.tam * INTERLINEA
        const y0 = Y(f.y) + (f.dy ?? 0) - ((f.s.length - 1) * lh) / 2 + f.tam * 0.35
        f.s.forEach((s, i) => {
          if (f.rot) l.texto(x + f.tam * 0.35, Y(f.y), s, f.tam, COLORES[f.color ?? 'negro'], f.ancla ?? 'start', f.negrita, f.rot)
          else l.texto(x, y0 + i * lh, s, f.tam, COLORES[f.color ?? 'negro'], f.ancla ?? 'start', f.negrita)
        })
        break
      }
      case 'cota':
        cota(l, X(f.x1), Y(f.y1), X(f.x2), Y(f.y2), f.off, f.texto, f.titulo)
        break
      case 'nota': {
        const tam = 2
        const lh = tam * INTERLINEA
        const cx = X(f.x) + f.dx
        const base = tope - f.dy
        const color = COLORES[f.color ?? 'negro']
        f.s.forEach((s, i) => l.texto(cx, base - (f.s.length - 1 - i) * lh - 0.6, s, tam, color, 'middle', f.color !== 'azul'))
        l.linea(cx, base + 0.4, X(f.x), Y(f.y), COLORES.negro, 0.15)
        l.poligono(flecha(cx, base + 0.4, X(f.x), Y(f.y)), COLORES.negro)
        break
      }
      case 'nivel': {
        const x = X(f.x) + f.dx, y = Y(f.y)
        l.linea(X(f.x) + 1, y, x + 2, y, COLORES.negro, 0.15)
        l.poligono([[x, y], [x - 1.4, y - 2], [x + 1.4, y - 2]], COLORES.negro)
        l.texto(x + 3, y - 0.6, f.texto, 2.2, COLORES.negro, 'start')
        break
      }
    }
  }
}

function aclarar(hex: string, t: number): string {
  const v = hex.replace('#', '')
  const c = [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16))
  return '#' + c.map((x) => Math.round(x + (255 - x) * t).toString(16).padStart(2, '0')).join('')
}

function flecha(x1: number, y1: number, x2: number, y2: number): [number, number][] {
  const d = Math.hypot(x2 - x1, y2 - y1) || 1
  const ux = (x2 - x1) / d, uy = (y2 - y1) / d
  const L = 1.6, A = 0.6
  return [[x2, y2], [x2 - ux * L - uy * A, y2 - uy * L + ux * A], [x2 - ux * L + uy * A, y2 - uy * L - ux * A]]
}

function cota(l: Lienzo, x1: number, y1: number, x2: number, y2: number, off: number, texto: string, titulo?: string): void {
  const azul = COLORES.azul
  const tam = 2.1
  const g = 0.15
  if (Math.abs(y1 - y2) < 1e-6) {
    const y = y1 - off
    const dir = off > 0 ? -1 : 1
    l.linea(x1, y1 + dir * 0.8, x1, y + dir * 1.2, azul, g)
    l.linea(x2, y2 + dir * 0.8, x2, y + dir * 1.2, azul, g)
    l.linea(Math.min(x1, x2) - 1, y, Math.max(x1, x2) + 1, y, azul, g)
    for (const x of [x1, x2]) l.linea(x - 0.9, y + 0.9, x + 0.9, y - 0.9, azul, 0.3)
    const cx = (x1 + x2) / 2
    const tt = ajustar(titulo ?? '', tam, Math.abs(x2 - x1))
    l.texto(cx, y - 0.7, texto, tam, azul, 'middle')
    if (titulo) l.texto(cx, y - 0.7 - tam * 1.25, titulo, tt, azul, 'middle')
  } else {
    const x = x1 + off
    const dir = off > 0 ? 1 : -1
    l.linea(x1 + dir * 0.8, y1, x + dir * 1.2, y1, azul, g)
    l.linea(x2 + dir * 0.8, y2, x + dir * 1.2, y2, azul, g)
    l.linea(x, Math.min(y1, y2) - 1, x, Math.max(y1, y2) + 1, azul, g)
    for (const y of [y1, y2]) l.linea(x - 0.9, y + 0.9, x + 0.9, y - 0.9, azul, 0.3)
    const cy = (y1 + y2) / 2
    const tt = ajustar(titulo ?? '', tam, Math.abs(y2 - y1))
    l.texto(x - 0.7, cy, texto, tam, azul, 'middle', false, -90)
    if (titulo) l.texto(x - 0.7 - tam * 1.25, cy, titulo, tt, azul, 'middle', false, -90)
  }
}

function ajustar(s: string, tam: number, largo: number): number {
  const ancho = s.length * tam * 0.6
  if (ancho <= largo - 1.5 || largo < 8) return tam
  return Math.max(1.4, (tam * (largo - 1.5)) / ancho)
}

export class LienzoSvg implements Lienzo {
  partes: string[] = []
  rect(x: number, y: number, w: number, h: number, fondo: string | null, borde: string | null, grosor: number, punteado?: boolean) {
    this.partes.push(`<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" fill="${fondo ?? 'none'}"${borde ? ` stroke="${borde}" stroke-width="${grosor}"` : ''}${punteado ? ' stroke-dasharray="1.2 0.8"' : ''}/>`)
  }
  linea(x1: number, y1: number, x2: number, y2: number, color: string, grosor: number, punteado?: boolean) {
    this.partes.push(`<line x1="${n(x1)}" y1="${n(y1)}" x2="${n(x2)}" y2="${n(y2)}" stroke="${color}" stroke-width="${grosor}"${punteado ? ' stroke-dasharray="1.2 0.8"' : ''}/>`)
  }
  texto(x: number, y: number, s: string, tam: number, color: string, ancla: 'start' | 'middle' | 'end', negrita?: boolean, rot?: number) {
    const tr = rot ? ` transform="rotate(${rot} ${n(x)} ${n(y)})"` : ''
    this.partes.push(`<text x="${n(x)}" y="${n(y)}" font-size="${n(tam)}" fill="${color}" text-anchor="${ancla}"${negrita ? ' font-weight="700"' : ''}${tr}>${esc(s)}</text>`)
  }
  poligono(pts: [number, number][], fondo: string) {
    this.partes.push(`<polygon points="${pts.map((p) => `${n(p[0])},${n(p[1])}`).join(' ')}" fill="${fondo}"/>`)
  }
  imagen(src: string, x: number, y: number, w: number, h: number) {
    this.partes.push(`<image href="${src}" x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" preserveAspectRatio="none"/>`)
  }
}

const n = (v: number) => (Math.round(v * 100) / 100).toString()
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

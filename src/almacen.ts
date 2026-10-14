import type { Muro, Parametros, Proyecto } from './types'

export function id(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

export function hoy(): string {
  const f = new Date()
  return `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}-${String(f.getDate()).padStart(2, '0')}`
}

export function normalizar(pr: Proyecto): Proyecto {
  return {
    ...pr,
    moneda: pr.moneda ?? 'MXN',
    tipoCambio: pr.tipoCambio ?? null,
    instalacion: pr.instalacion ?? null,
    entrega: pr.entrega ?? '',
    muros: pr.muros.map((m) => ({ ...m, caraA: m.caraA ?? 'TELA', caraB: m.caraB ?? 'TELA', registro: m.registro ?? false, tipoGuardado: m.tipoGuardado ?? 1, areaA: m.areaA ?? '', areaB: m.areaB ?? '', guardadoAncho: m.guardadoAncho ?? null })),
  }
}

export function muroNuevo(n: number, linea: string): Muro {
  return {
    id: id(),
    nombre: `Muro ${n}`,
    largo: 600,
    alto: 300,
    nivelacion: 25,
    alturaPTR: null,
    paneles: 6,
    guardado: 'der',
    tipoGuardado: 1,
    linea,
    caraA: 'TELA',
    caraB: 'TELA',
    registro: true,
    areaA: '',
    areaB: '',
    guardadoAncho: null,
    m2Cobrado: null,
    repelente: false,
    instalacion: true,
  }
}

export function proyectoNuevo(p: Parametros): Proyecto {
  const ahora = new Date().toISOString()
  return {
    id: id(),
    folio: '',
    desarrollo: '',
    cliente: '',
    direccion: '',
    color: '',
    contacto: '',
    telefono: '',
    vendedor: '',
    fecha: hoy(),
    revisiones: [{ letra: 'V1', autor: '', fecha: hoy() }],
    muros: [muroNuevo(1, p.lineas[0]?.linea ?? 'A')],
    moneda: 'MXN',
    tipoCambio: null,
    flete: p.fleteBase,
    instalacion: null,
    entrega: '',
    tarimas: 1,
    modulos: 0,
    notas: '',
    creado: ahora,
    modificado: ahora,
  }
}

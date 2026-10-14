export type Lado = 'izq' | 'der'

export type Moneda = 'MXN' | 'USD'

export interface Muro {
  id: string
  nombre: string
  largo: number
  alto: number
  nivelacion: number
  alturaPTR: number | null
  paneles: number
  guardado: Lado
  tipoGuardado: number
  linea: string
  caraA: string
  caraB: string
  registro: boolean
  areaA: string
  areaB: string
  guardadoAncho: number | null
  m2Cobrado: number | null
  repelente: boolean
  instalacion: boolean
}

export interface Revision {
  letra: string
  autor: string
  fecha: string
}

export interface Proyecto {
  id: string
  folio: string
  desarrollo: string
  cliente: string
  direccion: string
  color: string
  contacto: string
  telefono: string
  vendedor: string
  fecha: string
  revisiones: Revision[]
  muros: Muro[]
  moneda: Moneda
  tipoCambio: number | null
  flete: number
  instalacion: number | null
  entrega: string
  tarimas: number
  modulos: number
  notas: string
  creado: string
  modificado: string
}

export interface Modelo {
  nombre: string
  desde: number
  hasta: number
}

export interface Material {
  nombre: string
  kgM2: number
  contrapeso: number
  color: string
}

export interface PrecioLinea {
  linea: string
  precioM2: number
  precioUSD: number | null
}

export interface TramoInstalacion {
  hastaM: number
  precio: number
  codigo: string
  concepto: string
  descripcion: string
}

export interface Parametros {
  lengueta: number
  espesorPanel: number
  anchoMinimo: number
  anchoMaximo: number
  anchoExtendido: number
  modelos: Modelo[]
  materiales: Material[]
  pesoExtraAjuste: number
  guardadoPorPanel: number
  distanciaRuedas: number
  holguraHerraje: number
  nivelacionMinima: number
  nivelacionMaxima: number
  nivelacionEstandar: number
  factorM2: number
  iva: number
  tipoCambio: number | null
  lineas: PrecioLinea[]
  repelentePieza: number
  instalacion: TramoInstalacion[]
  fleteBase: number
  kgM2Embarque: number
  kgTarima: number
  kgModulo: number
  panelesPorDia: number
  notasGenerales: string[]
  requerimientosObra: string[]
  condicionesPago: string
  empresa: string
  direccionEmpresa: string[]
  telefonoEmpresa: string
  web: string
}

export type Rol = 'admin' | 'proyectista'

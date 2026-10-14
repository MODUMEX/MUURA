import { calcularMuro } from '../src/calculo'
import { cotizar } from '../src/cotizacion'
import { PARAMETROS_BASE as P } from '../src/parametros'
import { muroNuevo, proyectoNuevo } from '../src/almacen'
import type { Muro, Parametros } from '../src/types'

let fallas = 0
function igual(nombre: string, real: unknown, esperado: unknown) {
  const ok = typeof esperado === 'number' ? Math.abs(Number(real) - esperado) < 0.0011 : real === esperado
  if (!ok) fallas++
  console.log(`${ok ? 'OK ' : 'MAL'} ${nombre}: ${real}${ok ? '' : ` (esperado ${esperado})`}`)
}
const muro = (largo: number, alto: number, paneles: number, extra: Partial<Muro> = {}): Muro => ({ ...muroNuevo(1, 'A'), largo, alto, paneles, ...extra })
const antes: Parametros = P
const conTres: Parametros = { ...antes, factorM2: 1.03 }

const excel = calcularMuro(muro(608.2, 300, 6), conTres)
igual('Excel ancho panel', excel.anchoPanel, 99)
igual('Excel total', excel.total, 611)
igual('Excel diferencia', excel.diferencia, -2.8)
igual('Excel peso panel', excel.pesoPanel, 98.01)
igual('Excel carga', excel.cargaPuntual, 613)
igual('Excel ancho riel', excel.anchoRiel, 85)
igual('Excel guardado', excel.anchoGuardado, 66)

const v = { ...antes, lengueta: 20 }
const casoB = calcularMuro(muro(668, 280, 6), v)
igual('Caso B ancho (lengüeta 20)', casoB.anchoPanel, 108)
igual('Caso B peso estándar', casoB.pesoPanel, 99.792)
igual('Caso B peso ajuste', casoB.pesoAjuste, 124.792)
igual('Caso B carga', casoB.cargaPuntual, 625)
const casoA = calcularMuro(muro(960, 395, 8), v)
igual('Caso A ancho', casoA.anchoPanel, 118)
igual('Caso A peso estándar', casoA.pesoPanel, 153.813)
igual('Caso A carga', casoA.cargaPuntual, 1257)

const casoC = calcularMuro(muro(756, 222, 7), antes)
igual('Caso C ancho', casoC.anchoPanel, 106)
igual('Caso C diferencia', casoC.diferencia, -3)
igual('Caso C peso panel', Math.round(casoC.pesoPanel), 78)
igual('Caso C carga', casoC.cargaPuntual, 571)
igual('Caso C m²', casoC.m2Cotizacion, 16.79)

const casoD = calcularMuro(muro(757, 288, 7, { caraA: 'MELAMINA', caraB: 'MELAMINA', linea: 'C' }), antes)
igual('Caso D ancho', casoD.anchoPanel, 106)
igual('Caso D diferencia', casoD.diferencia, -2)
igual('Caso D peso melamina', Math.round(casoD.pesoPanel), 123)
igual('Caso D m²', casoD.m2Cotizacion, 21.81)
igual('Caso D carga (contrapeso melamina 54)', casoD.cargaPuntual, 915)
igual('Caso D peso ajuste', Math.round(casoD.pesoAjuste), 177)

const mixto = calcularMuro(muro(757, 288, 7, { caraA: 'TELA', caraB: 'MELAMINA' }), antes)
igual('Mixto usa la cara más pesada', mixto.kgM2, 40.29)
igual('Mixto usa el contrapeso de la cara pesada', mixto.contrapeso, 54)
igual('Corcho 35 kg/m²', calcularMuro(muro(757, 288, 7, { caraA: 'CORCHO', caraB: 'TELA' }), P).kgM2, 35)

igual('Ficha: Caso A es A-600', calcularMuro(muro(960, 395, 8), P).modelo, 'A-600')
igual('Ficha: Caso C 2.22 es A-300 adaptado', casoC.modelo, 'A-300 ADAPTADO')
igual('Ficha: Caso C sin avisos', casoC.avisos.length, 0)
igual('Panel de 125 avisa (pasa de 123)', calcularMuro(muro(767, 300, 6), P).avisos.some((a) => a.includes('máximo')), true)
const p122 = calcularMuro(muro(749, 300, 6), P)
igual('Panel de 122 solo nota', p122.anchoPanel === 122 && p122.avisos.length === 0 && p122.notas.length === 1, true)
igual('Nivelación 32 avisa', calcularMuro(muro(757, 288, 7, { nivelacion: 32 }), P).avisos.length, 1)
igual('Nivelación 20 ok', calcularMuro(muro(757, 288, 7, { nivelacion: 20 }), P).avisos.length, 0)


const PF: Parametros = {
  ...P,
  lineas: [{ linea: 'A', precioM2: 1000, precioUSD: null }],
  repelentePieza: 10,
  instalacion: P.instalacion.map((t) => ({ ...t, precio: 500 })),
}
const sinPrecio = proyectoNuevo(P)
igual('Sin precios cargados la cotización avisa', cotizar(sinPrecio, P).faltantes.length > 0, true)
const gen = proyectoNuevo(PF)
gen.muros = [muro(757, 288, 7, { repelente: true })]
gen.flete = 100
const cg = cotizar(gen, PF)
igual('Panel = m² redondeado arriba × precio', cg.partidas[0].importe, 21.81 * 1000)
igual('Repelente = m² × precio', cg.partidas[1].importe, 21.8 * 10)
igual('Instalación sugerida por alto', cg.partidas.find((x) => x.codigo === 'MMS-1')?.importe, 500)
igual('IVA 16%', cg.iva, Math.round((21810 + 218 + 100 + 500) * 0.16 * 100) / 100)
gen.moneda = 'USD'
igual('USD sin tipo de cambio avisa', cotizar(gen, PF).faltantes.length > 0, true)
gen.tipoCambio = 20
igual('USD = MXN / TC', cotizar(gen, PF).partidas[0].precio, 50)
igual('USD usa precio de lista en dólares', cotizar(gen, { ...PF, lineas: [{ linea: 'A', precioM2: 1000, precioUSD: 45 }] }).partidas[0].precio, 45)
console.log(fallas ? `\n${fallas} FALLAS` : '\nTodo cuadra')
process.exit(fallas ? 1 : 0)


import { ALTO_HOJA, ANCHO_HOJA, type Hoja } from '../hojas'
import { LienzoSvg } from '../render'

export function VistaHoja({ hoja }: { hoja: Hoja }) {
  const l = new LienzoSvg()
  hoja.dibujar(l)
  return (
    <svg
      className="hoja"
      viewBox={`0 0 ${ANCHO_HOJA} ${ALTO_HOJA}`}
      style={{ fontFamily: 'Helvetica, Arial, sans-serif' }}
      dangerouslySetInnerHTML={{ __html: `<rect width="${ANCHO_HOJA}" height="${ALTO_HOJA}" fill="#fff"/>` + l.partes.join('') }}
    />
  )
}

import { useEffect, useState } from 'react'

interface PropsNumero {
  valor: number | null
  onCambio: (v: number | null) => void
  escala?: number
  decimales?: number
  vacio?: boolean
  placeholder?: string
  min?: number
}

export function CampoNumero({ valor, onCambio, escala = 1, decimales = 2, vacio, placeholder, min }: PropsNumero) {
  const aTexto = (v: number | null) => (v === null ? '' : String(Number((v / escala).toFixed(decimales))))
  const [texto, setTexto] = useState(aTexto(valor))
  const [foco, setFoco] = useState(false)
  useEffect(() => {
    if (!foco) setTexto(aTexto(valor))
  }, [valor, foco])
  const confirmar = (t: string) => {
    const limpio = t.replace(',', '.').trim()
    if (limpio === '' && vacio) return onCambio(null)
    const n = Number(limpio)
    if (limpio === '' || !isFinite(n)) return
    if (min !== undefined && n < min) return
    onCambio(Math.round(n * escala * 1e6) / 1e6)
  }
  return (
    <input
      className="num"
      inputMode="decimal"
      value={texto}
      placeholder={placeholder}
      onFocus={() => setFoco(true)}
      onBlur={() => { setFoco(false); setTexto(aTexto(valor)) }}
      onChange={(e) => { setTexto(e.target.value); confirmar(e.target.value) }}
    />
  )
}

export function Etiqueta({ texto, children, ayuda }: { texto: string; children: React.ReactNode; ayuda?: string }) {
  return (
    <label className="campo" title={ayuda}>
      <span>{texto}</span>
      {children}
    </label>
  )
}

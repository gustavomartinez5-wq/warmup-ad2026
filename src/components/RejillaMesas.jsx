import { useEffect, useRef, useState } from 'react'

const MIN_CELDA = 88   // ancho mínimo cómodo para número y nombre de empresa
const HUECO     = 6    // gap-1.5

/**
 * Rejilla que se llena por columna: 1, 2, 3… bajando, y al llegar abajo
 * sigue arriba de la columna siguiente. Es como se recorre el salón.
 *
 * El truco es fijar los renglones y dejar que las columnas salgan solas
 * (`grid-auto-flow: column`). Los renglones se calculan del ancho real del
 * contenedor, así que en celular salen pocas columnas largas y en laptop
 * muchas cortas, sin desbordar nunca.
 */
export default function RejillaMesas({ total, children }) {
  const contenedor = useRef(null)
  const [columnas, setColumnas] = useState(4)

  useEffect(() => {
    const el = contenedor.current
    if (!el) return
    const medir = ancho => setColumnas(Math.max(2, Math.floor((ancho + HUECO) / (MIN_CELDA + HUECO))))
    // Se mide de una vez: si se espera al observador, el primer cuadro sale con 4 columnas.
    medir(el.clientWidth)
    const observador = new ResizeObserver(([entrada]) => medir(entrada.contentRect.width))
    observador.observe(el)
    return () => observador.disconnect()
  }, [])

  const renglones = Math.max(1, Math.ceil(total / columnas))

  return (
    <div
      ref={contenedor}
      className="grid gap-1.5"
      style={{
        gridAutoFlow:      'column',
        gridTemplateRows:  `repeat(${renglones}, minmax(58px, auto))`,
        gridAutoColumns:   'minmax(0, 1fr)',
      }}
    >
      {children}
    </div>
  )
}

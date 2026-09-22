import { useEffect, useRef, useState } from 'react'
import { COLUMNAS, FILAS, MESAS_EN_PLANO, COLUMNAS_ACCESO, posicion, pasilloDespuesDe } from '../lib/plano'

// A partir de este ancho va como el mapa oficial. Abajo de 900 las 15 columnas salen de
// menos de 50 px y el nombre de la empresa ya no se lee: una tablet parada lo ve vertical.
const HORIZONTAL_DESDE = 900
const PASILLO = { h: 14, v: 10 }
const PAR     = 3              // el hueco de las sillas entre dos mesas espalda con espalda
const ROTULO  = { h: 20, v: 14 }
const HUECO_CORTO = 4          // entre mesas de la misma columna

/**
 * El salón como está en el piso. La forma sale de `src/lib/plano.js`; aquí
 * solo se acomoda.
 *
 * En pantalla o tablet acostada va como el mapa oficial: 15 columnas, la mesa 1
 * abajo a la derecha y el acceso abajo. En el celular o la tablet parada no
 * cabría con los nombres legibles, así que el salón se gira: la mesa 1 arriba,
 * las puertas de servicio a la izquierda y el acceso a la derecha. Es el mismo
 * salón visto desde otro lado, no otro acomodo.
 *
 * Cada pantalla pinta su propia mesa y la pasa en `celda`: `/host` con los
 * colores de estado en vivo, `/admin/mesas` con los suyos y el papel en blanco
 * y negro. Lo que comparten es esto: las columnas, los pasillos, los rótulos y
 * el giro. `celda` recibe el número y si la mesa sale angosta, para ajustar la
 * letra con `letraDelNombre`.
 */
export default function PlanoSalon({ celda, excedentes = [], orientacion = 'auto', tono = 'oscuro' }) {
  const contenedor = useRef(null)
  const [ancho, setAncho] = useState(0)

  useEffect(() => {
    const el = contenedor.current
    if (!el) return
    // Se mide de una vez: si se espera al observador, el primer cuadro sale vacío.
    setAncho(el.clientWidth)
    const observador = new ResizeObserver(([e]) => setAncho(e.contentRect.width))
    observador.observe(el)
    return () => observador.disconnect()
  }, [])

  // El papel siempre va horizontal: la vista previa de admin es angosta y si se
  // midiera, la hoja saldría girada.
  const horizontal = orientacion === 'horizontal' || (orientacion === 'auto' && ancho >= HORIZONTAL_DESDE)
  const papel = tono === 'papel'

  // El eje largo: las 15 columnas con sus huecos. En horizontal van de la 15
  // (izquierda) a la 1 (derecha); en vertical, de la 1 (arriba) a la 15.
  const orden = Array.from({ length: COLUMNAS }, (_, i) => horizontal ? COLUMNAS - i : i + 1)
  const pistaDe = {}
  const pistas = []
  orden.forEach((c, i) => {
    pistas.push(horizontal ? 'minmax(0, 1fr)' : 'auto')
    pistaDe[c] = pistas.length
    if (i < orden.length - 1) {
      const menor = Math.min(c, orden[i + 1])
      pistas.push(`${pasilloDespuesDe(menor) ? (horizontal ? PASILLO.h : PASILLO.v) : PAR}px`)
    }
  })

  // El eje corto: rótulo de las puertas, las 5 filas y rótulo del acceso.
  const rotulo = horizontal ? ROTULO.h : ROTULO.v
  const corto = [`${rotulo}px`, ...Array(FILAS).fill(horizontal ? 'auto' : 'minmax(0, 1fr)'), `${rotulo}px`]

  // Qué tan ancha sale cada mesa, para ajustar la letra del nombre.
  const pasillos = Math.floor((COLUMNAS - 1) / 2)
  const anchoMesa = horizontal
    ? ((ancho || 960) - pasillos * PASILLO.h - (COLUMNAS - 1 - pasillos) * PAR) / COLUMNAS
    : (ancho - 2 * ROTULO.v - (FILAS + 1) * HUECO_CORTO) / FILAS
  const angosta = anchoMesa < 64

  const lugar = (columna, fila) => horizontal
    ? { gridColumn: pistaDe[columna], gridRow: fila + 1 }
    : { gridRow: pistaDe[columna], gridColumn: fila + 1 }

  const [a1, a2] = COLUMNAS_ACCESO.map(c => pistaDe[c])
  const acceso = horizontal
    ? { gridColumn: `${Math.min(a1, a2)} / ${Math.max(a1, a2) + 1}`, gridRow: FILAS + 2 }
    : { gridRow: `${Math.min(a1, a2)} / ${Math.max(a1, a2) + 1}`, gridColumn: FILAS + 2 }
  const puertas = horizontal
    ? { gridColumn: `1 / ${pistas.length + 1}`, gridRow: 1 }
    : { gridRow: `1 / ${pistas.length + 1}`, gridColumn: 1 }

  const rotuloClase = 'flex items-center justify-center text-[10px] uppercase tracking-[0.14em] font-semibold'
  const vertical = horizontal ? {} : { writingMode: 'vertical-rl' }

  return (
    <div ref={contenedor}>
      {(ancho > 0 || orientacion === 'horizontal') && (
        <div
          className="grid"
          style={horizontal
            ? { gridTemplateColumns: pistas.join(' '), gridTemplateRows: corto.join(' '), rowGap: HUECO_CORTO }
            : { gridTemplateRows: pistas.join(' '), gridTemplateColumns: corto.join(' '), columnGap: HUECO_CORTO }}
        >
          <div style={{ ...puertas, ...vertical }}
               className={`${rotuloClase} ${papel ? 'text-marino/45' : 'text-lavanda/35'}`}>
            Puertas de servicio
          </div>
          <div style={{ ...acceso, ...vertical }}
               className={`${rotuloClase} rounded-md border border-dashed ${
                 papel ? 'text-teal-hondo border-teal-hondo/70' : 'text-teal border-teal/70 bg-teal/10'}`}>
            Acceso
          </div>

          {Array.from({ length: MESAS_EN_PLANO }, (_, i) => {
            const numero = i + 1
            const { columna, fila } = posicion(numero)
            return (
              <div key={numero} style={lugar(columna, fila)} className={horizontal ? '' : 'py-0.5'}>
                {celda(numero, { angosta })}
              </div>
            )
          })}
        </div>
      )}

      {/* Una mesa arriba de la 75 no tiene lugar en el salón dibujado. */}
      {excedentes.length > 0 && (
        <div className="mt-4">
          <p className={`text-[11px] mb-1.5 ${papel ? 'text-marino/60' : 'text-lavanda/50'}`}>
            Fuera del plano
          </p>
          <div className="flex flex-wrap gap-1.5">
            {excedentes.map(n => (
              <div key={n} className="w-24">{celda(n, { angosta })}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

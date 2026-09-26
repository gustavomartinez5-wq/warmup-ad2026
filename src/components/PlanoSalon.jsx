import { useEffect, useRef, useState } from 'react'
import { COLUMNAS, FILAS, MESAS_EN_PLANO, COLUMNAS_ACCESO, posicion, columnaBaja } from '../lib/plano'

// A partir de este ancho va como el mapa oficial. Abajo de 1150 las 19 columnas salen de
// menos de 53 px y «Johnson» o «Heineken» se parten a media palabra: una tablet, acostada
// o parada, lo ve vertical.
const HORIZONTAL_DESDE = 1150
const PASILLO = { h: 6, v: 6 }  // entre columnas: todas van a la misma distancia
const ROTULO  = { h: 20, v: 14 }
const HUECO_CORTO = 4           // entre mesas de la misma columna
const MEDIA_FILA  = 34          // una mesa ocupa dos: 72 px con el hueco, tres renglones de nombre

/**
 * El salón como está en el piso. La forma sale de `src/lib/plano.js`; aquí
 * solo se acomoda.
 *
 * En pantalla o tablet acostada va como el mapa oficial: 19 columnas, la mesa 1
 * abajo a la derecha y el acceso abajo. En el celular o la tablet parada no
 * cabría con los nombres legibles, así que el salón se gira: la mesa 1 arriba,
 * las puertas de servicio a la izquierda y el acceso a la derecha. Es el mismo
 * salón visto desde otro lado, no otro acomodo.
 *
 * El intercalado se pinta con medias filas: el eje corto tiene 2 × FILAS + 1
 * pistas y cada mesa ocupa dos. La columna baja empieza una pista después que
 * la alta, así cada mesa queda a media altura de las de al lado.
 *
 * `mediaFila` es el alto de media fila en horizontal. El papel lo sube porque su
 * mesa lleva además las carreras.
 *
 * Cada pantalla pinta su propia mesa y la pasa en `celda`: `/host` con los
 * colores de estado en vivo, `/admin/mesas` con los suyos y el papel en blanco
 * y negro. Lo que comparten es esto: las columnas, los rótulos y el giro.
 * `celda` recibe el número y si la mesa sale angosta, para ajustar la letra con
 * `letraDelNombre`.
 */
export default function PlanoSalon({ celda, excedentes = [], orientacion = 'auto', tono = 'oscuro', mediaFila = MEDIA_FILA }) {
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

  // El eje largo: las 19 columnas con sus huecos. En horizontal van de la 19
  // (izquierda) a la 1 (derecha); en vertical, de la 1 (arriba) a la 19.
  const orden = Array.from({ length: COLUMNAS }, (_, i) => horizontal ? COLUMNAS - i : i + 1)
  const pistaDe = {}
  const pistas = []
  orden.forEach((c, i) => {
    pistas.push(horizontal ? 'minmax(0, 1fr)' : 'auto')
    pistaDe[c] = pistas.length
    if (i < orden.length - 1) pistas.push(`${horizontal ? PASILLO.h : PASILLO.v}px`)
  })

  // El eje corto: rótulo de las puertas, las medias filas y rótulo del acceso.
  const MEDIAS = 2 * FILAS + 1
  const rotulo = horizontal ? ROTULO.h : ROTULO.v
  // En horizontal la media fila lleva alto fijo: con `auto` cada mesa estira las
  // pistas que cruza y las filas salen disparejas.
  const corto = [`${rotulo}px`, ...Array(MEDIAS).fill(horizontal ? `${mediaFila}px` : 'minmax(0, 1fr)'), `${rotulo}px`]

  // Qué tan ancha sale cada mesa, para ajustar la letra del nombre.
  const anchoMesa = horizontal
    ? ((ancho || 960) - (COLUMNAS - 1) * PASILLO.h) / COLUMNAS
    : 2 * (ancho - 2 * ROTULO.v - (MEDIAS + 1) * HUECO_CORTO) / MEDIAS + HUECO_CORTO
  const angosta = anchoMesa < 64

  // La pista 1 es el rótulo de las puertas; la mesa de la fila f ocupa dos medias
  // filas, una más abajo si su columna es de las bajas.
  const lugar = (columna, fila) => {
    const desde = 2 + 2 * (fila - 1) + (columnaBaja(columna) ? 1 : 0)
    const corta = `${desde} / span 2`
    return horizontal
      ? { gridColumn: pistaDe[columna], gridRow: corta }
      : { gridRow: pistaDe[columna], gridColumn: corta }
  }

  const accesoPistas = COLUMNAS_ACCESO.map(c => pistaDe[c])
  const [a1, a2] = [Math.min(...accesoPistas), Math.max(...accesoPistas)]
  const acceso = horizontal
    ? { gridColumn: `${a1} / ${a2 + 1}`, gridRow: MEDIAS + 2 }
    : { gridRow: `${a1} / ${a2 + 1}`, gridColumn: MEDIAS + 2 }
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
            : { gridTemplateRows: pistas.join(' '), gridTemplateColumns: corto.join(' '), columnGap: HUECO_CORTO, rowGap: 2 }}
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

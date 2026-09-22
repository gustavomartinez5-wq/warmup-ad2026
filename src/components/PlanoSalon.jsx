import { useEffect, useRef, useState } from 'react'
import { COLUMNAS, FILAS, MESAS_EN_PLANO, COLUMNAS_ACCESO, posicion, pasilloDespuesDe } from '../lib/plano'
import { pintar, textoEstado } from '../lib/estadoVivo'
import { comoReloj } from '../lib/reloj'
import { GIRO_PORTAFOLIO } from '../lib/cifras'

// A partir de este ancho va como el mapa oficial. Abajo de 900 las 15 columnas salen de
// menos de 50 px y el nombre de la empresa ya no se lee: una tablet parada lo ve vertical.
const HORIZONTAL_DESDE = 900
const PASILLO = { h: 14, v: 10 }
const PAR     = 3              // el hueco de las sillas entre dos mesas espalda con espalda
const ROTULO  = { h: 20, v: 14 }
const HUECO_CORTO = 4          // entre mesas de la misma columna

/**
 * El salón como está en el piso. La forma sale de `src/lib/plano.js`; aquí
 * solo se pinta.
 *
 * En pantalla o tablet acostada va como el mapa oficial: 15 columnas, la mesa 1
 * abajo a la derecha y el acceso abajo. En el celular o la tablet parada no
 * cabría con los nombres legibles, así que el salón se gira: la mesa 1 arriba, las puertas de
 * servicio a la izquierda y el acceso a la derecha. Es el mismo salón visto
 * desde otro lado, no otro acomodo.
 *
 * Con buscador o filtro, las mesas que no coinciden se apagan pero no se mueven:
 * el plano deja de servir si las mesas cambian de lugar.
 */
export default function PlanoSalon({ salon, coincide, ahora, tocable, onAbrir, onHueco }) {
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

  const horizontal = ancho >= HORIZONTAL_DESDE
  const porNumero = new Map((salon ?? []).map(m => [m.numero, m]))
  const excedentes = (salon ?? []).filter(m => !m.libre && m.numero > MESAS_EN_PLANO)

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
  const celda = horizontal
    ? (ancho - pasillos * PASILLO.h - (COLUMNAS - 1 - pasillos) * PAR) / COLUMNAS
    : (ancho - 2 * ROTULO.v - (FILAS + 1) * HUECO_CORTO) / FILAS
  const angosta = celda < 64

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
      {ancho > 0 && (
        <div
          className="grid"
          style={horizontal
            ? { gridTemplateColumns: pistas.join(' '), gridTemplateRows: corto.join(' '), rowGap: HUECO_CORTO }
            : { gridTemplateRows: pistas.join(' '), gridTemplateColumns: corto.join(' '), columnGap: HUECO_CORTO }}
        >
          <div style={{ ...puertas, ...vertical }}
               className={`${rotuloClase} text-lavanda/35`}>
            Puertas de servicio
          </div>
          <div style={{ ...acceso, ...vertical }}
               className={`${rotuloClase} text-teal rounded-md border border-dashed border-teal/70 bg-teal/10`}>
            Acceso
          </div>

          {Array.from({ length: MESAS_EN_PLANO }, (_, i) => {
            const numero = i + 1
            const { columna, fila } = posicion(numero)
            return (
              <div key={numero} style={lugar(columna, fila)} className={horizontal ? '' : 'py-0.5'}>
                <Mesa
                  mesa={porNumero.get(numero) ?? { numero, libre: true }}
                  apagada={coincide ? !coincide.has(numero) : false}
                  angosta={angosta} ahora={ahora} tocable={tocable}
                  onAbrir={onAbrir} onHueco={onHueco}
                />
              </div>
            )
          })}
        </div>
      )}

      {excedentes.length > 0 && (
        <div className="mt-4">
          <p className="text-[11px] text-lavanda/50 mb-1.5">Fuera del plano</p>
          <div className="flex flex-wrap gap-1.5">
            {excedentes.map(m => (
              <div key={m.numero} className="w-24">
                <Mesa mesa={m} apagada={coincide ? !coincide.has(m.numero) : false}
                      ahora={ahora} tocable={tocable} onAbrir={onAbrir} onHueco={onHueco} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

const anchoDePalabra = w => [...w].reduce((n, c) => n + (c !== c.toLowerCase() ? 1.35 : 1), 0)

function Mesa({ mesa, apagada, angosta, ahora, tocable, onAbrir, onHueco }) {
  const alto = 'min-h-[58px]'
  const apagado = apagada ? 'opacity-25' : ''

  if (mesa.libre) {
    return (
      <button
        disabled={!tocable} onClick={() => onHueco(mesa.numero)}
        aria-label={`Mesa ${mesa.numero}, libre`}
        className={`w-full h-full ${alto} rounded-md border border-dashed border-lavanda/25 px-1 py-1
                    text-lavanda/35 text-[11px] font-bold cifra flex items-start justify-start
                    transition-transform active:scale-95 disabled:active:scale-100 ${apagado}`}
      >
        {mesa.numero}
      </button>
    )
  }

  const p = pintar(mesa, ahora)
  const nombre = mesa.empresa.replace(/^Portafolio · /, '')
  // Una palabra larga («Management», «COPARMEX») no cabe en la mesa angosta y se
  // partiría a media palabra. Esa sola baja un punto. La mayúscula ocupa más.
  const palabraLarga = Math.max(...nombre.split(/\s+/).map(anchoDePalabra)) > 9
  const letra = !angosta ? 'text-[11px] tracking-tight'
              : palabraLarga ? 'text-[9px] tracking-tighter' : 'text-[10px] tracking-tight'
  const relleno = angosta ? 'px-0.5' : 'px-1'
  const portafolio = mesa.giro === GIRO_PORTAFOLIO
    ? 'outline-2 outline-dashed outline-offset-1 outline-lavanda' : ''
  return (
    <button
      onClick={() => onAbrir(mesa.numero)}
      aria-label={`Mesa ${mesa.numero}, ${mesa.empresa}, ${textoEstado(mesa.estado)}`}
      title={`${mesa.numero} · ${mesa.empresa}`}
      className={`w-full h-full ${alto} rounded-md border ${relleno} py-1 text-left flex flex-col justify-between
                  min-w-0 transition-transform active:scale-95 ${p.celda} ${portafolio} ${apagado}`}
    >
      <span className="flex items-baseline justify-between gap-0.5 min-w-0">
        <span className="text-[11px] font-extrabold cifra">{mesa.numero}</span>
        {mesa.estado === 'ocupado' && (
          <span className="text-[10px] font-bold cifra">{comoReloj(p.segundos)}</span>
        )}
      </span>
      {/* En la zona de portafolio el contorno ya dice qué es; «Portafolio · » se
          comería el poco espacio y las tres mesas se leerían igual. */}
      <span className={`${letra} leading-tight line-clamp-3 break-words font-medium`}>
        {nombre}
      </span>
    </button>
  )
}

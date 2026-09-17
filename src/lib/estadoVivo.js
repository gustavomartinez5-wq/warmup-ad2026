import { AMBAR, LIMITE, PARPADEO, segundosDesde } from './reloj.js'

/**
 * Cómo se pinta una mesa el día del evento.
 *
 * La mesa ocupada escala de color con el tiempo: azul mientras va bien, ámbar a
 * los 18 y rojo pasados los 20. Así el salón se lee de reojo y las que llevan
 * mucho saltan solas, que es para lo que existe esta pantalla.
 *
 * Break lleva ámbar también, pero como contorno punteado y sin cronómetro: no se
 * confunde con una sesión que ya se pasó de tiempo.
 *
 * `sin_dato` es la mesa que viene del mapa horneado cuando la base no contestó.
 * Tiene su propia rama a propósito: antes cualquier estado desconocido caía al
 * final y salía teal, o sea idéntico a «disponible». Con el mapa fijo eso habría
 * pintado el salón entero de verde y un host habría mandado estudiantes a mesas
 * ocupadas. Gris, hasta el final de la lista, y fuera de los conteos.
 */

export const ESTADOS = [
  { clave: 'disponible', texto: 'Disponible' },
  { clave: 'ocupado',    texto: 'Ocupado' },
  { clave: 'break',      texto: 'Break' },
  { clave: 'no_llego',   texto: 'No llegó' },
]

export const textoEstado = clave =>
  clave === 'sin_dato' ? 'Sin dato'
    : ESTADOS.find(e => e.clave === clave)?.texto ?? 'Sin marcar'

/** Orden para la lista: primero lo que sirve para mandar a alguien. */
const PESO = { disponible: 0, break: 1, ocupado: 2, no_llego: 3, sin_dato: 4 }

export function pintar(mesa, ahora = Date.now()) {
  const segundos = mesa.estado === 'ocupado' && mesa.ocupado_desde
    ? segundosDesde(mesa.ocupado_desde, ahora)
    : 0

  if (mesa.estado === 'ocupado') {
    if (segundos >= PARPADEO) return { celda: 'bg-rojo/85  border-rojo  text-white', segundos, parpadea: false, alerta: true }
    if (segundos >= LIMITE)   return { celda: 'bg-rojo/85  border-rojo  text-white', segundos, parpadea: true,  alerta: true }
    if (segundos >= AMBAR)    return { celda: 'bg-ambar/85 border-ambar text-marino', segundos, parpadea: false, alerta: true }
    return { celda: 'bg-tec border-tec-claro text-white', segundos, parpadea: false, alerta: false }
  }

  if (mesa.estado === 'break') {
    return { celda: 'bg-marino-alto border-ambar border-dashed text-ambar', segundos: 0, parpadea: false, alerta: false }
  }
  if (mesa.estado === 'no_llego') {
    return { celda: 'bg-marino-alto/40 border-lavanda/20 text-lavanda/45', segundos: 0, parpadea: false, alerta: false }
  }
  if (mesa.estado === 'sin_dato') {
    return { celda: 'bg-marino-alto border-lavanda/30 text-lavanda-suave/80', segundos: 0, parpadea: false, alerta: false }
  }
  return { celda: 'bg-teal/80 border-teal text-white', segundos: 0, parpadea: false, alerta: false }
}

/** Disponibles arriba; entre iguales, las que llevan más tiempo primero. */
export function ordenarParaLista(mesas, ahora = Date.now()) {
  return [...mesas].sort((a, b) => {
    const pa = PESO[a.estado] ?? 0
    const pb = PESO[b.estado] ?? 0
    if (pa !== pb) return pa - pb
    if (a.estado === 'ocupado' && b.estado === 'ocupado') {
      return segundosDesde(b.ocupado_desde, ahora) - segundosDesde(a.ocupado_desde, ahora)
    }
    return a.numero - b.numero
  })
}

export function contarPorEstado(mesas) {
  const cuenta = { disponible: 0, ocupado: 0, break: 0, no_llego: 0, sin_dato: 0, pasadas: 0 }
  const ahora = Date.now()
  for (const m of mesas) {
    cuenta[m.estado] = (cuenta[m.estado] ?? 0) + 1
    if (m.estado === 'ocupado' && segundosDesde(m.ocupado_desde, ahora) >= LIMITE) cuenta.pasadas++
  }
  return cuenta
}

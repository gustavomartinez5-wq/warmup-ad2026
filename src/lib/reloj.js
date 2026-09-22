/**
 * El reloj del evento: qué bloque corre y cómo se lee el cronómetro.
 *
 * Los umbrales salen de lo que pidió Gustavo: ámbar a los 18 minutos, rojo
 * parpadeante al llegar a 20, y rojo fijo de ahí en adelante para ver cuánto
 * lleva de más. Los usan igual la pantalla del reclutador y la del host: si el
 * reclutador ve rojo, el equipo tiene que ver rojo.
 *
 * El parpadeo solo se pinta en la hoja de detalle de `/host`. En `/mesa` se
 * quitó el 21-sep: frente al estudiante, el reclutador lo sentía como regaño.
 */

export const AMBAR    = 18 * 60
export const LIMITE   = 20 * 60
export const PARPADEO = 21 * 60   // después de este minuto el rojo se queda quieto

/** Bloque 1 va de 10 a 13 h y Bloque 2 de 14 a 17 h. El corte es la 13:30. */
export function bloquePorReloj(ahora = new Date()) {
  const minutos = ahora.getHours() * 60 + ahora.getMinutes()
  return minutos < 13 * 60 + 30 ? 'b1' : 'b2'
}

/** Segundos corridos desde que se marcó Ocupado. */
export function segundosDesde(iso, ahora = Date.now()) {
  if (!iso) return 0
  return Math.max(0, Math.floor((ahora - new Date(iso).getTime()) / 1000))
}

export function comoReloj(segundos) {
  const m = Math.floor(segundos / 60)
  const s = segundos % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/**
 * Cómo se pinta el cronómetro. `parpadea` solo durante el minuto 20:
 * después el rojo se queda fijo para que no distraiga toda la sesión.
 */
export function tonoDelTiempo(segundos) {
  if (segundos >= PARPADEO) return { clase: 'text-rojo',   parpadea: false, pasado: true }
  if (segundos >= LIMITE)   return { clase: 'text-rojo',   parpadea: true,  pasado: true }
  if (segundos >= AMBAR)    return { clase: 'text-ambar',  parpadea: false, pasado: false }
  return { clase: 'text-white', parpadea: false, pasado: false }
}

/** «2:14 de más» cuando ya se pasó de los 20 minutos. */
export function deMas(segundos) {
  if (segundos < LIMITE) return null
  return `${comoReloj(segundos - LIMITE)} de más`
}

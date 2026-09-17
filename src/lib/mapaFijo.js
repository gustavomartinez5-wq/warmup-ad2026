import mapa from '../datos/mapa-fijo.json'

/**
 * El salón horneado dentro de la app: qué empresa está en cada mesa, su giro y
 * las carreras que busca. Eso no cambia durante el evento, así que no hay razón
 * para depender de la red para pintarlo.
 *
 * Sirve para dos cosas: que la pantalla abra llena en vez de en blanco, y que si
 * la base no contesta el equipo siga viendo el mapa completo y el buscador.
 *
 * Lo vivo —el estado de la mesa y su reloj— nunca vive aquí. Por eso todas las
 * mesas salen en `sin_dato`: no sabemos cómo están, y decir «disponible» sin
 * saberlo mandaría a un estudiante a una mesa ocupada.
 *
 * Se regenera con `node scripts/hornear-mapa.mjs`.
 */

export function mesasFijas(bloque) {
  return (mapa.bloques[bloque] ?? []).map(m => ({
    ...m,
    estado: 'sin_dato',
    ocupado_desde: null,
  }))
}

export const carrerasFijas = () => mapa.carreras

/** Para decirle al equipo de cuándo son los datos que está viendo. */
export function fechaDelMapa() {
  const d = new Date(mapa.generado_en)
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
}

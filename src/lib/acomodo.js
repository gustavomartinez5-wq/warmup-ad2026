import { GIRO_PORTAFOLIO } from './cifras.js'

/**
 * El acomodo del salón, sin pantalla: de filas de `reclutadores` a fichas de
 * empresa, y de un orden de fichas a los números de mesa que les tocan.
 *
 * Una ficha es una empresa completa en un bloque. Sus mesas van siempre seguidas:
 * la ficha ocupa tantos números como filas tiene la empresa en ese bloque. Al
 * cambiar el orden, todas se renumeran desde la 1, igual que hace
 * `reordenar_salon` (migración 12). La base es la que manda; esto es para enseñar
 * los números antes de guardar.
 *
 * La zona de portafolio no se acomoda: se queda en sus números, al final.
 */

/** Las fichas del bloque en el orden en que están hoy, y aparte las de portafolio. */
export function fichasDelBloque({ filas, empresas, bloque }) {
  const porId = new Map(empresas.map(e => [e.id, e]))
  const grupos = new Map()
  for (const f of filas) {
    if (f.bloque !== bloque) continue
    const g = grupos.get(f.empresa_id) ?? []
    g.push(f.mesa_numero)
    grupos.set(f.empresa_id, g)
  }

  const fichas = [...grupos].map(([id, mesas]) => {
    const e = porId.get(id)
    const numeros = mesas.filter(n => n != null).sort((a, b) => a - b)
    return {
      id,
      nombre: e?.nombre ?? '—',
      giro: e?.giro ?? null,
      mesas: mesas.length,
      desde: numeros[0] ?? Infinity,
      numeros,
    }
  })

  const porNumero = (a, b) => a.desde - b.desde || a.nombre.localeCompare(b.nombre, 'es')
  return {
    movibles:   fichas.filter(f => f.giro !== GIRO_PORTAFOLIO).sort(porNumero),
    portafolio: fichas.filter(f => f.giro === GIRO_PORTAFOLIO).sort(porNumero),
  }
}

/** Los números que le tocan a cada ficha en este orden: desde la 1, sin huecos. */
export function numerar(fichas) {
  let siguiente = 1
  return fichas.map(f => {
    const numeros = Array.from({ length: f.mesas }, (_, i) => siguiente + i)
    siguiente += f.mesas
    return { ...f, nuevos: numeros }
  })
}

/** «16» o «16–18». */
export const rango = numeros =>
  numeros.length === 0 ? '—'
    : numeros.length === 1 ? String(numeros[0])
      : `${numeros[0]}–${numeros[numeros.length - 1]}`

/** ¿Esta ficha cambia de números con el orden nuevo? */
export const cambia = f =>
  f.nuevos.length !== f.numeros.length || f.nuevos.some((n, i) => n !== f.numeros[i])

/** El orden alfabético, como quedó el salón el 22-sep. */
export const alfabetico = fichas =>
  [...fichas].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }))

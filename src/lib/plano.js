/**
 * La forma del salón, tal como la dibuja el mapa oficial:
 * `Ediciones/WarmUp AD26/WarmUp AD26 - Mapa del evento.html`, en el vault.
 * Si el salón cambia, se corrige aquí y en ese mapa, y los dos tienen que decir
 * lo mismo: el día del evento el host camina con lo que ve en el plano.
 *
 * 15 columnas de 5 mesas. Las columnas 1 a 14 van en pares espalda con espalda
 * —1 y 2, 3 y 4…— y la 15 va sola contra el muro. La numeración es en zigzag
 * desde la mesa 1, abajo a la derecha: la columna impar sube (1 abajo, 5
 * arriba) y la par baja (6 arriba, 10 abajo).
 *
 * «Arriba» es el muro de las puertas de servicio y «abajo» la mampara con el
 * acceso, que queda frente al par de las columnas 7 y 8 (mesas 31 a 40).
 */

export const COLUMNAS = 15
export const FILAS    = 5
export const MESAS_EN_PLANO = COLUMNAS * FILAS

/** Las dos columnas frente al acceso. */
export const COLUMNAS_ACCESO = [7, 8]

/**
 * Dónde cae una mesa: su columna (1 a la derecha, 15 a la izquierda) y su fila
 * contada desde el muro de las puertas (1) hasta la mampara del acceso (5).
 * Una mesa fuera del salón —excedente— no tiene lugar: devuelve null.
 */
export function posicion(numero) {
  if (!Number.isInteger(numero) || numero < 1 || numero > MESAS_EN_PLANO) return null
  const columna = Math.ceil(numero / FILAS)
  const k = numero - (columna - 1) * FILAS          // 1 a 5 dentro de la columna
  const fila = columna % 2 === 1 ? FILAS - k + 1 : k
  return { columna, fila }
}

/** Entre esta columna y la siguiente hay pasillo (true) o solo las sillas del par (false). */
export const pasilloDespuesDe = columna => columna % 2 === 0

/**
 * En la zona de portafolio el contorno punteado ya dice qué es, y «Portafolio · »
 * se comería el espacio: las tres mesas se leerían igual.
 */
export const nombreCorto = empresa => (empresa ?? '').replace(/^Portafolio · /, '')

const anchoDePalabra = w => [...w].reduce((n, c) => n + (c !== c.toLowerCase() ? 1.35 : 1), 0)

/**
 * Una palabra larga («Management», «COPARMEX») no cabe en la mesa angosta y se
 * partiría a media palabra. Esa sola baja un punto. La mayúscula ocupa más.
 */
export const tienePalabraLarga = nombre =>
  Math.max(...String(nombre).split(/\s+/).map(anchoDePalabra)) > 9

export function letraDelNombre(nombre, angosta) {
  if (!angosta) return 'text-[11px] tracking-tight'
  return tienePalabraLarga(nombre) ? 'text-[9px] tracking-tighter' : 'text-[10px] tracking-tight'
}

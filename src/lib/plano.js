/**
 * La forma del salón en la app: cuántas columnas hay, cuántas mesas lleva cada una
 * y en qué orden van los números. Sirve para ubicar cada número y acomodar a las
 * empresas; no es un dibujo a escala.
 *
 * Montaje del 26-sep: 19 columnas, 75 mesas. La columna 1 lleva tres, sin la de
 * arriba; las otras 18 llevan cuatro. En el piso las columnas van intercaladas,
 * como en `Ediciones/WarmUp AD26/WarmUp AD26 - Mapa del evento final 28 de
 * septiembre.html`, en el vault. Aquí van en filas parejas, a propósito
 * (decidido el 26-sep): lo que importa en la app son las columnas y los números.
 *
 * La numeración sigue en zigzag desde la mesa 1, abajo a la derecha: la columna
 * impar sube y la par baja. La 1 va de la 1 abajo a la 3; la 2 baja de la 4 a la 7;
 * la 3 sube de la 8 a la 11. La columna 19, contra el snack del muro izquierdo, es
 * la de las mesas 72 a 75.
 *
 * «Arriba» es el muro de las puertas de servicio y «abajo» la mampara con el
 * acceso, que queda frente a las columnas 9 a 11 (mesas 32 a 43).
 */

export const COLUMNAS = 19
export const FILAS    = 4
/** La columna 1 no lleva la mesa de arriba. */
export const EN_LA_PRIMERA = 3
export const MESAS_EN_PLANO = EN_LA_PRIMERA + (COLUMNAS - 1) * FILAS

/** Las columnas frente al acceso, de la primera a la última. */
export const COLUMNAS_ACCESO = [9, 11]

/**
 * Dónde cae una mesa: su columna (1 a la derecha, 19 a la izquierda) y su fila
 * contada desde el muro de las puertas (1) hasta la mampara del acceso (4).
 * Una mesa fuera del salón —excedente— no tiene lugar: devuelve null.
 */
export function posicion(numero) {
  if (!Number.isInteger(numero) || numero < 1 || numero > MESAS_EN_PLANO) return null
  // La columna 1 sube desde abajo y se queda sin la fila 1.
  if (numero <= EN_LA_PRIMERA) return { columna: 1, fila: FILAS - numero + 1 }
  const resto = numero - EN_LA_PRIMERA
  const columna = 1 + Math.ceil(resto / FILAS)
  const k = resto - (columna - 2) * FILAS           // 1 a 4 dentro de la columna
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

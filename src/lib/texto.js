/**
 * Comparación de texto para los buscadores.
 *
 * Quita acentos y mayúsculas: el día del evento nadie va a escribir «Mecatrónica»
 * con acento en el teclado del celular, y tiene que encontrarla igual.
 */
export const plano = t =>
  (t ?? '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()

export const contiene = (texto, query) => plano(texto).includes(query)

import { supabase } from './supabase.js'
import { sinBase } from './config.js'

/**
 * Lo único que la app hace sin sesión iniciada. Son las dos funciones que
 * el reclutador toca desde el QR; todo lo demás pide cuenta del equipo.
 */

/** Las mesas de un bloque, con su empresa y su estado. Sin nombres de personas. */
export async function mesasDelBloque(bloque) {
  if (sinBase()) throw new Error('Modo de prueba: sin conexión con la base.')
  const { data, error } = await supabase.rpc('mesas_publicas', { p_bloque: bloque })
  if (error) throw error
  return data ?? []
}

/** Cambia el estado de una mesa. Marcar Ocupado arranca una sesión nueva. */
export async function cambiarEstado(numero, bloque, estado) {
  if (sinBase()) throw new Error('Modo de prueba: sin conexión con la base.')
  const { data, error } = await supabase.rpc('set_estado_mesa', {
    p_numero: numero, p_bloque: bloque, p_estado: estado,
  })
  if (error) throw error
  return data
}

/**
 * La mesa que eligió esta persona, para que una recarga no la haga elegir de nuevo.
 * Vive solo en su teléfono: se puede perder sin que pase nada.
 */
const LLAVE = 'warmup-mi-mesa'

export function recordarMesa(numero, bloque) {
  try { localStorage.setItem(LLAVE, JSON.stringify({ numero, bloque })) } catch { /* modo privado */ }
}

export function mesaRecordada() {
  try {
    const crudo = localStorage.getItem(LLAVE)
    if (!crudo) return null
    const { numero, bloque } = JSON.parse(crudo)
    return Number.isInteger(numero) && (bloque === 'b1' || bloque === 'b2')
      ? { numero, bloque } : null
  } catch { return null }
}

export function olvidarMesa() {
  try { localStorage.removeItem(LLAVE) } catch { /* modo privado */ }
}

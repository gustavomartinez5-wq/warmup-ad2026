import { createClient } from '@supabase/supabase-js'
import { SUPABASE_URL, SUPABASE_KEY } from './config.js'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

/**
 * La edición activa, con las columnas que cualquiera puede leer.
 * Sirve tanto al reclutador (sin sesión) como al equipo. Solo hay una activa
 * a la vez: lo garantiza un índice único en la base.
 */
export async function edicionActiva() {
  const { data, error } = await supabase
    .from('ediciones')
    .select('id, nombre, fecha, activa')
    .eq('activa', true)
    .maybeSingle()
  if (error) throw error
  return data
}

/**
 * La edición con todo, incluidos total_mesas y los supuestos de cupo.
 * Pide sesión y estar en la lista del equipo: anon no puede leer esas columnas.
 */
export async function edicionCompleta() {
  const { data, error } = await supabase
    .from('ediciones').select('*').eq('activa', true).maybeSingle()
  if (error) throw error
  return data
}

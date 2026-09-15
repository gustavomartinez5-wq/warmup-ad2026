import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !key) {
  // Falla temprano y claro: sin esto ninguna pantalla sirve.
  console.error('Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY. Ver .env.example')
}

export const supabase = createClient(url, key)

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

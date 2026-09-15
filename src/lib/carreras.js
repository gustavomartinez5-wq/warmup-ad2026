import { supabase } from './supabase.js'

/**
 * El catálogo de carreras. Lectura pública: no es dato de nadie.
 * La vista de host lo necesita para que el buscador entienda «mecatrónica»
 * además de «IMT».
 */
export async function catalogoDeCarreras() {
  const { data, error } = await supabase.from('carreras').select('siglas, nombre, escuela')
  if (error) throw error
  return data ?? []
}

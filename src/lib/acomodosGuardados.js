import { supabase, edicionActiva } from './supabase'

/**
 * Mapas guardados: tres espacios para guardar un acomodo y cargarlo después, como las
 * partidas de un juego. Cada uno guarda los dos bloques. Ver la migración 14.
 *
 * Guardar no mueve mesas. Cargar solo arma un borrador para el editor; lo que cambia el
 * salón sigue siendo «Guardar acomodo» → `acomodar_mesas`.
 */

export const RANURAS = [1, 2, 3]

export async function listarGuardados() {
  const ed = await edicionActiva()
  if (!ed) throw new Error('No hay una edición activa.')
  const { data, error } = await supabase
    .from('acomodos_guardados')
    .select('ranura, nombre, filas, guardado_en')
    .eq('edicion_id', ed.id)
    .order('ranura')
  if (error) throw error
  return data ?? []
}

/**
 * Guarda los dos bloques en una ranura. El bloque que se está editando va como se ve
 * en el borrador; el otro, como está en la base. Así un acomodo se puede guardar sin
 * aplicarlo al salón.
 */
export async function guardarAcomodo({ ranura, nombre, bloque, borrador }) {
  const ed = await edicionActiva()
  if (!ed) throw new Error('No hay una edición activa.')
  const [r, e] = await Promise.all([
    supabase.from('reclutadores').select('id, bloque, empresa_id, mesa_numero, estatus').eq('edicion_id', ed.id),
    supabase.from('empresas').select('id, nombre').eq('edicion_id', ed.id),
  ])
  for (const res of [r, e]) if (res.error) throw res.error
  const empresaDe = new Map(e.data.map(x => [x.id, x.nombre]))

  const filas = { b1: [], b2: [] }
  for (const f of r.data) {
    if (f.estatus === 'cancelado' || !filas[f.bloque]) continue
    const numero = f.bloque === bloque && borrador.has(f.id) ? borrador.get(f.id) : f.mesa_numero
    if (numero == null) continue
    filas[f.bloque].push({ fila: f.id, empresa: empresaDe.get(f.empresa_id) ?? '—', numero })
  }
  for (const b of Object.keys(filas)) filas[b].sort((a, c) => a.numero - c.numero)

  const { data: { session } } = await supabase.auth.getSession()
  const { error } = await supabase.from('acomodos_guardados').upsert({
    edicion_id: ed.id, ranura, nombre: nombre.trim(), filas,
    guardado_por: session?.user?.id ?? null, guardado_en: new Date().toISOString(),
  }, { onConflict: 'edicion_id,ranura' })
  if (error) throw error
}

/**
 * El borrador que sale de un mapa guardado, para un bloque. Las filas son las de hoy,
 * y entre que se guardó y hoy pudo haber bajas y altas:
 *   1. la misma fila vuelve a su número;
 *   2. si la persona cambió, la empresa toma el número que tenía su mesa;
 *   3. una fila que no estaba se queda en su número si quedó libre, o pasa a la
 *      primera mesa libre;
 *   4. lo guardado que ya no existe deja su mesa libre.
 * Devuelve { nuevo: Map(fila → número), avisos: [texto] } o { error }.
 */
export function planDesdeGuardado(guardado, filas, bloque, totalMesas) {
  const guardadas = (guardado.filas?.[bloque] ?? [])
    .filter(g => Number.isInteger(g.numero) && g.numero >= 1 && g.numero <= totalMesas)
    .sort((a, c) => a.numero - c.numero)
  const porFila = new Map(guardadas.map(g => [g.fila, g]))
  const usadas = new Set()
  const nuevo = new Map()
  const porNumeroActual = (a, c) => (a.mesa_numero ?? Infinity) - (c.mesa_numero ?? Infinity)

  for (const f of filas) {
    const g = porFila.get(f.id)
    if (g) { nuevo.set(f.id, g.numero); usadas.add(g) }
  }

  const sinLugar = []
  for (const f of filas.filter(f => !nuevo.has(f.id)).sort(porNumeroActual)) {
    const g = guardadas.find(x => x.empresa === f.empresa && !usadas.has(x))
    if (g) { nuevo.set(f.id, g.numero); usadas.add(g) } else sinLugar.push(f)
  }

  const ocupados = new Set(nuevo.values())
  const avisos = []
  for (const f of sinLugar) {
    let n = f.mesa_numero
    if (n == null || n > totalMesas || ocupados.has(n)) {
      n = null
      for (let k = 1; k <= totalMesas; k++) if (!ocupados.has(k)) { n = k; break }
    }
    if (n == null) return { error: `No cabe: ${f.empresa} no encuentra mesa libre en el salón.` }
    nuevo.set(f.id, n); ocupados.add(n)
    avisos.push(`${f.empresa} no estaba en «${guardado.nombre}»: va a la ${n}.`)
  }

  const yaNo = [...new Set(guardadas.filter(g => !usadas.has(g)).map(g => g.empresa))]
  if (yaNo.length) avisos.push(`Ya no están: ${yaNo.join(', ')}. Sus mesas quedan libres.`)

  return { nuevo, avisos }
}

/** «24 sep, 18:05» */
export const cuandoSeGuardo = iso => new Date(iso).toLocaleString('es-MX', {
  day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
})

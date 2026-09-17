import { supabase, edicionActiva } from './supabase.js'

/**
 * Lo que el equipo puede hacer con el salón el día del evento: cambiar qué
 * empresa se sienta en cada mesa, agregar una mesa y dar de alta una empresa
 * que llegó sin avisar.
 *
 * Por qué existe aparte de `mesaPublica.js`: `mesas_publicas` devuelve nombres,
 * no ids, porque la llama `anon` desde el QR. Para editar hay que direccionar la
 * fila, y eso pide sesión y estar en `equipo`. Son dos puertas distintas y
 * conviene que se vean distintas en el código.
 *
 * **Nunca se pide `reclutadores.nombre`.** Es el nombre de una persona de fuera
 * del Tec, no sale a ninguna pantalla y para arreglar el salón no hace falta.
 */

/**
 * Todo lo que necesita la hoja de edición, en dos consultas. Se llama al abrirla
 * por primera vez, no al abrir `/host`: quien nunca edite no paga nada.
 *
 * Las filas vienen de los dos bloques a propósito: el índice único de la base es
 * por (edición, bloque, mesa), así que para avisar de un choque hay que verlos.
 */
export async function datosDelSalon() {
  const edicion = await edicionActiva()
  if (!edicion) throw new Error('No hay una edición activa en la base.')

  const [filas, empresas] = await Promise.all([
    supabase.from('reclutadores')
      .select('id, mesa_numero, bloque, empresa_id')
      .eq('edicion_id', edicion.id),
    supabase.from('empresas')
      .select('id, nombre, giro, empresa_carreras(siglas)')
      .eq('edicion_id', edicion.id).order('nombre'),
  ])
  if (filas.error) throw filas.error
  if (empresas.error) throw empresas.error

  return {
    edicionId: edicion.id,
    filas: filas.data ?? [],
    empresas: (empresas.data ?? []).map(e => ({
      id: e.id,
      nombre: e.nombre,
      giro: e.giro,
      carreras: (e.empresa_carreras ?? []).map(c => c.siglas).sort(),
    })),
  }
}

/** La fila que manda en una mesa. Si no hay, esa mesa no está asignada. */
export const filaDeLaMesa = (filas, bloque, numero) =>
  filas.find(f => f.bloque === bloque && f.mesa_numero === numero) ?? null

/**
 * ¿Ya hay alguien en esa mesa y ese bloque? La base no lo permite —índice
 * `reclutadores_mesa_unica`— así que se avisa antes de intentar, no después.
 */
export const mesaOcupada = (filas, bloque, numero, exceptoId = null) =>
  filas.some(f => f.id !== exceptoId && f.bloque === bloque && f.mesa_numero === numero)

/**
 * Cambia quién se sienta en una mesa, y de paso su número si se movió de lugar.
 *
 * El nombre pasa a «Por definir» cuando cambia la empresa: la fila traía el
 * nombre de la persona de la empresa anterior, y dejarlo puesto sería decir que
 * esa persona ahora trabaja en la nueva. El Tablero cuenta uno más en «nombres
 * por confirmar», que es la verdad.
 */
export async function cambiarLaMesa({ filaId, empresaId, numero, cambioDeEmpresa }) {
  const campos = { empresa_id: empresaId, mesa_numero: numero }
  if (cambioDeEmpresa) campos.nombre = 'Por definir'

  const { error } = await supabase.from('reclutadores').update(campos).eq('id', filaId)
  if (error) throw error
}

/** Una mesa que nadie había apartado. Llegaron sin avisar y hay dónde sentarlos. */
export async function agregarMesa({ edicionId, bloque, numero, empresaId }) {
  const { error } = await supabase.from('reclutadores').insert({
    edicion_id:  edicionId,
    empresa_id:  empresaId,
    nombre:      'Por definir',
    bloque,
    estatus:     'confirmado',   // están parados ahí; no hay nada que confirmar
    mesa_numero: numero,
  })
  if (error) throw error
}

/**
 * Da de alta una empresa que no venía en el Excel. El mínimo que pide la base
 * es la edición y el nombre.
 */
export async function crearEmpresa({ edicionId, nombre, giro }) {
  const { data, error } = await supabase.from('empresas')
    .insert({ edicion_id: edicionId, nombre: nombre.trim(), giro: giro?.trim() || null })
    .select('id, nombre, giro')
    .single()

  if (error) {
    // unique (edicion_id, nombre): ya existe. Se elige la que está, no se duplica.
    if (error.code === '23505') throw new Error(`«${nombre.trim()}» ya está registrada. Elígela de la lista.`)
    throw error
  }
  return { ...data, carreras: [] }
}

/**
 * Las carreras de una empresa. Se borran y se vuelven a poner, igual que en la
 * ficha de admin — pero aquí sí se revisan los dos resultados: si el insert
 * falla después de que el delete pasó, las etiquetas se van sin decir nada.
 */
export async function guardarCarreras(empresaId, siglas) {
  const { error: errBorrar } = await supabase
    .from('empresa_carreras').delete().eq('empresa_id', empresaId)
  if (errBorrar) throw errBorrar

  if (!siglas.length) return
  const { error: errPoner } = await supabase.from('empresa_carreras')
    .insert(siglas.map(s => ({ empresa_id: empresaId, siglas: s })))
  if (errPoner) {
    throw new Error(`Se quitaron las carreras pero no se pudieron poner las nuevas: ${errPoner.message}`)
  }
}

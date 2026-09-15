import { supabase } from './supabase.js'

/**
 * Compara lo que trae el Excel contra lo que ya está en la base.
 *
 * Las empresas se actualizan sin perder su id, para que no se caigan las carreras
 * que alguien ya etiquetó. Los reclutadores se reemplazan completos: en esa tabla
 * no vive nada que se haya capturado desde la app.
 */

const CAMPOS_EMPRESA = [
  'giro', 'representante', 'correo', 'celular', 'areas_texto', 'perfiles_texto', 'notas',
]

const igual = (a, b) => (a ?? null) === (b ?? null)

export function compararImportacion({ empresasActuales, reclutadoresActuales, libro }) {
  const porNombre = new Map(empresasActuales.map(e => [e.nombre, e]))
  const enLibro   = new Set(libro.empresas.map(e => e.nombre))

  const altas = [], cambios = [], bajas = [], sinTocar = []

  for (const nueva of libro.empresas) {
    const vieja = porNombre.get(nueva.nombre)
    if (!vieja) { altas.push(nueva); continue }

    const campos = CAMPOS_EMPRESA.filter(c => !igual(vieja[c], nueva[c]))
    if (campos.length) cambios.push({ nombre: nueva.nombre, id: vieja.id, campos, vieja, nueva })
    else sinTocar.push(nueva.nombre)
  }

  for (const vieja of empresasActuales) {
    if (!enLibro.has(vieja.nombre)) bajas.push(vieja)
  }

  // Los reclutadores se cuentan, no se comparan uno por uno: se reemplazan enteros.
  const cuenta = filas => ({
    total: filas.length,
    b1: filas.filter(r => r.bloque === 'b1').length,
    b2: filas.filter(r => r.bloque === 'b2').length,
  })

  return {
    altas, cambios, bajas, sinTocar,
    reclutadores: { antes: cuenta(reclutadoresActuales), despues: cuenta(libro.reclutadores) },
    avisos: libro.avisos,
  }
}

/**
 * Aplica la importación. Las bajas no se borran solas: se avisan y las decide Gustavo.
 */
export async function aplicarImportacion({ edicionId, libro }) {
  const pasos = []

  // 1. Empresas. El upsert por (edicion_id, nombre) conserva el id y sus carreras.
  const { data: empresas, error: errEmpresas } = await supabase
    .from('empresas')
    .upsert(
      libro.empresas.map(e => ({ ...e, edicion_id: edicionId })),
      { onConflict: 'edicion_id,nombre' }
    )
    .select('id, nombre')
  if (errEmpresas) throw new Error(`Al guardar empresas: ${errEmpresas.message}`)
  pasos.push(`${empresas.length} empresas guardadas`)

  const idPorNombre = new Map(empresas.map(e => [e.nombre, e.id]))

  // 2. Reclutadores: fuera los de esta edición y entran los del libro.
  const sinEmpresa = libro.reclutadores.filter(r => !idPorNombre.has(r.empresa))
  if (sinEmpresa.length) {
    throw new Error(
      `Estos reclutadores traen una empresa que no está en la hoja Empresas: ` +
      [...new Set(sinEmpresa.map(r => r.empresa))].join(', ')
    )
  }

  const { error: errBorrar } = await supabase
    .from('reclutadores').delete().eq('edicion_id', edicionId)
  if (errBorrar) throw new Error(`Al limpiar reclutadores: ${errBorrar.message}`)

  const { error: errInsertar } = await supabase.from('reclutadores').insert(
    libro.reclutadores.map(r => ({
      edicion_id:  edicionId,
      empresa_id:  idPorNombre.get(r.empresa),
      nombre:      r.nombre,
      bloque:      r.bloque,
      estatus:     r.estatus,
      mesa_numero: r.mesa_numero,
      notas:       r.notas,
    }))
  )
  if (errInsertar) throw new Error(`Al guardar reclutadores: ${errInsertar.message}`)
  pasos.push(`${libro.reclutadores.length} reclutadores guardados`)

  // 3. Pendientes: la nota de cada empresa es un pendiente abierto.
  //    Se respetan los que ya estaban marcados como resueltos.
  const { data: yaEstaban } = await supabase
    .from('pendientes').select('texto, resuelto').eq('edicion_id', edicionId)
  const resueltos = new Set((yaEstaban ?? []).filter(p => p.resuelto).map(p => p.texto))

  await supabase.from('pendientes').delete().eq('edicion_id', edicionId)

  const pendientes = libro.empresas
    .filter(e => e.notas)
    .map(e => ({
      edicion_id: edicionId,
      empresa_id: idPorNombre.get(e.nombre),
      texto:      e.notas,
      resuelto:   resueltos.has(e.notas),
    }))
  if (pendientes.length) {
    const { error } = await supabase.from('pendientes').insert(pendientes)
    if (error) throw new Error(`Al guardar pendientes: ${error.message}`)
    pasos.push(`${pendientes.length} pendientes`)
  }

  return pasos
}

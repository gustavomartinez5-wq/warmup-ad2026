import { supabase, edicionCompleta } from './supabase.js'

/**
 * Lo que el equipo puede hacer con el salón el día del evento: cambiar qué
 * empresa se sienta en cada mesa, moverla, intercambiarla con otra, recorrer un
 * tramo, liberarla, agregar una mesa y dar de alta una empresa que llegó sin
 * avisar.
 *
 * Por qué existe aparte de `mesaPublica.js`: `mesas_publicas` devuelve nombres,
 * no ids, porque la llama `anon` desde el QR. Para editar hay que direccionar la
 * fila, y eso pide sesión y estar en `equipo`. Son dos puertas distintas y
 * conviene que se vean distintas en el código.
 *
 * **Los movimientos van a funciones de Postgres, no a `update` desde aquí.**
 * `reclutadores_mesa_unica` es un índice único parcial y no se puede diferir: un
 * intercambio hecho con dos `update` truena en el primero, y si se cae la red
 * entre uno y otro deja el salón a medio arreglar. Ver
 * `supabase/migrations/08_editar_el_salon.sql`.
 *
 * **Nunca se pide `reclutadores.nombre`.** Es el nombre de una persona de fuera
 * del Tec, no sale a ninguna pantalla y para arreglar el salón no hace falta.
 */

/** Las funciones devuelven mensajes escritos para leerse; se dejan pasar tal cual. */
async function llamar(funcion, argumentos) {
  const { data, error } = await supabase.rpc(funcion, argumentos)
  if (error) throw new Error(error.message)
  return data
}

/**
 * Todo lo que necesita la hoja de edición, en tres consultas. Se llama al abrirla
 * por primera vez, no al abrir `/host`: quien nunca edite no paga nada.
 *
 * Las filas vienen de los dos bloques a propósito: el índice único de la base es
 * por (edición, bloque, mesa), así que para avisar de un choque hay que verlos.
 */
export async function datosDelSalon() {
  const edicion = await edicionCompleta()
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
    totalMesas: edicion.total_mesas,
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
 * La primera mesa libre del bloque. Es el número que se ofrece cuando llega una
 * empresa sin avisar: teclear un número a ciegas es como se acaba con dos
 * empresas en la misma mesa.
 *
 * Devuelve null si el salón está lleno; entonces hay que conseguir otra mesa.
 */
export function primerHueco(filas, bloque, totalMesas) {
  const tomadas = new Set(
    filas.filter(f => f.bloque === bloque).map(f => f.mesa_numero)
  )
  for (let n = 1; n <= (totalMesas ?? 0); n++) if (!tomadas.has(n)) return n
  return null
}

/**
 * Cuántas mesas movería un recorrido, y hasta dónde. Se calcula aquí para poder
 * decirlo antes de tocar la base; la que manda es la función de Postgres, que
 * vuelve a buscar el hueco con los datos del momento.
 */
export function alcanceDelRecorrido(filas, bloque, desde, totalMesas) {
  const tomadas = new Set(
    filas.filter(f => f.bloque === bloque).map(f => f.mesa_numero)
  )
  let hueco = null
  for (let n = desde; n <= (totalMesas ?? 0); n++) {
    if (!tomadas.has(n)) { hueco = n; break }
  }
  if (hueco === null) return { hueco: null, mesas: 0 }
  return { hueco, mesas: hueco - desde }
}

/**
 * Cambia quién se sienta en una mesa.
 *
 * El nombre pasa a «Por definir» cuando cambia la empresa: la fila traía el
 * nombre de la persona de la empresa anterior, y dejarlo puesto sería decir que
 * esa persona ahora trabaja en la nueva. El Tablero cuenta uno más en «nombres
 * por confirmar», que es la verdad.
 */
export const cambiarEmpresaDeMesa = (filaId, empresaId) =>
  llamar('cambiar_empresa_de_mesa', { p_fila: filaId, p_empresa: empresaId })

/** Otro número, u otro bloque. Avisa si el lugar está tomado. */
export const moverMesa = (filaId, bloque, numero) =>
  llamar('mover_mesa', { p_fila: filaId, p_bloque: bloque, p_numero: numero })

/** Las dos mesas cambian entre sí. Para cuando el lugar de destino está tomado. */
export const intercambiarMesas = (filaA, filaB) =>
  llamar('intercambiar_mesas', { p_fila_a: filaA, p_fila_b: filaB })

/** Sube en uno el tramo desde esa mesa hasta el primer hueco. Devuelve cuántas movió. */
export const recorrerMesas = (bloque, desde) =>
  llamar('recorrer_mesas', { p_bloque: bloque, p_desde: desde })

/** Una mesa que nadie había apartado. Llegaron sin avisar y hay dónde sentarlos. */
export const agregarMesa = (bloque, numero, empresaId) =>
  llamar('agregar_mesa', { p_bloque: bloque, p_numero: numero, p_empresa: empresaId })

/** Quita la fila. La mesa queda libre y se puede reasignar. */
export const liberarMesa = filaId =>
  llamar('liberar_mesa', { p_fila: filaId })

/**
 * El bloque completo en un orden nuevo: las empresas se renumeran desde la 1, cada
 * una en mesas seguidas. Portafolio no entra. Devuelve cuántas empresas cambiaron
 * de número. Ver `supabase/migrations/12_reordenar_salon.sql`.
 */
export const reordenarSalon = (bloque, empresaIds) =>
  llamar('reordenar_salon', { p_bloque: bloque, p_empresas: empresaIds })

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
  await anotar(edicionId, 'empresa nueva', { empresa: data.nombre, giro: data.giro })
  return { ...data, carreras: [] }
}

/**
 * Las carreras de una empresa. Se borran y se vuelven a poner, igual que en la
 * ficha de admin — pero aquí sí se revisan los dos resultados: si el insert
 * falla después de que el delete pasó, las etiquetas se van sin decir nada.
 */
export async function guardarCarreras(empresaId, siglas, { edicionId, empresa } = {}) {
  const { error: errBorrar } = await supabase
    .from('empresa_carreras').delete().eq('empresa_id', empresaId)
  if (errBorrar) throw errBorrar

  if (siglas.length) {
    const { error: errPoner } = await supabase.from('empresa_carreras')
      .insert(siglas.map(s => ({ empresa_id: empresaId, siglas: s })))
    if (errPoner) {
      throw new Error(`Se quitaron las carreras pero no se pudieron poner las nuevas: ${errPoner.message}`)
    }
  }
  if (edicionId) await anotar(edicionId, 'carreras', { empresa, carreras: siglas })
}

/**
 * La bitácora del día. Las funciones de Postgres anotan solas; esto es para lo
 * que todavía se escribe desde el navegador —empresas y carreras—, que no mueve
 * mesas y no necesita transacción.
 *
 * Si la anotación falla, no se tira el cambio que ya pasó: la bitácora es un
 * registro, no una condición.
 */
async function anotar(edicionId, accion, detalle) {
  try {
    await supabase.rpc('anotar_cambio', {
      p_edicion: edicionId, p_accion: accion, p_detalle: detalle,
    })
  } catch { /* la bitácora no bloquea el trabajo del salón */ }
}

/** Lo que se movió hoy, para pasarlo al Excel. Lo más reciente arriba. */
export async function cambiosDelDia(edicionId, limite = 200) {
  const { data, error } = await supabase
    .from('cambios_salon')
    .select('id, accion, detalle, creado_en')
    .eq('edicion_id', edicionId)
    .order('creado_en', { ascending: false })
    .limit(limite)
  if (error) throw error
  return data ?? []
}

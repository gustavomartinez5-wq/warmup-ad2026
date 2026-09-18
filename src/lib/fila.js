import { supabase } from './supabase.js'
import { sinBase } from './config.js'

/**
 * La fila del día del evento.
 *
 * Un turno es un número. La persona no escribe su nombre ni su matrícula en
 * ningún lado: toca lo que busca, recibe un folio y se le llama por el folio.
 * Los datos para indicadores se capturan aparte, fuera de la app.
 *
 * Como en `/mesa`, lo que se hace sin sesión pasa por dos funciones de la base
 * y nunca por la tabla. Un teléfono no puede listar la fila ni leer el turno de
 * alguien más: `mi_turno` devuelve un renglón y pide el uuid completo.
 */

export const SERVICIOS = [
  { clave: 'cv',         texto: 'Revisión de CV',          pie: 'Que un reclutador te lea el CV y te diga qué cambiar' },
  { clave: 'entrevista', texto: 'Simulacro de entrevista',  pie: 'Practicar una entrevista real y recibir retroalimentación' },
  { clave: 'portafolio', texto: 'Revisión de portafolio',   pie: 'Para carreras creativas. Zona aparte, al fondo del salón' },
]

export const textoServicio = clave =>
  SERVICIOS.find(s => s.clave === clave)?.texto ?? clave

/**
 * A partir de cuántas personas delante dejamos de dar el número.
 *
 * Con la fila larga, ver «van 23 delante» hace que la gente calcule, se
 * desespere y se vaya. Con pocos delante el número sí sirve: le dice que no se
 * aleje. Gustavo lo puso en cuatro.
 */
export const UMBRAL_ADELANTE   = 4
export const TEXTO_FILA_LARGA  = 'En un momento más pasarás'

/**
 * El aviso de que la fila se movió. Va por difusión y no lleva datos: cada
 * teléfono vuelve a preguntar por lo suyo. Es el mismo trato que `salon-<bloque>`.
 */
export const CANAL_FILA = 'fila'

export const ESTADOS_TURNO = [
  { clave: 'espera',   texto: 'En espera' },
  { clave: 'llamado',  texto: 'Llamado' },
  { clave: 'atendido', texto: 'Atendido' },
  { clave: 'no_llego', texto: 'No llegó' },
]

export const textoEstadoTurno = clave =>
  ESTADOS_TURNO.find(e => e.clave === clave)?.texto ?? clave

/** Las dos filas reales del salón. Debe dar igual que `pool_de` en la base. */
export const poolDe = servicio => (servicio === 'portafolio' ? 'portafolio' : 'general')

/* ── Lo que se hace sin sesión ─────────────────────────────────────────────── */

/** Saca un turno nuevo. Devuelve `{ id, folio }`. */
export async function sacarTurno(servicio) {
  if (sinBase()) throw new Error('Modo de prueba: sin conexión con la base.')
  const { data, error } = await supabase.rpc('sacar_turno', { p_servicio: servicio })
  if (error) throw error
  const fila = Array.isArray(data) ? data[0] : data
  if (!fila) throw new Error('No se pudo sacar el turno.')
  return fila
}

/** El turno de esta persona y cuántos van delante. `null` si ya no existe. */
export async function miTurno(id) {
  if (sinBase()) throw new Error('Modo de prueba: sin conexión con la base.')
  const { data, error } = await supabase.rpc('mi_turno', { p_id: id })
  if (error) throw error
  return (Array.isArray(data) ? data[0] : data) ?? null
}

/**
 * El turno que sacó esta persona, para que una recarga no la haga sacar otro.
 * Vive solo en su teléfono. Si se pierde, saca uno nuevo y ya.
 */
const LLAVE = 'warmup-mi-turno'

export function recordarTurno(id) {
  try { localStorage.setItem(LLAVE, id) } catch { /* modo privado */ }
}

export function turnoRecordado() {
  try { return localStorage.getItem(LLAVE) } catch { return null }
}

export function olvidarTurno() {
  try { localStorage.removeItem(LLAVE) } catch { /* modo privado */ }
}

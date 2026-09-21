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
  { clave: 'portafolio', texto: 'Revisión de portafolio',   pie: 'Para carreras creativas' },
]

export const textoServicio = clave =>
  SERVICIOS.find(s => s.clave === clave)?.texto ?? clave

/**
 * Lo que la persona hace después de sacar turno, y otra vez cuando la llaman.
 *
 * El recorrido del día es siempre el mismo: turno por el QR, módulo de lista de
 * espera —ahí le toman sus datos—, y de ahí el host la lleva con la empresa. Nadie
 * elige empresa ni camina por las mesas, así que la pantalla nunca manda directo
 * a una mesa: siempre al módulo. Para pasar con otra empresa, se saca otro turno.
 */
export const INDICACION_MODULO = 'Pasa al módulo de lista de espera'

/**
 * La pantalla no dice cuántos van delante. «Eres el siguiente» podía quedarse
 * mucho rato si la fila se atoraba, y confundía. `mi_turno` sigue devolviendo
 * `adelante`: si algún día se quiere de vuelta, es un cambio de pantalla.
 */

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
  // Quien avisó que se iba, aparte de quien no se presentó. Reabierto el 21-sep
  // porque Cecilia necesita la cuenta real de ausencias.
  { clave: 'cedio',    texto: 'Cedió su turno' },
]

/** Estados de un turno que ya se cerró y no cuenta para la fila. */
export const CERRADOS = ['atendido', 'no_llego', 'cedio']

/**
 * Minutos que tiene la persona para llegar al módulo después de que la llaman.
 * Pasado este tiempo Cecilia puede marcarla «No llegó». Si regresa después, se
 * usa «Regresar a la fila» y no se le pide otro turno. Decidido el 21-sep.
 */
export const TOLERANCIA_MIN = 5

/**
 * Consejos que rotan mientras la persona espera, como en la pantalla de carga de
 * un videojuego. Salen de los decks cerrados del CVDP —CV estratégico y
 * Estrategias de búsqueda de empleo—, no se inventan. Si cambia un deck, se
 * revisan aquí.
 */
export const CONSEJOS = {
  cv: [
    'Tu CV cabe en una página y en una sola columna.',
    'Cada viñeta de tu CV responde «¿y eso qué logró?».',
    'Empieza cada viñeta con un verbo: «Elaboré el reporte» dice más que «Apoyé en el reporte».',
    'Usa en tu CV las palabras de la vacante, siempre que sean ciertas.',
    'No inventes cifras: una estimación honesta se defiende en entrevista; un número falso, no.',
    'Envía tu CV en PDF, con el nombre «Nombre Apellido CV.pdf».',
    'Deja fuera de tu CV la foto, la edad, el estado civil y el CURP.',
  ],
  entrevista: [
    'Cuando te pidan un ejemplo, responde con STAR: situación, tarea, acción y resultado.',
    'Ten dos historias preparadas. Tu respuesta no termina hasta que dices el resultado.',
    'Ensaya tu presentación en voz alta. Si pasa de tres minutos, recórtala.',
    'Prepara por qué esta vacante: qué te interesa de esta empresa y de este puesto.',
    'Cuando te pregunten si tienes dudas, ten tus tres preguntas listas.',
    'Al día siguiente, manda un correo breve de agradecimiento.',
  ],
  general: [
    'El rechazo es información, no una evaluación de tu valor.',
    'Lleva un registro de tus postulaciones: te dice en qué paso se detiene tu proceso.',
    'Da seguimiento una vez, a la semana siguiente. Si no hay respuesta, sigue con la siguiente empresa.',
    'Guarda tus búsquedas y activa las alertas: la vacante te llega el día que se publica.',
    'Escríbele a una persona esta semana, aunque no haya vacante publicada.',
    'En el CVDP revisamos tu CV y practicamos entrevista contigo, en asesoría individual.',
  ],
}

/** Los consejos del servicio que eligió, y después los generales. */
export const consejosPara = servicio => [...(CONSEJOS[servicio] ?? []), ...CONSEJOS.general]

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
 * Ceder el turno: la persona avisa que se tiene que ir. Queda como «No llegó».
 * Devuelve `true` si lo cedió, `false` si el turno ya estaba cerrado.
 */
export async function cederTurno(id) {
  if (sinBase()) throw new Error('Modo de prueba: sin conexión con la base.')
  const { data, error } = await supabase.rpc('ceder_turno', { p_id: id })
  if (error) throw error
  return data === true
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

import { useEffect, useState } from 'react'
import { useDatos } from '../../lib/datos'
import { cambiosDelDia } from '../../lib/mesaEquipo'
import { etiquetaBloque } from '../../lib/cifras'
import Cargando from '../../components/Cargando'

/**
 * Lo que se movió en el salón, en orden, para pasarlo al Excel.
 *
 * Existe por una razón concreta: el 28 manda la app, pero una reimportación del
 * libro borra y reinserta `reclutadores`. Sin esta lista, todo lo que el equipo
 * arregló el día del evento se pierde al día siguiente y nadie se da cuenta.
 *
 * No es un «deshacer». Es el papelito de lo que pasó.
 */

const mesa = d => d?.mesa ?? '—'
const donde = d => d?.bloque ? `${etiquetaBloque(d.bloque)} · mesa ${mesa(d)}` : `mesa ${mesa(d)}`

/**
 * Una línea en español por acción. La bitácora guarda jsonb; esto lo lee.
 * Se exporta para poder probarla con las filas de verdad sin montar la pantalla.
 */
export function comoSeLee({ accion, detalle: d }) {
  switch (accion) {
    case 'empresa':
      return `${etiquetaBloque(d.bloque)} · mesa ${mesa(d)}: ${d.antes} → ${d.ahora}`
    case 'mover':
      return `${d.empresa}: de ${donde(d.de)} a ${donde(d.a)}`
    case 'intercambiar':
      return `${d.a?.empresa} y ${d.b?.empresa} cambiaron de lugar — ${donde(d.a)} · ${donde(d.b)}`
    case 'recorrer':
      return d.mesas === 1
        ? `${etiquetaBloque(d.bloque)}: la mesa ${d.desde} subió a la ${d.hasta}`
        : `${etiquetaBloque(d.bloque)}: ${d.mesas} mesas subieron una, de la ${d.desde} a la ${d.hasta}`
    case 'agregar':
      return `${d.empresa} entró en ${donde(d)}`
    case 'liberar':
      return `${d.empresa} salió de ${donde(d)}; la mesa quedó libre`
    case 'empresa nueva':
      return `Se dio de alta «${d.empresa}»${d.giro ? ` · ${d.giro}` : ''}`
    case 'carreras':
      return d.carreras?.length
        ? `${d.empresa}: ${d.carreras.length} carreras — ${d.carreras.join(', ')}`
        : `${d.empresa} se quedó sin carreras etiquetadas`
    case 'tamaño del salón':
      return `El salón pasó de ${d.antes} a ${d.ahora} mesas`
    default:
      return JSON.stringify(d)
  }
}

const TONO = {
  agregar:      'border-teal/60 text-teal',
  liberar:      'border-rojo/60 text-rojo',
  mover:        'border-tec-claro/70 text-lavanda',
  intercambiar: 'border-tec-claro/70 text-lavanda',
  recorrer:     'border-ambar/60 text-ambar',
}

const reloj = iso => new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
const dia   = iso => new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'long' })

export default function Cambios() {
  const datos = useDatos()
  const [lista, setLista]   = useState(null)
  const [error, setError]   = useState(null)
  const [cargando, setCargando] = useState(true)

  const edicionId = datos.edicion?.id

  useEffect(() => {
    if (!edicionId) return
    let vivo = true
    setCargando(true)
    cambiosDelDia(edicionId)
      .then(d => { if (vivo) { setLista(d); setError(null) } })
      .catch(e => { if (vivo) setError(e.message ?? String(e)) })
      .finally(() => { if (vivo) setCargando(false) })
    return () => { vivo = false }
  }, [edicionId])

  if (datos.cargando || datos.error) return <Cargando error={datos.error} />

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-extrabold">Cambios del día</h2>
        <p className="text-sm text-lavanda/60 mt-0.5 max-w-prose">
          Todo lo que se movió en el salón desde la app, lo más reciente arriba. Al terminar el
          evento, esto es lo que hay que pasar al Excel: una reimportación del libro pisa lo que
          se arregló aquí.
        </p>
      </div>

      {cargando && <Cargando texto="Trayendo la bitácora…" />}
      {error && <Cargando error={error} />}

      {lista && lista.length === 0 && (
        <p className="text-sm text-lavanda/50 py-8 text-center">
          Todavía no se ha movido nada desde la app.
        </p>
      )}

      {lista && lista.length > 0 && (
        <ul className="space-y-1">
          {lista.map(c => (
            <li
              key={c.id}
              className="rounded-xl border border-lavanda/15 bg-marino-alto/40 px-3.5 py-2.5
                         flex items-start gap-3"
            >
              <span className="cifra text-xs text-lavanda/45 w-11 shrink-0 pt-0.5">{reloj(c.creado_en)}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm leading-snug break-words">{comoSeLee(c)}</span>
                <span className="block text-[11px] text-lavanda/40 mt-0.5">{dia(c.creado_en)}</span>
              </span>
              <span
                className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold
                            ${TONO[c.accion] ?? 'border-lavanda/25 text-lavanda/50'}`}
              >
                {c.accion}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

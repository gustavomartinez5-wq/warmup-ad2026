import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useDatos } from '../../lib/datos'
import { plano } from '../../lib/texto'
import Cargando from '../../components/Cargando'

/**
 * Los pendientes de empresa. Salen de la columna Notas de la hoja Empresas del
 * Excel, que es la que el Tablero cuenta para «Empresas con algo pendiente».
 *
 * Resolver uno no lo borra: lo deja marcado. Una reimportación respeta lo que
 * ya estaba resuelto, así que se puede cerrar aquí sin perderlo al día siguiente.
 */
export default function Pendientes() {
  const datos = useDatos()
  const [busca, setBusca] = useState('')
  const [verResueltos, setVerResueltos] = useState(false)
  const [moviendo, setMoviendo] = useState(null)
  const [error, setError] = useState(null)

  if (datos.cargando || datos.error) return <Cargando error={datos.error} />

  const { pendientes, recargar } = datos
  const abiertos  = pendientes.filter(p => !p.resuelto)
  const resueltos = pendientes.filter(p => p.resuelto)

  const q = plano(busca)
  const lista = (verResueltos ? resueltos : abiertos).filter(p =>
    !q || plano(p.texto).includes(q) || plano(p.empresas?.nombre).includes(q))

  async function alternar(p) {
    setMoviendo(p.id); setError(null)
    const { error } = await supabase.from('pendientes')
      .update({ resuelto: !p.resuelto }).eq('id', p.id)
    if (error) setError(error.message)
    else await recargar()
    setMoviendo(null)
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-extrabold">Pendientes</h2>
        <p className="text-sm text-lavanda/60 mt-0.5 max-w-prose">
          Lo que quedó abierto con cada empresa. Sale de la columna Notas del Excel;
          al reimportar, lo que ya marcaste resuelto se queda resuelto.
        </p>
      </div>

      <div className="flex rounded-lg border border-lavanda/20 overflow-hidden w-fit">
        {[[false, 'Abiertos', abiertos.length], [true, 'Resueltos', resueltos.length]].map(
          ([valor, texto, n]) => (
            <button
              key={String(valor)} onClick={() => setVerResueltos(valor)}
              className={`px-3.5 py-2 text-[13px] font-bold transition-colors ${
                verResueltos === valor ? 'bg-tec text-white' : 'text-lavanda/55 hover:text-white'
              }`}
            >
              {texto} <span className="cifra opacity-70">{n}</span>
            </button>
          ))}
      </div>

      <input
        value={busca} onChange={e => setBusca(e.target.value)}
        placeholder="Buscar por empresa o texto…"
        className="w-full rounded-xl bg-marino-alto/70 border border-lavanda/20 px-3.5 py-2.5 text-sm
                   placeholder-lavanda/30 outline-none focus:border-cian focus:ring-2 focus:ring-cian/30"
      />

      {error && (
        <p className="text-xs text-rojo bg-rojo/10 border border-rojo/30 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {lista.length === 0 ? (
        <p className="text-sm text-lavanda/50 py-10 text-center">
          {pendientes.length === 0
            ? 'Sin pendientes todavía. Importa el Excel.'
            : verResueltos ? 'Nada resuelto todavía.'
            : q ? 'Ninguno coincide.' : 'No queda nada abierto.'}
        </p>
      ) : (
        <ul className="space-y-1.5">
          {lista.map(p => (
            <li key={p.id}>
              <div className={`rounded-xl border px-4 py-3 flex items-start gap-3 ${
                p.resuelto
                  ? 'border-lavanda/15 bg-marino-alto/25'
                  : 'border-ambar/35 bg-ambar/[0.07]'
              }`}>
                <button
                  onClick={() => alternar(p)} disabled={moviendo === p.id}
                  aria-label={p.resuelto ? 'Volver a abrir' : 'Marcar como resuelto'}
                  className={`mt-0.5 w-5 h-5 rounded-md border shrink-0 grid place-items-center
                              text-[11px] font-bold transition-colors disabled:opacity-40 ${
                    p.resuelto
                      ? 'bg-teal border-teal text-white'
                      : 'border-lavanda/40 hover:border-teal text-transparent'
                  }`}
                >
                  ✓
                </button>
                <div className="min-w-0">
                  {p.empresas?.nombre && (
                    <p className={`text-sm font-semibold truncate ${
                      p.resuelto ? 'text-lavanda/45' : ''}`}>
                      {p.empresas.nombre}
                    </p>
                  )}
                  <p className={`text-sm leading-relaxed ${
                    p.resuelto ? 'text-lavanda/35 line-through' : 'text-lavanda/85'}`}>
                    {p.texto}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

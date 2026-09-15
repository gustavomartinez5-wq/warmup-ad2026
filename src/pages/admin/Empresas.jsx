import { useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useDatos } from '../../lib/datos'
import { etiquetaBloque } from '../../lib/cifras'
import Cargando from '../../components/Cargando'

function Ficha({ empresa, reclutadores, carreras, onCerrar, onGuardado }) {
  const [elegidas, setElegidas] = useState(new Set(empresa.carreras))
  const [guardando, setGuardando] = useState(false)
  const [abierta, setAbierta] = useState(new Set())

  const porEscuela = useMemo(() => {
    const m = new Map()
    for (const c of carreras) {
      if (!m.has(c.escuela)) m.set(c.escuela, [])
      m.get(c.escuela).push(c)
    }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0], 'es'))
  }, [carreras])

  function alternar(siglas) {
    setElegidas(prev => {
      const s = new Set(prev)
      if (s.has(siglas)) s.delete(siglas)
      else s.add(siglas)
      return s
    })
  }

  async function guardar() {
    setGuardando(true)
    await supabase.from('empresa_carreras').delete().eq('empresa_id', empresa.id)
    if (elegidas.size) {
      await supabase.from('empresa_carreras')
        .insert([...elegidas].map(siglas => ({ empresa_id: empresa.id, siglas })))
    }
    await onGuardado()
    setGuardando(false)
    onCerrar()
  }

  const suyos = reclutadores.filter(r => r.empresa_id === empresa.id)

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 px-0 sm:px-4"
      onClick={e => e.target === e.currentTarget && onCerrar()}
    >
      <div className="bg-marino-alto rounded-t-2xl sm:rounded-2xl border border-lavanda/20
                      w-full sm:max-w-lg max-h-[88dvh] flex flex-col">
        <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-3 border-b border-lavanda/15 shrink-0">
          <div className="min-w-0">
            <p className="font-bold truncate">{empresa.nombre}</p>
            {empresa.giro && <p className="text-xs text-lavanda/55 mt-0.5">{empresa.giro}</p>}
          </div>
          <button onClick={onCerrar} className="text-lavanda/50 hover:text-white text-lg leading-none shrink-0">✕</button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-lavanda/55">Representante</p>
              <p className="text-sm break-words">{empresa.representante ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-lavanda/55">Celular</p>
              <p className="text-sm break-words">{empresa.celular ?? '—'}</p>
            </div>
            <div className="col-span-2">
              <p className="text-xs text-lavanda/55">Correo</p>
              <p className="text-sm break-all">{empresa.correo ?? '—'}</p>
            </div>
          </div>

          <div>
            <p className="text-xs text-lavanda/55 mb-1.5">Reclutadores ({suyos.length})</p>
            {suyos.length === 0 ? (
              <p className="text-sm text-lavanda/45">Sin reclutadores.</p>
            ) : (
              <ul className="space-y-1">
                {suyos.map(r => (
                  <li key={r.id} className="text-sm flex items-baseline gap-2">
                    <span className="cifra text-lavanda/45 w-8 shrink-0">{r.mesa_numero ?? '—'}</span>
                    <span className="text-lavanda/55 text-xs shrink-0">{etiquetaBloque(r.bloque)}</span>
                    <span className="truncate">{r.nombre}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {(empresa.areas_texto || empresa.perfiles_texto) && (
            <div className="rounded-xl border border-lavanda/15 bg-marino/40 px-3.5 py-3 space-y-2">
              <p className="text-[11px] uppercase tracking-wider text-lavanda/45">
                Lo que escribió la empresa
              </p>
              {empresa.areas_texto && (
                <div>
                  <p className="text-xs text-lavanda/55">Áreas que recluta</p>
                  <p className="text-sm text-lavanda/85">{empresa.areas_texto}</p>
                </div>
              )}
              {empresa.perfiles_texto && (
                <div>
                  <p className="text-xs text-lavanda/55">Perfiles o programas</p>
                  <p className="text-sm text-lavanda/85">{empresa.perfiles_texto}</p>
                </div>
              )}
            </div>
          )}

          <div>
            <p className="text-xs text-lavanda/55 mb-1.5">
              Carreras que busca
              <span className="cifra text-lavanda/40 ml-1.5">{elegidas.size}</span>
            </p>
            <p className="text-[11px] text-lavanda/40 mb-2 leading-relaxed">
              Son las que el día del evento filtran a quién mandar a esta mesa.
            </p>
            <div className="space-y-1.5">
              {porEscuela.map(([escuela, lista]) => {
                const puestas = lista.filter(c => elegidas.has(c.siglas)).length
                const abiertaEsta = abierta.has(escuela)
                return (
                  <div key={escuela} className="rounded-lg border border-lavanda/15 overflow-hidden">
                    <button
                      onClick={() => setAbierta(p => {
                        const s = new Set(p)
                        if (s.has(escuela)) s.delete(escuela)
                        else s.add(escuela)
                        return s
                      })}
                      className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-lavanda/5"
                    >
                      <span className="text-xs font-semibold">{escuela}</span>
                      <span className="text-xs text-lavanda/45 cifra">
                        {puestas > 0 ? `${puestas} · ` : ''}{abiertaEsta ? '−' : '+'}
                      </span>
                    </button>
                    {abiertaEsta && (
                      <div className="flex flex-wrap gap-1.5 px-3 pb-3 pt-1">
                        {lista.map(c => {
                          const puesta = elegidas.has(c.siglas)
                          return (
                            <button
                              key={c.siglas} onClick={() => alternar(c.siglas)} title={c.nombre}
                              className={`text-[11px] px-2 py-1 rounded-full border font-semibold transition-colors ${
                                puesta
                                  ? 'bg-tec border-tec text-white'
                                  : 'border-lavanda/25 text-lavanda/60 hover:border-lavanda/50'
                              }`}
                            >
                              {c.siglas}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {empresa.notas && (
            <div className="rounded-xl border border-ambar/40 bg-ambar/10 px-3.5 py-3">
              <p className="text-xs text-lavanda/55 mb-0.5">Pendiente</p>
              <p className="text-sm text-lavanda/85">{empresa.notas}</p>
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-lavanda/15 shrink-0">
          <button
            onClick={guardar} disabled={guardando}
            className="w-full rounded-xl bg-tec hover:bg-tec-claro disabled:opacity-50
                       py-3 font-bold text-sm transition-colors"
          >
            {guardando ? 'Guardando…' : 'Guardar las carreras'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Empresas() {
  const datos = useDatos()
  const [busca, setBusca] = useState('')
  const [ficha, setFicha] = useState(null)

  if (datos.cargando || datos.error) return <Cargando error={datos.error} />

  const { empresas, reclutadores, carreras, recargar } = datos

  const q = busca.trim().toLowerCase()
  const lista = q
    ? empresas.filter(e =>
        e.nombre.toLowerCase().includes(q) ||
        (e.giro ?? '').toLowerCase().includes(q) ||
        e.carreras.some(c => c.toLowerCase().includes(q)))
    : empresas

  const sinCarreras = empresas.filter(e => e.carreras.length === 0).length
  const abierta = empresas.find(e => e.id === ficha)

  return (
    <section className="space-y-4">
      {abierta && (
        <Ficha
          empresa={abierta} reclutadores={reclutadores} carreras={carreras}
          onCerrar={() => setFicha(null)} onGuardado={recargar}
        />
      )}

      <div>
        <h2 className="text-xl font-extrabold">Empresas</h2>
        <p className="text-sm text-lavanda/60 mt-0.5">
          {empresas.length} registradas
          {sinCarreras > 0 && (
            <span className="text-ambar"> · {sinCarreras} sin carreras etiquetadas</span>
          )}
        </p>
      </div>

      <input
        value={busca} onChange={e => setBusca(e.target.value)}
        placeholder="Buscar por empresa, giro o carrera…"
        className="w-full rounded-xl bg-marino-alto/70 border border-lavanda/20 px-3.5 py-2.5 text-sm
                   placeholder-lavanda/30 outline-none focus:border-cian focus:ring-2 focus:ring-cian/30"
      />

      {lista.length === 0 ? (
        <p className="text-sm text-lavanda/50 py-8 text-center">
          {empresas.length === 0 ? 'Sin empresas todavía. Importa el Excel.' : 'Sin resultados.'}
        </p>
      ) : (
        <ul className="space-y-1.5">
          {lista.map(e => {
            const suyos = reclutadores.filter(r => r.empresa_id === e.id)
            const bloques = [...new Set(suyos.map(r => etiquetaBloque(r.bloque)))].sort()
            return (
              <li key={e.id}>
                <button
                  onClick={() => setFicha(e.id)}
                  className="w-full text-left rounded-xl border border-lavanda/15 bg-marino-alto/40
                             hover:border-lavanda/35 px-4 py-3 transition-colors"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="font-semibold text-sm truncate">{e.nombre}</p>
                    <span className="text-xs text-lavanda/45 shrink-0 cifra">
                      {suyos.length} {suyos.length === 1 ? 'persona' : 'personas'}
                    </span>
                  </div>
                  <p className="text-xs text-lavanda/55 mt-0.5 truncate">
                    {e.giro ?? 'Sin giro'} · {bloques.join(' y ') || 'sin bloque'}
                  </p>
                  {e.carreras.length > 0 ? (
                    <p className="text-[11px] text-cian/80 mt-1 truncate">
                      {e.carreras.slice(0, 8).join(' · ')}
                      {e.carreras.length > 8 ? ` +${e.carreras.length - 8}` : ''}
                    </p>
                  ) : (
                    <p className="text-[11px] text-ambar/80 mt-1">Sin carreras etiquetadas</p>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

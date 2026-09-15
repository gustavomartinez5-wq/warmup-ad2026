import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useDatos } from '../../lib/datos'
import { mapaDeMesas, ESTADO_MESA, BLOQUES, calcularCifras, faltan } from '../../lib/cifras'
import Cargando from '../../components/Cargando'

function Leyenda({ mapa }) {
  const cuenta = e => mapa.filter(m => m.estado === e).length
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5">
      {Object.entries(ESTADO_MESA).map(([clave, { texto, clase }]) => (
        <span key={clave} className="inline-flex items-center gap-1.5 text-xs text-lavanda/70">
          <span className={`w-3 h-3 rounded border ${clase}`} />
          {texto} <span className="cifra text-lavanda/45">{cuenta(clave)}</span>
        </span>
      ))}
    </div>
  )
}

function Detalle({ mesa, bloque, onCerrar, onConseguida, guardando }) {
  const r = mesa.reclutador
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 px-0 sm:px-4"
      onClick={e => e.target === e.currentTarget && onCerrar()}
    >
      <div className="bg-marino-alto rounded-t-2xl sm:rounded-2xl border border-lavanda/20 w-full sm:max-w-sm">
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-lavanda/15">
          <p className="font-bold">Mesa {mesa.numero}</p>
          <button onClick={onCerrar} className="text-lavanda/50 hover:text-white text-lg leading-none">✕</button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <p className="text-xs text-lavanda/55">{BLOQUES.find(b => b.clave === bloque)?.nombre}</p>

          {r ? (
            <>
              <div>
                <p className="text-xs text-lavanda/55">Empresa</p>
                <p className="text-sm font-semibold">{r.empresa}</p>
              </div>
              <div>
                <p className="text-xs text-lavanda/55">Estatus</p>
                <p className="text-sm">
                  {r.estatus === 'confirmado' ? 'Confirmado'
                    : r.estatus === 'cancelado' ? 'Cancelado' : 'Por confirmar'}
                </p>
              </div>
            </>
          ) : (
            <p className="text-sm text-lavanda/60">Nadie apartó esta mesa.</p>
          )}

          {mesa.excedente && (
            <div className="rounded-xl border border-rojo/50 bg-rojo/10 px-3.5 py-3">
              <p className="text-sm font-semibold">Esta mesa todavía no existe</p>
              <p className="text-xs text-lavanda/70 mt-1">
                El salón tiene menos mesas que este número. Al conseguirla, el total sube y
                deja de salir en rojo.
              </p>
              <button
                onClick={onConseguida} disabled={guardando}
                className="mt-3 w-full rounded-lg bg-tec hover:bg-tec-claro disabled:opacity-50
                           py-2.5 text-sm font-bold transition-colors"
              >
                {guardando ? 'Guardando…' : 'Ya la conseguí'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Mesas() {
  const datos = useDatos()
  const [bloque, setBloque] = useState('b1')
  const [detalle, setDetalle] = useState(null)
  const [guardando, setGuardando] = useState(false)

  if (datos.cargando || datos.error) return <Cargando error={datos.error} />

  const { edicion, empresas, reclutadores, recargar } = datos
  const porId = new Map(empresas.map(e => [e.id, e]))
  const conEmpresa = reclutadores.map(r => ({ ...r, empresa: porId.get(r.empresa_id)?.nombre ?? '—' }))

  const mapa = mapaDeMesas({ edicion, reclutadores: conEmpresa, bloque })
  const c = calcularCifras({ edicion, empresas, reclutadores: conEmpresa })

  async function conseguida() {
    setGuardando(true)
    // Conseguir la mesa sube el total del salón: el rojo se apaga solo.
    const { error } = await supabase
      .from('ediciones')
      .update({ total_mesas: edicion.total_mesas + 1 })
      .eq('id', edicion.id)
    if (!error) { await recargar(); setDetalle(null) }
    setGuardando(false)
  }

  return (
    <section className="space-y-4">
      {detalle && (
        <Detalle
          mesa={detalle} bloque={bloque} guardando={guardando}
          onCerrar={() => setDetalle(null)} onConseguida={conseguida}
        />
      )}

      <div>
        <h2 className="text-xl font-extrabold">Mapa de mesas</h2>
        <p className="text-sm text-lavanda/60 mt-0.5">
          {c.mesasApartadas} apartadas de {c.totalMesas} en el salón
          {c.mesasFaltantes > 0 && (
            <span className="text-rojo font-semibold"> · {faltan(c.mesasFaltantes)} por conseguir</span>
          )}
        </p>
      </div>

      <div className="flex gap-1 border-b border-lavanda/15">
        {BLOQUES.map(b => (
          <button
            key={b.clave} onClick={() => setBloque(b.clave)}
            className={`px-3.5 py-2.5 text-[13px] font-semibold border-b-2 transition-colors ${
              bloque === b.clave ? 'border-cian text-white' : 'border-transparent text-lavanda/55 hover:text-lavanda'
            }`}
          >
            {b.nombre}
            <span className="cifra text-lavanda/45 ml-1.5">
              {conEmpresa.filter(r => r.bloque === b.clave && r.estatus !== 'cancelado').length}
            </span>
          </button>
        ))}
      </div>

      <Leyenda mapa={mapa} />

      {mapa.length === 0 ? (
        <p className="text-sm text-lavanda/50 py-8 text-center">Sin mesas todavía.</p>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(88px,1fr))] gap-1.5">
          {mapa.map(m => {
            const { clase } = ESTADO_MESA[m.estado]
            return (
              <button
                key={m.numero} onClick={() => setDetalle(m)}
                className={`rounded-lg border px-2 py-2 text-left min-h-[58px] flex flex-col
                            justify-between transition-transform active:scale-95 ${clase}`}
              >
                <span className="text-[11px] font-bold cifra opacity-70">{m.numero}</span>
                <span className="text-[11px] leading-tight line-clamp-2 break-words">
                  {m.reclutador?.empresa ?? ''}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </section>
  )
}

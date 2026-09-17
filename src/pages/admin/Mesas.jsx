import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useDatos } from '../../lib/datos'
import { mapaDeMesas, ESTADO_MESA, BLOQUES, calcularCifras, faltan } from '../../lib/cifras'
import Cargando from '../../components/Cargando'
import RejillaMesas from '../../components/RejillaMesas'

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

/**
 * El tamaño del salón. Antes solo subía de uno en uno, desde el detalle de una
 * mesa excedente. El día que el salón confirmó 75 mesas de golpe hubo que
 * entrar por SQL, y eso no lo puede hacer el equipo.
 */
function TamanoDelSalon({ edicion, masAlta, onGuardado }) {
  const [abierto, setAbierto] = useState(false)
  const [valor, setValor]     = useState(String(edicion.total_mesas))
  const [guardando, setGuardando] = useState(false)
  const [error, setError]     = useState(null)

  const n = /^\d+$/.test(valor.trim()) ? parseInt(valor.trim(), 10) : null
  const listo = n !== null && n >= masAlta && n !== edicion.total_mesas && !guardando

  async function guardar() {
    setGuardando(true); setError(null)
    const { error: err } = await supabase
      .from('ediciones').update({ total_mesas: n }).eq('id', edicion.id)
    if (err) { setError(err.message); setGuardando(false); return }
    // La bitácora es un registro, no una condición: si falla, el cambio ya pasó.
    try {
      await supabase.rpc('anotar_cambio', {
        p_edicion: edicion.id, p_accion: 'tamaño del salón',
        p_detalle: { antes: edicion.total_mesas, ahora: n },
      })
    } catch { /* no bloquea */ }
    await onGuardado()
    setGuardando(false); setAbierto(false)
  }

  if (!abierto) {
    return (
      <button
        onClick={() => { setValor(String(edicion.total_mesas)); setAbierto(true) }}
        className="text-xs text-lavanda/55 hover:text-white underline underline-offset-2"
      >
        Cambiar el tamaño del salón
      </button>
    )
  }

  return (
    <div className="rounded-xl border border-lavanda/20 bg-marino-alto/50 px-4 py-3 space-y-2 max-w-sm">
      <p className="text-xs text-lavanda/55">Cuántas mesas tiene el salón</p>
      <div className="flex gap-2">
        <input
          value={valor} onChange={e => setValor(e.target.value)} inputMode="numeric"
          className="cifra w-24 rounded-lg bg-marino border border-lavanda/20 px-3 py-2 text-sm
                     outline-none focus:border-cian"
        />
        <button
          onClick={guardar} disabled={!listo}
          className="rounded-lg bg-tec hover:bg-tec-claro disabled:opacity-40 px-4 py-2
                     text-[13px] font-bold transition-colors"
        >
          {guardando ? 'Guardando…' : 'Guardar'}
        </button>
        <button
          onClick={() => setAbierto(false)}
          className="text-[13px] text-lavanda/55 hover:text-white px-2"
        >
          Cancelar
        </button>
      </div>
      {n !== null && n < masAlta && (
        <p className="text-[11px] text-ambar">
          La mesa asignada más alta es la <span className="cifra">{masAlta}</span>. Bajar de ahí
          dejaría empresas en mesas que el salón no tiene: primero hay que moverlas.
        </p>
      )}
      {error && <p className="text-[11px] text-rojo">{error}</p>}
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
        <div className="mt-2">
          <TamanoDelSalon
            edicion={edicion} masAlta={c.mesaMasAlta} onGuardado={recargar}
          />
        </div>
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
        <RejillaMesas total={mapa.length}>
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
        </RejillaMesas>
      )}
    </section>
  )
}

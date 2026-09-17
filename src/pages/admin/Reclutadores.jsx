import { useCallback, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useDatos } from '../../lib/datos'
import { BLOQUES, etiquetaBloque, esPorDefinir } from '../../lib/cifras'
import { cambiarEmpresaDeMesa, moverMesa, datosDelSalon } from '../../lib/mesaEquipo'
import Cargando from '../../components/Cargando'
import EditarMesa from '../../components/EditarMesa'

const ESTATUS = [
  { clave: 'confirmado',    texto: 'Confirmado' },
  { clave: 'por_confirmar', texto: 'Por confirmar' },
  { clave: 'cancelado',     texto: 'Cancelado' },
]

const colorEstatus = {
  confirmado:    'text-teal',
  por_confirmar: 'text-ambar',
  cancelado:     'text-lavanda/40 line-through',
}

function Editar({ fila, empresas, reclutadores, onCerrar, onGuardado }) {
  const [form, setForm] = useState({
    nombre:      fila.nombre,
    empresa_id:  fila.empresa_id,
    bloque:      fila.bloque,
    estatus:     fila.estatus,
    mesa_numero: fila.mesa_numero ?? '',
  })
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)

  const mesa = form.mesa_numero === '' ? null : parseInt(form.mesa_numero, 10)

  // La base no deja dos personas en la misma mesa y el mismo bloque. Se avisa antes.
  const choca = mesa !== null && reclutadores.some(
    r => r.id !== fila.id && r.bloque === form.bloque && r.mesa_numero === mesa
  )

  /**
   * El nombre y el estatus son de la persona y se escriben directo. La empresa y
   * la mesa van por las funciones de la base: son las que validan el choque en
   * una transacción y dejan rastro en la bitácora. Si se escribieran aquí
   * también, habría dos lugares donde se mueve una mesa y uno de los dos se
   * quedaría atrás.
   */
  async function guardar() {
    if (choca) return
    setGuardando(true); setError(null)
    try {
      const { error: err } = await supabase.from('reclutadores').update({
        nombre:  form.nombre.trim() || 'Por definir',
        estatus: form.estatus,
      }).eq('id', fila.id)
      if (err) throw new Error(err.message)

      if (form.empresa_id !== fila.empresa_id) {
        await cambiarEmpresaDeMesa(fila.id, form.empresa_id)
      }
      if (mesa !== null && (mesa !== fila.mesa_numero || form.bloque !== fila.bloque)) {
        await moverMesa(fila.id, form.bloque, mesa)
      }
      await onGuardado()
      onCerrar()
    } catch (e) {
      setError(e.message ?? String(e))
      setGuardando(false)
    }
  }

  const campo = 'w-full rounded-xl bg-marino/70 border border-lavanda/20 px-3 py-2.5 text-sm ' +
                'outline-none focus:border-cian focus:ring-2 focus:ring-cian/30'

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 px-0 sm:px-4"
      onClick={e => e.target === e.currentTarget && onCerrar()}
    >
      <div className="bg-marino-alto rounded-t-2xl sm:rounded-2xl border border-lavanda/20
                      w-full sm:max-w-sm max-h-[88dvh] flex flex-col">
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-lavanda/15 shrink-0">
          <p className="font-bold">Editar reclutador</p>
          <button onClick={onCerrar} className="text-lavanda/50 hover:text-white text-lg leading-none">✕</button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-3">
          <div>
            <label className="block text-xs text-lavanda/60 mb-1.5">Nombre</label>
            <input
              className={campo} value={form.nombre}
              onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-xs text-lavanda/60 mb-1.5">Empresa</label>
            <select
              className={campo} value={form.empresa_id}
              onChange={e => setForm(f => ({ ...f, empresa_id: e.target.value }))}
            >
              {empresas.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-lavanda/60 mb-1.5">Bloque</label>
              <select
                className={campo} value={form.bloque}
                onChange={e => setForm(f => ({ ...f, bloque: e.target.value }))}
              >
                {BLOQUES.map(b => <option key={b.clave} value={b.clave}>{b.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-lavanda/60 mb-1.5">Mesa</label>
              <input
                className={campo} type="number" min="1" value={form.mesa_numero}
                onChange={e => setForm(f => ({ ...f, mesa_numero: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-lavanda/60 mb-1.5">Estatus</label>
            <select
              className={campo} value={form.estatus}
              onChange={e => setForm(f => ({ ...f, estatus: e.target.value }))}
            >
              {ESTATUS.map(s => <option key={s.clave} value={s.clave}>{s.texto}</option>)}
            </select>
          </div>

          {choca && (
            <p className="text-xs text-rojo bg-rojo/10 border border-rojo/30 rounded-lg px-3 py-2">
              La mesa {mesa} ya está ocupada en {etiquetaBloque(form.bloque)}. Para cambiarlas de
              lugar, usa «Editar la mesa» desde la lista: ahí se intercambian o se recorre el tramo.
            </p>
          )}
          {form.empresa_id !== fila.empresa_id && (
            <p className="text-xs text-ambar bg-ambar/10 border border-ambar/40 rounded-lg px-3 py-2">
              Al cambiar de empresa, el nombre pasa a «Por definir»: el que está puesto es de una
              persona de la empresa anterior.
            </p>
          )}
          {error && (
            <p className="text-xs text-rojo bg-rojo/10 border border-rojo/30 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </div>

        <div className="px-5 py-3 border-t border-lavanda/15 shrink-0">
          <button
            onClick={guardar} disabled={guardando || choca}
            className="w-full rounded-xl bg-tec hover:bg-tec-claro disabled:opacity-40
                       py-3 font-bold text-sm transition-colors"
          >
            {guardando ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Reclutadores() {
  const datos = useDatos()
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState('todos')
  const [editando, setEditando] = useState(null)
  const [editandoMesa, setEditandoMesa] = useState(null)
  const [salon, setSalon] = useState(null)
  const [trayendoSalon, setTrayendoSalon] = useState(false)

  // Las empresas y las filas con la forma que pide el editor del salón. Se
  // traen la primera vez que alguien abre una mesa, no al abrir la pantalla.
  const traerSalon = useCallback(async () => {
    setTrayendoSalon(true)
    try { setSalon(await datosDelSalon()) } catch { setSalon(null) }
    setTrayendoSalon(false)
  }, [])

  function abrirMesa(fila) {
    setEditandoMesa(fila)
    if (!salon) traerSalon()
  }

  if (datos.cargando || datos.error) return <Cargando error={datos.error} />

  const { empresas, reclutadores, recargar } = datos
  const porId = new Map(empresas.map(e => [e.id, e]))

  const conEmpresa = reclutadores.map(r => ({
    ...r,
    empresaNombre: porId.get(r.empresa_id)?.nombre ?? '—',
  }))

  const q = busca.trim().toLowerCase()
  const lista = conEmpresa
    .filter(r => {
      if (filtro === 'b1' || filtro === 'b2') return r.bloque === filtro
      if (filtro === 'por_confirmar') return r.estatus === 'por_confirmar'
      if (filtro === 'sin_nombre')    return esPorDefinir(r.nombre)
      if (filtro === 'sin_mesa')      return r.mesa_numero === null
      return true
    })
    .filter(r => !q ||
      r.nombre.toLowerCase().includes(q) ||
      r.empresaNombre.toLowerCase().includes(q) ||
      String(r.mesa_numero ?? '').includes(q))
    .sort((a, b) =>
      a.bloque.localeCompare(b.bloque) ||
      (a.mesa_numero ?? 9999) - (b.mesa_numero ?? 9999))

  const FILTROS = [
    { clave: 'todos',         texto: 'Todos',         n: conEmpresa.length },
    { clave: 'b1',            texto: 'Bloque 1',      n: conEmpresa.filter(r => r.bloque === 'b1').length },
    { clave: 'b2',            texto: 'Bloque 2',      n: conEmpresa.filter(r => r.bloque === 'b2').length },
    { clave: 'por_confirmar', texto: 'Por confirmar', n: conEmpresa.filter(r => r.estatus === 'por_confirmar').length },
    { clave: 'sin_nombre',    texto: 'Sin nombre',    n: conEmpresa.filter(r => esPorDefinir(r.nombre)).length },
    { clave: 'sin_mesa',      texto: 'Sin mesa',      n: conEmpresa.filter(r => r.mesa_numero === null).length },
  ]

  return (
    <section className="space-y-4">
      {editando && (
        <Editar
          fila={conEmpresa.find(r => r.id === editando)}
          empresas={empresas} reclutadores={reclutadores}
          onCerrar={() => setEditando(null)} onGuardado={recargar}
        />
      )}

      {/* El mismo editor que usa `/host`: mover, intercambiar, recorrer y liberar. */}
      {editandoMesa && (
        <EditarMesa
          mesa={{ numero: editandoMesa.mesa_numero }} bloque={editandoMesa.bloque}
          salon={salon} carreras={datos.carreras} cargando={trayendoSalon}
          onCerrar={() => setEditandoMesa(null)}
          onGuardado={async () => { await Promise.all([recargar(), traerSalon()]) }}
        />
      )}

      <div>
        <h2 className="text-xl font-extrabold">Reclutadores</h2>
        <p className="text-sm text-lavanda/60 mt-0.5">
          Una fila por persona por bloque, igual que el Excel. Toca una para corregirla.
        </p>
      </div>

      <input
        value={busca} onChange={e => setBusca(e.target.value)}
        placeholder="Buscar por nombre, empresa o mesa…"
        className="w-full rounded-xl bg-marino-alto/70 border border-lavanda/20 px-3.5 py-2.5 text-sm
                   placeholder-lavanda/30 outline-none focus:border-cian focus:ring-2 focus:ring-cian/30"
      />

      <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
        {FILTROS.map(f => (
          <button
            key={f.clave} onClick={() => setFiltro(f.clave)}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
              filtro === f.clave
                ? 'bg-tec border-tec text-white'
                : 'border-lavanda/25 text-lavanda/60 hover:border-lavanda/50'
            }`}
          >
            {f.texto} <span className="cifra opacity-60">{f.n}</span>
          </button>
        ))}
      </div>

      {lista.length === 0 ? (
        <p className="text-sm text-lavanda/50 py-8 text-center">
          {conEmpresa.length === 0 ? 'Sin reclutadores todavía. Importa el Excel.' : 'Sin resultados.'}
        </p>
      ) : (
        <ul className="space-y-1">
          {lista.map(r => (
            <li key={r.id} className="flex items-stretch gap-1">
              <button
                onClick={() => setEditando(r.id)}
                className="flex-1 min-w-0 text-left rounded-xl border border-lavanda/15 bg-marino-alto/40
                           hover:border-lavanda/35 px-3.5 py-2.5 transition-colors flex items-center gap-3"
              >
                <span className="cifra text-sm font-bold text-lavanda/50 w-9 shrink-0 text-right">
                  {r.mesa_numero ?? '—'}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm truncate">
                    <span className={esPorDefinir(r.nombre) ? 'text-ambar' : ''}>{r.nombre}</span>
                  </span>
                  <span className="block text-xs text-lavanda/55 truncate">
                    {r.empresaNombre} · {etiquetaBloque(r.bloque)}
                  </span>
                </span>
                <span className={`text-[11px] shrink-0 font-semibold ${colorEstatus[r.estatus]}`}>
                  {ESTATUS.find(s => s.clave === r.estatus)?.texto}
                </span>
              </button>
              {r.mesa_numero !== null && (
                <button
                  onClick={() => abrirMesa(r)}
                  title="Mover, intercambiar, recorrer o liberar la mesa"
                  className="shrink-0 rounded-xl border border-lavanda/15 text-lavanda/55
                             hover:text-white hover:border-lavanda/35 px-3 text-[11px] font-semibold
                             transition-colors"
                >
                  Mesa
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

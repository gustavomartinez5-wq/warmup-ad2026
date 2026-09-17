import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { mesasDelBloque, cambiarEstado } from '../lib/mesaPublica'
import { bloquePorReloj, comoReloj } from '../lib/reloj'
import { BLOQUES, etiquetaBloque } from '../lib/cifras'
import { ESTADOS, textoEstado, pintar, ordenarParaLista, contarPorEstado } from '../lib/estadoVivo'
import { catalogoDeCarreras } from '../lib/carreras'
import { plano, contiene } from '../lib/texto'
import RejillaMesas from '../components/RejillaMesas'
import Cargando from '../components/Cargando'
import Enlace from '../components/Enlace'

/**
 * La vista del equipo el día del evento. Para los tres hosts y los becarios,
 * en celular. Dos formas de ver lo mismo:
 *
 *   Rejilla — el salón como está acomodado, para ubicar la mesa 43 de un vistazo.
 *   Lista   — ordenada por estado, disponibles arriba, para cuando traes a un
 *             estudiante al lado y necesitas a dónde mandarlo ya.
 *
 * Aquí las mesas pasadas de 20 minutos NO parpadean: en la simulación, con medio
 * salón pasado de tiempo, la pantalla entera latía y dejaba de resaltar nada. El
 * rojo fijo y la pastilla de «pasadas de 20» dicen lo mismo sin estrobo. El
 * parpadeo se queda donde hay un solo reloj: la pantalla del reclutador y la
 * hoja de detalle de una mesa.
 */

function Pastilla({ valor, texto, tono }) {
  const color = {
    teal:  'border-teal/60 text-teal',
    tec:   'border-tec-claro/70 text-lavanda',
    ambar: 'border-ambar/60 text-ambar',
    rojo:  'border-rojo/70 text-rojo',
    gris:  'border-lavanda/20 text-lavanda/50',
  }[tono]
  return (
    <span className={`shrink-0 rounded-full border ${color} px-2.5 py-1 text-xs font-semibold`}>
      <span className="cifra">{valor}</span> {texto}
    </span>
  )
}

/* ── Hoja de detalle ──────────────────────────────────────────────────────── */

function Detalle({ mesa, bloque, ahora, onCerrar, onMarcar, marcando }) {
  const p = pintar(mesa, ahora)
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 px-0 sm:px-4"
      onClick={e => e.target === e.currentTarget && onCerrar()}
    >
      <div className="bg-marino-alto rounded-t-2xl sm:rounded-2xl border border-lavanda/20
                      w-full sm:max-w-sm max-h-[88dvh] flex flex-col">
        <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-3 border-b border-lavanda/15 shrink-0">
          <div className="flex items-start gap-2.5 min-w-0">
            <span className="w-9 h-9 rounded-lg bg-marino border border-lavanda/20 grid place-items-center
                             text-sm font-extrabold cifra shrink-0">
              {mesa.numero}
            </span>
            <div className="min-w-0">
              <p className="font-bold truncate">{mesa.empresa}</p>
              <p className="text-xs text-lavanda/55">
                {etiquetaBloque(bloque)}{mesa.giro ? ` · ${mesa.giro}` : ''}
              </p>
            </div>
          </div>
          <button onClick={onCerrar} className="text-lavanda/50 hover:text-white text-lg leading-none shrink-0">✕</button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          <div className="text-center py-2">
            <p className="text-[11px] uppercase tracking-widest text-lavanda/45">
              {textoEstado(mesa.estado)}
            </p>
            {mesa.estado === 'ocupado' && (
              <>
                <p className={`text-5xl font-extrabold cifra mt-1 ${p.alerta ? 'text-rojo' : 'text-white'}
                               ${p.parpadea ? 'late' : ''}`}>
                  {comoReloj(p.segundos)}
                </p>
                <p className="text-xs text-lavanda/45 mt-1">
                  Desde las {new Date(mesa.ocupado_desde).toLocaleTimeString('es-MX',
                    { hour: '2-digit', minute: '2-digit' })}
                </p>
              </>
            )}
          </div>

          {mesa.carreras?.length > 0 && (
            <div>
              <p className="text-xs text-lavanda/55 mb-1.5">Carreras que busca</p>
              <div className="flex flex-wrap gap-1.5">
                {mesa.carreras.map(c => (
                  <span key={c} className="text-[11px] px-2 py-1 rounded-full bg-tec/30 border border-tec
                                           text-lavanda font-semibold">{c}</span>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="text-xs text-lavanda/55 mb-2">Cambiar el estado</p>
            <div className="grid grid-cols-2 gap-2">
              {ESTADOS.map(e => (
                <button
                  key={e.clave} onClick={() => onMarcar(mesa.numero, e.clave)}
                  disabled={marcando !== null}
                  className={`py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-50 ${
                    mesa.estado === e.clave
                      ? 'bg-tec text-white ring-2 ring-cian/50'
                      : 'bg-marino border border-lavanda/20 text-lavanda/70 hover:text-white'
                  }`}
                >
                  {marcando === e.clave ? '…' : e.texto}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── La pantalla ──────────────────────────────────────────────────────────── */

export default function Host() {
  const [bloque, setBloque]   = useState(bloquePorReloj)
  const [vista, setVista]     = useState('rejilla')
  const [mesas, setMesas]     = useState(null)
  const [error, setError]     = useState(null)
  const [ahora, setAhora]     = useState(Date.now())
  const [busca, setBusca]     = useState('')
  const [carrera, setCarrera] = useState('')
  const [giro, setGiro]       = useState('')
  const [abierta, setAbierta] = useState(null)
  const [marcando, setMarcando] = useState(null)
  const [catalogo, setCatalogo] = useState([])
  const [enlace, setEnlace] = useState('conectando')
  const [intento, setIntento] = useState(0)   // súbelo para re-montar el canal
  const desmontado = useRef(false)

  const traer = useCallback(async () => {
    setMesas(null); setError(null)
    try {
      const d = await mesasDelBloque(bloque)
      if (!desmontado.current) setMesas(d)
    } catch (e) {
      if (!desmontado.current) setError(e.message ?? String(e))
    }
  }, [bloque])

  useEffect(() => {
    desmontado.current = false
    traer()
    // Cuando un reclutador toca su botón, esta pantalla cambia sola.
    const canal = supabase.channel(`host-${bloque}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mesas_estado' }, carga => {
        const fila = carga.new
        if (!fila || fila.bloque !== bloque) return
        setMesas(prev => prev?.map(m => m.numero === fila.numero
          ? { ...m, estado: fila.estado, ocupado_desde: fila.ocupado_desde }
          : m))
      })
      // Sin esto, una caída del websocket deja la pantalla vieja y muda.
      .subscribe(estado => {
        if (estado === 'SUBSCRIBED') setEnlace('vivo')
        else if (estado === 'CHANNEL_ERROR' || estado === 'TIMED_OUT' || estado === 'CLOSED') {
          setEnlace('caido')
        }
      })
    return () => { desmontado.current = true; supabase.removeChannel(canal) }
  }, [traer, bloque, intento])

  useEffect(() => {
    const id = setInterval(() => setAhora(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  // El catálogo sirve para que el buscador entienda «mecatrónica» y no solo «IMT».
  useEffect(() => { catalogoDeCarreras().then(setCatalogo).catch(() => setCatalogo([])) }, [])

  const carreras = useMemo(
    () => [...new Set((mesas ?? []).flatMap(m => m.carreras ?? []))].sort(),
    [mesas])
  const giros = useMemo(
    () => [...new Set((mesas ?? []).map(m => m.giro).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es')),
    [mesas])

  const q = plano(busca)

  /**
   * Las siglas que coinciden con lo escrito. La sigla se busca por principio
   * —«IRS» encuentra IRS, «IM» encuentra IM, IMA, IMD e IMT— y el nombre por
   * cualquier parte, para que «robotica» también llegue a IRS.
   */
  const siglasQueCoinciden = useMemo(() => {
    if (!q) return []
    return catalogo
      .filter(c => plano(c.siglas).startsWith(q) || contiene(c.nombre, q))
      .map(c => c.siglas)
  }, [q, catalogo])

  const filtradas = (mesas ?? []).filter(m => {
    const porTexto = !q
      || contiene(m.empresa, q)
      || contiene(m.giro, q)
      || String(m.numero).includes(q)
      || (m.carreras ?? []).some(c => siglasQueCoinciden.includes(c))
    return porTexto
      && (!carrera || (m.carreras ?? []).includes(carrera))
      && (!giro || m.giro === giro)
  })

  // Qué carreras se reconocieron, para que quede claro por qué salió esa lista.
  const carrerasReconocidas = useMemo(() => {
    const enUso = new Set((mesas ?? []).flatMap(m => m.carreras ?? []))
    return catalogo
      .filter(c => siglasQueCoinciden.includes(c.siglas) && enUso.has(c.siglas))
      .slice(0, 3)
  }, [siglasQueCoinciden, catalogo, mesas])

  const cuenta = contarPorEstado(mesas ?? [])
  const hayFiltro = Boolean(q || carrera || giro)

  // Cambiar `intento` vuelve a correr el efecto: cierra el canal muerto y abre uno nuevo.
  function reconectar() {
    setEnlace('conectando')
    setIntento(n => n + 1)
  }

  async function marcar(numero, estado) {
    setMarcando(estado)
    try {
      const fila = await cambiarEstado(numero, bloque, estado)
      setMesas(prev => prev?.map(m => m.numero === numero
        ? { ...m, estado: fila.estado, ocupado_desde: fila.ocupado_desde } : m))
    } catch (e) {
      setError(e.message ?? String(e))
    }
    setMarcando(null)
  }

  const mesaAbierta = filtradas.find(m => m.numero === abierta)
    ?? (mesas ?? []).find(m => m.numero === abierta)

  const campoFiltro = 'min-w-0 rounded-lg bg-marino-alto border border-lavanda/20 px-2.5 py-2 ' +
                      'text-[13px] outline-none focus:border-cian text-lavanda'

  return (
    <div className="min-h-dvh flex flex-col">
      {mesaAbierta && (
        <Detalle
          mesa={mesaAbierta} bloque={bloque} ahora={ahora} marcando={marcando}
          onCerrar={() => setAbierta(null)} onMarcar={marcar}
        />
      )}

      <header className="px-4 pt-5 pb-3 border-b border-lavanda/15 sticky top-0 z-20
                         bg-marino/85 backdrop-blur space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-cian font-semibold">CVDP · Host</p>
            <h1 className="text-lg font-extrabold leading-tight">Warm Up AD2026</h1>
          </div>
          <div className="flex items-center gap-3 pt-1 shrink-0">
            {/* Red por si el tiempo real se retrasa: el plan gratuito de Supabase
                topa en 100 mensajes por segundo y una ráfaga puede pasarse. Las
                escrituras nunca se pierden —van por REST—, así que recargar
                siempre trae la verdad. */}
            <Enlace estado={enlace} alReconectar={reconectar} />
            <button
              onClick={traer}
              className="text-xs text-lavanda/55 hover:text-white transition-colors"
            >
              Recargar
            </button>
            <Link to="/admin" className="text-xs text-lavanda/55 hover:text-white">Admin</Link>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-lavanda/20 overflow-hidden">
            {BLOQUES.map(b => (
              <button
                key={b.clave} onClick={() => setBloque(b.clave)}
                className={`px-3 py-1.5 text-xs font-bold transition-colors ${
                  bloque === b.clave ? 'bg-tec text-white' : 'text-lavanda/55 hover:text-white'
                }`}
              >
                {b.nombre}
              </button>
            ))}
          </div>
          <div className="flex rounded-lg border border-lavanda/20 overflow-hidden">
            {[['rejilla', 'Rejilla'], ['lista', 'Lista']].map(([v, t]) => (
              <button
                key={v} onClick={() => setVista(v)}
                className={`px-3 py-1.5 text-xs font-bold transition-colors ${
                  vista === v ? 'bg-tec text-white' : 'text-lavanda/55 hover:text-white'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-1.5 overflow-x-auto [scrollbar-width:none] -mx-4 px-4">
          <Pastilla valor={cuenta.disponible} texto="disponibles" tono="teal" />
          <Pastilla valor={cuenta.ocupado}    texto="ocupadas"    tono="tec" />
          {cuenta.pasadas > 0 && <Pastilla valor={cuenta.pasadas} texto="pasadas de 20" tono="rojo" />}
          <Pastilla valor={cuenta.break}      texto="en break"    tono="ambar" />
          <Pastilla valor={cuenta.no_llego}   texto="no llegaron" tono="gris" />
        </div>

        {/* En celular no caben los tres en un renglón: el buscador manda y los
            filtros van debajo, a la mitad cada uno. */}
        <div className="space-y-2">
          <input
            value={busca} onChange={e => setBusca(e.target.value)}
            inputMode="search" placeholder="Empresa, carrera, giro o mesa…"
            className="w-full rounded-lg bg-marino-alto border border-lavanda/20 px-3 py-2 text-[13px]
                       placeholder-lavanda/30 outline-none focus:border-cian"
          />
          <div className="grid grid-cols-2 gap-2">
            <select value={carrera} onChange={e => setCarrera(e.target.value)} className={campoFiltro}>
              <option value="">Toda carrera</option>
              {carreras.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={giro} onChange={e => setGiro(e.target.value)} className={campoFiltro}>
              <option value="">Todo giro</option>
              {giros.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
        </div>

        {carrerasReconocidas.length > 0 && (
          <p className="text-[11px] text-cian leading-snug">
            {carrerasReconocidas.map(c => `${c.siglas} · ${c.nombre}`).join(' / ')}
            {' — '}{filtradas.length} {filtradas.length === 1 ? 'mesa' : 'mesas'}
          </p>
        )}

        {carreras.length === 0 && mesas?.length > 0 && (
          <p className="text-[11px] text-ambar/90 leading-snug">
            Ninguna empresa tiene carreras etiquetadas todavía. Se hace en{' '}
            <Link to="/admin/empresas" className="underline">Empresas</Link>.
          </p>
        )}
      </header>

      <main className="flex-1 px-4 py-4">
        {error && <Cargando error={error} />}
        {!mesas && !error && <Cargando />}

        {mesas && filtradas.length === 0 && (
          <p className="text-sm text-lavanda/50 py-10 text-center">
            {hayFiltro ? 'Ninguna mesa coincide con eso.' : 'Sin mesas en este bloque.'}
          </p>
        )}

        {mesas && filtradas.length > 0 && vista === 'rejilla' && (
          <RejillaMesas total={filtradas.length}>
            {filtradas.map(m => {
              const p = pintar(m, ahora)
              return (
                <button
                  key={m.numero} onClick={() => setAbierta(m.numero)}
                  className={`rounded-lg border px-2 py-2 text-left min-h-[62px] flex flex-col justify-between
                              transition-transform active:scale-95 ${p.celda}`}
                >
                  <span className="flex items-baseline justify-between gap-1">
                    <span className="text-[11px] font-bold cifra opacity-75">{m.numero}</span>
                    {m.estado === 'ocupado' && (
                      <span className="text-[11px] font-bold cifra">{comoReloj(p.segundos)}</span>
                    )}
                  </span>
                  <span className="text-[11px] leading-tight line-clamp-2 break-words font-medium">
                    {m.empresa}
                  </span>
                </button>
              )
            })}
          </RejillaMesas>
        )}

        {mesas && filtradas.length > 0 && vista === 'lista' && (
          <ul className="space-y-1">
            {ordenarParaLista(filtradas, ahora).map(m => {
              const p = pintar(m, ahora)
              return (
                <li key={m.numero}>
                  <button
                    onClick={() => setAbierta(m.numero)}
                    className="w-full flex items-center gap-3 text-left rounded-xl border border-lavanda/15
                               bg-marino-alto/40 hover:border-lavanda/35 px-3 py-2.5 transition-colors"
                  >
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${p.celda.split(' ')[0]}`} />
                    <span className="cifra text-sm font-bold text-lavanda/50 w-8 shrink-0 text-right">
                      {m.numero}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold truncate">{m.empresa}</span>
                      <span className="block text-[11px] text-lavanda/50 truncate">
                        {textoEstado(m.estado)}{m.giro ? ` · ${m.giro}` : ''}
                      </span>
                    </span>
                    {m.estado === 'ocupado' && (
                      <span className={`cifra text-sm font-bold shrink-0
                                        ${p.alerta ? 'text-rojo' : 'text-lavanda/70'}`}>
                        {comoReloj(p.segundos)}
                      </span>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </main>
    </div>
  )
}

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, edicionActiva } from '../lib/supabase'
import { mesasDelBloque } from '../lib/mesaPublica'
import { bloquePorReloj, comoReloj, segundosDesde } from '../lib/reloj'
import { textoEstado } from '../lib/estadoVivo'
import { etiquetaBloque, GIRO_PORTAFOLIO } from '../lib/cifras'
import {
  SERVICIOS, textoServicio, textoEstadoTurno, poolDe, CANAL_FILA, INDICACION_MODULO,
} from '../lib/fila'
import Cargando from '../components/Cargando'
import Enlace from '../components/Enlace'

/**
 * El control de la fila. Es la pantalla del host de lista de espera: ve quién
 * está esperando, cuánto lleva, y decide a dónde lo manda.
 *
 * La fila son números. Nadie da su nombre para formarse, así que aquí no hay
 * nada que ocultar ni que cuidar: lo que se protege es poder llamar y cerrar
 * turnos, y eso pide cuenta del equipo como el resto de la app.
 */

/** Cada cambio se avisa por difusión para que los teléfonos se enteren al momento. */
function useAvisoFila() {
  const canal = useRef(null)
  useEffect(() => {
    canal.current = supabase.channel(CANAL_FILA).subscribe()
    return () => { if (canal.current) supabase.removeChannel(canal.current) }
  }, [])
  return useCallback(() => {
    canal.current?.send({ type: 'broadcast', event: 'movio', payload: {} })
  }, [])
}

/* ── Hoja de llamado ──────────────────────────────────────────────────────── */

/**
 * Llamar un turno. La persona siempre ve lo mismo en su celular —pasar al módulo
 * de lista de espera—, porque ahí le toman sus datos y de ahí el host la lleva
 * con la empresa. Lo que se elige aquí es para el equipo: apartarle una mesa si
 * ya se sabe cuál está libre, o dejar que el host la decida.
 */
function HojaLlamar({ turno, mesas, bloque, onBloque, onElegir, onCerrar }) {
  const dePortafolio = poolDe(turno.servicio) === 'portafolio'
  const PESO = { disponible: 0, break: 1, no_llego: 2, ocupado: 3 }

  // Solo las mesas del pool al que va esta persona: las de portafolio se
  // reconocen por su giro, no por su número, para que sigan siendo ciertas
  // si esas mesas se mueven.
  const opciones = useMemo(() => (mesas ?? [])
    .filter(m => (m.giro === GIRO_PORTAFOLIO) === dePortafolio)
    .sort((a, b) => (PESO[a.estado] ?? 9) - (PESO[b.estado] ?? 9) || a.numero - b.numero),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mesas, dePortafolio])

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 px-0 sm:px-4"
      onClick={e => e.target === e.currentTarget && onCerrar()}>
      <div className="w-full sm:max-w-md max-h-[88dvh] flex flex-col rounded-t-2xl sm:rounded-2xl
                      bg-marino border border-lavanda/20">

        <div className="px-5 pt-5 pb-3 border-b border-lavanda/15 shrink-0 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.18em] text-cian font-semibold">Llamar turno</p>
            <p className="text-lg font-extrabold mt-0.5">
              <span className="cifra">{turno.folio}</span>
              <span className="text-lavanda/60 font-semibold text-sm"> · {textoServicio(turno.servicio)}</span>
            </p>
            <p className="text-xs text-lavanda/55 mt-1">En su celular dice: «{INDICACION_MODULO}».</p>
          </div>
          <button onClick={onCerrar} className="text-lavanda/50 hover:text-white text-lg leading-none shrink-0">✕</button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">

          <button onClick={() => onElegir('host', null)}
            className="w-full text-left rounded-xl bg-tec hover:bg-tec-claro px-4 py-4 transition-colors">
            <span className="block text-sm font-extrabold">Llamar sin mesa</span>
            <span className="block text-xs text-white/70 mt-0.5">La mesa la decide el host</span>
          </button>

          <div>
            <div className="flex items-baseline justify-between gap-2 mb-2">
              <p className="text-[11px] uppercase tracking-wider text-lavanda/45 font-semibold">
                O llamar y apartarle una mesa
              </p>
              <button onClick={() => onBloque(bloque === 'b1' ? 'b2' : 'b1')}
                className="text-[11px] text-lavanda/50 hover:text-cian underline underline-offset-2">
                {etiquetaBloque(bloque)}
              </button>
            </div>

            {opciones.length === 0 ? (
              <p className="text-xs text-lavanda/45 italic py-3">
                No hay mesas de {dePortafolio ? 'portafolio' : 'este pool'} en {etiquetaBloque(bloque)}.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {opciones.map(m => (
                  <li key={m.numero}>
                    <button onClick={() => onElegir('mesa', m.numero)}
                      className="w-full flex items-center gap-3 text-left rounded-xl border border-lavanda/20
                                 bg-marino-alto/50 hover:border-cian/60 active:scale-[0.99] px-4 py-3 transition-all">
                      <span className="cifra text-lg font-extrabold text-lavanda/60 w-9 shrink-0 text-right">
                        {m.numero}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[15px] font-semibold truncate">{m.empresa}</span>
                        {m.giro && <span className="block text-xs text-lavanda/50 truncate">{m.giro}</span>}
                      </span>
                      <span className={`text-[11px] font-semibold shrink-0 ${
                        m.estado === 'ocupado' ? 'text-tec-claro'
                        : m.estado === 'break' ? 'text-ambar'
                        : m.estado === 'no_llego' ? 'text-lavanda/40'
                        : 'text-teal'}`}>
                        {textoEstado(m.estado)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Un renglón de la fila ────────────────────────────────────────────────── */

function Renglon({ turno, ahora, onLlamar, onEstado, onBorrar }) {
  const espera = segundosDesde(turno.creado_en, ahora)
  const activo = turno.estado === 'espera' || turno.estado === 'llamado'

  const marco =
    turno.estado === 'llamado'  ? 'border-cian/60 bg-cian/5'
    : turno.estado === 'atendido' ? 'border-teal/40 bg-teal/5'
    : turno.estado === 'no_llego' ? 'border-lavanda/15 bg-marino-alto/25 opacity-60'
    : 'border-lavanda/20 bg-marino-alto/50'

  return (
    <li className={`rounded-xl border px-4 py-3 transition-colors ${marco}`}>
      <div className="flex items-center gap-3">
        <span className="cifra text-2xl font-extrabold w-12 shrink-0 text-right">{turno.folio}</span>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold truncate">{textoServicio(turno.servicio)}</p>
          <p className="text-xs text-lavanda/50 mt-0.5">
            <span className="cifra">{comoReloj(espera)}</span> esperando
            {turno.estado === 'llamado' && (
              <span className="text-cian font-semibold">
                {' · '}
                {turno.destino === 'mesa' ? `mesa ${turno.mesa_numero}` : 'sin mesa'}
              </span>
            )}
            {!activo && <span> · {textoEstadoTurno(turno.estado)}</span>}
          </p>
        </div>

        {activo && (
          <button onClick={() => onLlamar(turno)}
            title={turno.estado === 'llamado' ? 'Volver a llamar' : 'Llamar'}
            className={`shrink-0 rounded-xl px-3.5 py-2.5 text-xs font-extrabold transition-colors ${
              turno.estado === 'llamado'
                ? 'bg-cian text-marino hover:bg-cian/80'
                : 'bg-marino-alto border border-lavanda/25 hover:border-cian/60'
            }`}>
            {turno.estado === 'llamado' ? 'Llamar otra vez' : 'Llamar'}
          </button>
        )}
      </div>

      <div className="flex items-center gap-1.5 mt-2.5">
        {activo ? (
          <>
            <button onClick={() => onEstado(turno.id, 'atendido')}
              className="flex-1 rounded-lg bg-teal hover:bg-teal-hondo py-2 text-xs font-bold transition-colors">
              Pasó
            </button>
            <button onClick={() => onEstado(turno.id, 'no_llego')}
              className="flex-1 rounded-lg bg-marino-alto border border-lavanda/25 hover:border-rojo/60
                         py-2 text-xs font-bold text-lavanda/70 transition-colors">
              No llegó
            </button>
          </>
        ) : (
          <button onClick={() => onEstado(turno.id, 'espera')}
            className="flex-1 rounded-lg bg-marino-alto border border-lavanda/25 hover:border-cian/60
                       py-2 text-xs font-bold text-lavanda/70 transition-colors">
            Regresar a la fila
          </button>
        )}
        <button onClick={() => onBorrar(turno)} title="Borrar turno"
          className="shrink-0 w-9 h-8 grid place-items-center rounded-lg text-lavanda/30
                     hover:text-rojo hover:bg-rojo/10 transition-colors">
          ✕
        </button>
      </div>
    </li>
  )
}

/* ── La pantalla ──────────────────────────────────────────────────────────── */

export default function Fila() {
  const [edicion, setEdicion] = useState(null)
  const [turnos, setTurnos]   = useState(null)
  const [mesas, setMesas]     = useState([])
  const [error, setError]     = useState(null)
  const [enlace, setEnlace]   = useState('conectando')
  const [intento, setIntento] = useState(0)

  const [bloque, setBloque]   = useState(() => bloquePorReloj())
  const [llamando, setLlamando] = useState(null)
  const [ahora, setAhora]     = useState(Date.now())
  const [verCerrados, setVerCerrados] = useState(false)

  const avisar = useAvisoFila()
  const desmontado = useRef(false)

  const traer = useCallback(async () => {
    try {
      const ed = await edicionActiva()
      if (desmontado.current) return
      setEdicion(ed)
      if (!ed) { setTurnos([]); return }
      const { data, error: err } = await supabase
        .from('turnos').select('*').eq('edicion_id', ed.id).order('folio')
      if (err) throw err
      if (desmontado.current) return
      setTurnos(data ?? [])
      setError(null)
    } catch (e) {
      if (!desmontado.current) setError(e.message ?? String(e))
    }
  }, [])

  useEffect(() => {
    desmontado.current = false
    traer()
    const canal = supabase.channel('fila-equipo')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'turnos' },
        () => { if (!desmontado.current) traer() })
      .subscribe(estado => {
        if (estado === 'SUBSCRIBED') setEnlace('vivo')
        else if (['CHANNEL_ERROR', 'TIMED_OUT', 'CLOSED'].includes(estado)) setEnlace('caido')
      })
    return () => { desmontado.current = true; supabase.removeChannel(canal) }
  }, [traer, intento])

  // Las mesas del bloque, para la hoja de llamado. Se refrescan al abrirla.
  useEffect(() => {
    let vivo = true
    mesasDelBloque(bloque)
      .then(d => { if (vivo) setMesas(d) })
      .catch(() => { /* la hoja lo dice: sin mesas que ofrecer, queda el host */ })
    return () => { vivo = false }
  }, [bloque, llamando])

  // Un solo reloj para toda la pantalla.
  useEffect(() => {
    const id = setInterval(() => setAhora(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  /* ── Acciones ─────────────────────────────────────────────────────────── */

  async function llamar(destino, mesaNumero) {
    const turno = llamando
    setLlamando(null)
    if (!turno) return
    // Si ya estaba llamado, primero lo regresamos: así su teléfono ve el cambio
    // y vuelve a sonar. Sin esto, «llamar otra vez» no hace ruido.
    if (turno.estado === 'llamado') {
      await supabase.from('turnos').update({ estado: 'espera' }).eq('id', turno.id)
    }
    const { error: err } = await supabase.from('turnos').update({
      estado:      'llamado',
      destino,
      mesa_numero: mesaNumero,
      bloque:      destino === 'mesa' ? bloque : null,
      llamado_en:  new Date().toISOString(),
    }).eq('id', turno.id)
    if (err) { setError(err.message); return }
    avisar()
  }

  async function cambiarEstado(id, estado) {
    const parche = estado === 'espera'
      ? { estado, destino: null, mesa_numero: null, bloque: null, llamado_en: null }
      : { estado }
    const { error: err } = await supabase.from('turnos').update(parche).eq('id', id)
    if (err) { setError(err.message); return }
    avisar()
  }

  async function borrar(turno) {
    if (!confirm(`¿Borrar el turno ${turno.folio}? No se puede deshacer.`)) return
    const { error: err } = await supabase.from('turnos').delete().eq('id', turno.id)
    if (err) { setError(err.message); return }
    avisar()
  }

  // Turno para quien llega sin celular: el gestor le canta el número.
  async function agregarAMano(servicio) {
    const { error: err } = await supabase.rpc('sacar_turno', { p_servicio: servicio })
    if (err) { setError(err.message); return }
    avisar()
  }

  /**
   * Reporte de operación: cuántos, qué buscaban y cuánto esperaron. No lleva
   * datos de persona porque la tabla no los tiene. Las matrículas para
   * indicadores se capturan aparte, fuera de la app.
   */
  function bajarReporte() {
    const filas = [
      ['Turno', 'Servicio', 'Estado', 'Mesa apartada', 'Sacó turno', 'Lo llamaron', 'Esperó (min)'],
      ...(turnos ?? []).map(t => [
        t.folio,
        textoServicio(t.servicio),
        textoEstadoTurno(t.estado),
        t.destino === 'mesa' ? `Mesa ${t.mesa_numero}` : t.destino === 'host' ? 'Sin mesa' : '',
        new Date(t.creado_en).toLocaleTimeString('es-MX'),
        t.llamado_en ? new Date(t.llamado_en).toLocaleTimeString('es-MX') : '',
        t.llamado_en ? Math.round(segundosDesde(t.creado_en, new Date(t.llamado_en).getTime()) / 60) : '',
      ]),
    ]
    const csv = filas.map(f => f.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `warmup-fila-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  /* ── Pintado ──────────────────────────────────────────────────────────── */

  if (turnos === null) return <Cargando error={error} texto="Cargando la fila…" />

  if (!edicion) {
    return (
      <div className="min-h-dvh grid place-items-center px-5">
        <p className="text-sm text-lavanda/60">No hay una edición activa.</p>
      </div>
    )
  }

  const esperando = turnos.filter(t => t.estado === 'espera' || t.estado === 'llamado')
  const cerrados  = turnos.filter(t => t.estado === 'atendido' || t.estado === 'no_llego')
  const atendidos = turnos.filter(t => t.estado === 'atendido').length
  const noLlegaron = turnos.filter(t => t.estado === 'no_llego').length
  const visibles  = verCerrados ? cerrados : esperando

  return (
    <div className="min-h-dvh max-w-2xl mx-auto flex flex-col">

      {llamando && (
        <HojaLlamar turno={llamando} mesas={mesas} bloque={bloque} onBloque={setBloque}
          onElegir={llamar} onCerrar={() => setLlamando(null)} />
      )}

      <div className="px-5 pt-6 pb-4 border-b border-lavanda/15">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] uppercase tracking-[0.18em] text-cian font-semibold">
            CVDP · Lista de espera
          </p>
          <Enlace estado={enlace}
            alReconectar={() => { setEnlace('conectando'); setIntento(n => n + 1) }} />
        </div>
        <h1 className="text-xl font-extrabold leading-tight mt-0.5">{edicion.nombre}</h1>

        <div className="flex items-center gap-4 mt-3 text-sm">
          <span><b className="cifra text-cian">{esperando.length}</b>
            <span className="text-lavanda/50"> en fila</span></span>
          <span><b className="cifra text-teal">{atendidos}</b>
            <span className="text-lavanda/50"> pasaron</span></span>
          <span><b className="cifra text-lavanda/60">{noLlegaron}</b>
            <span className="text-lavanda/50"> no llegaron</span></span>
        </div>

        <div className="flex items-center gap-3 mt-3">
          <Link to="/host"
            className="text-xs text-lavanda/50 hover:text-cian underline underline-offset-2">
            Ver el salón completo
          </Link>
          <button onClick={bajarReporte}
            className="text-xs text-lavanda/50 hover:text-cian underline underline-offset-2">
            Bajar reporte
          </button>
        </div>
      </div>

      <div className="flex border-b border-lavanda/15 px-5">
        {[
          { k: false, t: `En fila · ${esperando.length}` },
          { k: true,  t: `Cerrados · ${cerrados.length}` },
        ].map(o => (
          <button key={String(o.k)} onClick={() => setVerCerrados(o.k)}
            className={`py-2.5 mr-6 text-xs font-semibold border-b-2 transition-colors ${
              verCerrados === o.k ? 'border-cian text-cian' : 'border-transparent text-lavanda/45 hover:text-lavanda'
            }`}>
            {o.t}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        {visibles.length === 0 ? (
          <p className="text-sm text-lavanda/45 text-center py-12">
            {verCerrados ? 'Todavía no se cierra ningún turno.' : 'Nadie esperando ahora mismo.'}
          </p>
        ) : (
          <ul className="space-y-2">
            {visibles.map(t => (
              <Renglon key={t.id} turno={t} ahora={ahora}
                onLlamar={setLlamando} onEstado={cambiarEstado} onBorrar={borrar} />
            ))}
          </ul>
        )}

        {error && (
          <p className="text-xs text-rojo bg-rojo/10 border border-rojo/30 rounded-lg px-3 py-2 mt-4">
            {error}
          </p>
        )}
      </div>

      <div className="px-5 py-3 border-t border-lavanda/15">
        <p className="text-[11px] text-lavanda/40 mb-2">Turno a mano, para quien llega sin celular</p>
        <div className="flex gap-1.5">
          {SERVICIOS.map(s => (
            <button key={s.clave} onClick={() => agregarAMano(s.clave)}
              className="flex-1 rounded-lg bg-marino-alto border border-lavanda/20 hover:border-cian/60
                         py-2.5 text-xs font-bold text-lavanda/75 transition-colors">
              + {s.texto.replace('Revisión de ', '').replace('Simulacro de ', '')}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
